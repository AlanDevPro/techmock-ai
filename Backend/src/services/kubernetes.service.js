// services/kubernetes.service.js
import * as k8s from "@kubernetes/client-node";
import { EjecucionIdeModel } from "../models/ejecucionIde.model.js";
import crypto from "crypto";

// Inicializar cliente K8s
const kc = new k8s.KubeConfig();

if (process.env.NODE_ENV === "production") {
  kc.loadFromCluster();          // Dentro del clúster K8s
} else {
  kc.loadFromDefault();          // Desde ~/.kube/config en desarrollo
}

const batchV1 = kc.makeApiClient(k8s.BatchV1Api);
const coreV1  = kc.makeApiClient(k8s.CoreV1Api);

const NAMESPACE       = process.env.K8S_NAMESPACE       || "default";
const RUNNER_IMAGE    = process.env.K8S_RUNNER_IMAGE     || "techmock-runner:latest";
const JOB_TIMEOUT_S   = parseInt(process.env.K8S_JOB_TIMEOUT_S) || 30;
const POLL_INTERVAL_MS = parseInt(process.env.K8S_POLL_INTERVAL_MS) || 2000;
const MAX_POLLS        = parseInt(process.env.K8S_MAX_POLLS)        || 30;

/**
 * Mapeo de lenguaje → imagen Docker del runner
 */
const RUNNER_IMAGES = {
  javascript: process.env.K8S_RUNNER_JS   || "techmock-runner-js:latest",
  typescript: process.env.K8S_RUNNER_TS   || "techmock-runner-ts:latest",
  python:     process.env.K8S_RUNNER_PY   || "techmock-runner-py:latest",
  java:       process.env.K8S_RUNNER_JAVA || "techmock-runner-java:latest",
  cpp:        process.env.K8S_RUNNER_CPP  || "techmock-runner-cpp:latest",
};

/**
 * Lanza un Job K8s para ejecutar código, guarda el registro en DB
 * y hace polling hasta obtener el resultado.
 */
export async function lanzarEjecucion({ sesionId, envioCodigoId, codigo, lenguaje }) {
  const jobName = `runner-${crypto.randomBytes(6).toString("hex")}`;
  const image   = RUNNER_IMAGES[lenguaje] || RUNNER_IMAGE;

  console.log(`🚀 [K8S] Lanzando job: ${jobName} | lenguaje: ${lenguaje}`);

  // Construir manifiesto del Job
  const jobManifest = {
    apiVersion: "batch/v1",
    kind:       "Job",
    metadata: {
      name:      jobName,
      namespace: NAMESPACE,
      labels:    { app: "techmock-runner", sesion: sesionId },
    },
    spec: {
      ttlSecondsAfterFinished: 60,  // Auto-limpieza tras 60s
      backoffLimit: 0,              // Sin reintentos
      template: {
        spec: {
          restartPolicy: "Never",
          containers: [{
            name:  "runner",
            image,
            env: [
              { name: "CODE",     value: codigo },
              { name: "LANGUAGE", value: lenguaje },
            ],
            resources: {
              limits:   { cpu: "500m", memory: "256Mi" },
              requests: { cpu: "100m", memory: "128Mi" },
            },
            securityContext: {
              runAsNonRoot:             true,
              readOnlyRootFilesystem:   true,
              allowPrivilegeEscalation: false,
            },
          }],
        },
      },
    },
  };

  // Guardar registro de ejecución en DB con estado "pending"
  const ejecucion = await EjecucionIdeModel.create({
    sesionId,
    envioCodigoId:        envioCodigoId ?? null,
    kubernetesJobName:    jobName,
    kubernetesNamespace:  NAMESPACE,
    payloadEnviado:       { codigo, lenguaje },
  });

  try {
    // Crear el Job en K8s
    await batchV1.createNamespacedJob(NAMESPACE, jobManifest);
    await EjecucionIdeModel.updateEstado(ejecucion.id, { estado: "running" });

    // Polling hasta completar o timeout
    const resultado = await _pollJobResult(jobName, ejecucion.id);
    return resultado;
  } catch (error) {
    console.error(`❌ [K8S] Error en job ${jobName}:`, error.message);
    await EjecucionIdeModel.updateEstado(ejecucion.id, {
      estado: "failed",
      stderr: error.message,
    });
    throw error;
  }
}

