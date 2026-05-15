// models/ejecucionIde.model.js
import { db } from "../config/database.js";

export const EjecucionIdeModel = {
  async findById(id) {
    const result = await db.query(
      "SELECT * FROM ejecuciones_ide WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },

  async create({ sesionId, envioCodigoId, kubernetesJobName, kubernetesNamespace, payloadEnviado }) {
    const result = await db.query(`
      INSERT INTO ejecuciones_ide
        (sesion_id, envio_codigo_id, kubernetes_job_name, kubernetes_namespace, estado, payload_enviado)
      VALUES ($1, $2, $3, $4, 'pending', $5)
      RETURNING *
    `, [sesionId, envioCodigoId ?? null, kubernetesJobName, kubernetesNamespace ?? 'default', JSON.stringify(payloadEnviado)]);
    return result.rows[0];
  },

  async updateEstado(id, { estado, stdout, stderr, exitCode, tiempoEjecucionMs, memoriaUsadaMb }) {
    const result = await db.query(`
      UPDATE ejecuciones_ide SET
        estado              = $2,
        stdout              = COALESCE($3, stdout),
        stderr              = COALESCE($4, stderr),
        exit_code           = COALESCE($5, exit_code),
        tiempo_ejecucion_ms = COALESCE($6, tiempo_ejecucion_ms),
        memoria_usada_mb    = COALESCE($7, memoria_usada_mb),
        fecha_completado    = CASE WHEN $2 IN ('completed','failed','timeout') THEN NOW() ELSE fecha_completado END
      WHERE id = $1
      RETURNING *
    `, [id, estado, stdout, stderr, exitCode, tiempoEjecucionMs, memoriaUsadaMb]);
    return result.rows[0] || null;
  },
};