/**
 * Polling del estado del Job hasta que termine o se agote el tiempo.
 */
async function _pollJobResult(jobName, ejecucionId) {
  for (let i = 0; i < MAX_POLLS; i++) {
    await _sleep(POLL_INTERVAL_MS);

    try {
      const { body: job } = await batchV1.readNamespacedJob(jobName, NAMESPACE);
      const { succeeded, failed } = job.status || {};

      if (succeeded) {
        // Obtener logs del pod
        const logs  = await _getJobLogs(jobName);
        const inicio = new Date(job.status.startTime);
        const fin    = new Date(job.status.completionTime);
        const duracionMs = fin - inicio;

        const ejecucion = await EjecucionIdeModel.updateEstado(ejecucionId, {
          estado:           "completed",
          stdout:           logs.stdout,
          stderr:           logs.stderr,
          exitCode:         0,
          tiempoEjecucionMs: duracionMs,
        });

        console.log(`✅ [K8S] Job ${jobName} completado en ${duracionMs}ms`);
        return ejecucion;
      }

      if (failed) {
        const logs = await _getJobLogs(jobName);
        const ejecucion = await EjecucionIdeModel.updateEstado(ejecucionId, {
          estado:   "failed",
          stdout:   logs.stdout,
          stderr:   logs.stderr || "El job falló",
          exitCode: 1,
        });

        console.warn(`⚠️ [K8S] Job ${jobName} falló`);
        return ejecucion;
      }

      // Verificar timeout manual
      const startTime = job.status?.startTime ? new Date(job.status.startTime) : null;
      if (startTime && (Date.now() - startTime.getTime()) > JOB_TIMEOUT_S * 1000) {
        await _deleteJob(jobName);
        const ejecucion = await EjecucionIdeModel.updateEstado(ejecucionId, {
          estado:   "timeout",
          stderr:   `Tiempo límite de ${JOB_TIMEOUT_S}s excedido`,
          exitCode: 124,
        });
        console.warn(`⏰ [K8S] Job ${jobName} alcanzó timeout`);
        return ejecucion;
      }

    } catch (pollError) {
      console.error(`⚠️ [K8S] Error en poll ${i + 1}/${MAX_POLLS}:`, pollError.message);
    }
  }

  // Agotados los polls → timeout
  await _deleteJob(jobName).catch(() => {});
  return EjecucionIdeModel.updateEstado(ejecucionId, {
    estado:   "timeout",
    stderr:   "Se agotaron los intentos de polling",
    exitCode: 124,
  });
}

/**
 * Obtiene stdout/stderr de los pods del Job.
 */
async function _getJobLogs(jobName) {
  try {
    const { body: podList } = await coreV1.listNamespacedPod(
      NAMESPACE, undefined, undefined, undefined, undefined,
      `job-name=${jobName}`
    );

    if (!podList.items?.length) return { stdout: "", stderr: "" };

    const podName = podList.items[0].metadata.name;
    const { body: logs } = await coreV1.readNamespacedPodLog(podName, NAMESPACE);
    return { stdout: logs || "", stderr: "" };
  } catch {
    return { stdout: "", stderr: "" };
  }
}

/**
 * Elimina un Job de K8s (para cleanup en timeout).
 */
async function _deleteJob(jobName) {
  try {
    await batchV1.deleteNamespacedJob(jobName, NAMESPACE, undefined, undefined, undefined, undefined, "Foreground");
    console.log(`🗑️ [K8S] Job ${jobName} eliminado`);
  } catch (error) {
    console.warn(`⚠️ [K8S] No se pudo eliminar job ${jobName}:`, error.message);
  }
}

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}