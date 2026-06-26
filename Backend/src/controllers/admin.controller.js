// 📁 controllers/admin.controller.js
import { UsuarioModel } from "../models/usuario.model.js";
import { SesionEntrevistaModel } from "../models/sesionEntrevista.model.js";
import { EstadisticasUsuarioModel } from "../models/estadisticasUsuario.model.js";
import { ContactoReclutamientoModel } from "../models/contactoReclutamiento.model.js";
import { NotificacionModel } from "../models/notificacion.model.js";
import { EvaluacionModel } from "../models/evaluacion.model.js";
import { DetalleEvaluacionModel } from "../models/detalleEvaluacion.model.js";

// GET /api/v1/admin/usuarios
export const getUsuarios = async (req, res, next) => {
  try {
    const usuarios = await UsuarioModel.getAllDevelopers();
    res.json({ success: true, data: usuarios });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/usuarios/:id
export const getUsuarioPerfil = async (req, res, next) => {
  try {
    const usuario = await UsuarioModel.getFullProfile(req.params.id);
    if (!usuario) {
      return res.status(404).json({ success: false, error: "Developer no encontrado" });
    }
    res.json({ success: true, data: usuario });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/sesiones
export const getSesionesGlobal = async (req, res, next) => {
  try {
    const limit  = parseInt(req.query.limit)  || 50;
    const offset = parseInt(req.query.offset) || 0;
    const sesiones = await SesionEntrevistaModel.getHistorialGlobal({ limit, offset });
    res.json({ success: true, data: sesiones });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/estadisticas
export const getDashboard = async (req, res, next) => {
  try {
    const stats = await EstadisticasUsuarioModel.getDashboardAdmin();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/admin/reclutamiento
export const contactarDeveloper = async (req, res, next) => {
  try {
    const { developer_id, sesion_entrevista_id, asunto, mensaje } = req.body;

    const developer = await UsuarioModel.findById(developer_id);
    if (!developer || developer.rol !== "developer") {
      return res.status(404).json({ success: false, error: "Developer no encontrado" });
    }

    const contacto = await ContactoReclutamientoModel.create({
      adminId:            req.usuario.id,
      developerId:        developer_id,
      sesionEntrevistaId: sesion_entrevista_id ?? null,
      asunto,
      mensaje,
    });

    // ✅ Notificar al developer automáticamente
    await NotificacionModel.create({
      usuarioId: developer_id,
      tipo: "info",
      titulo: "Nuevo contacto de reclutamiento",
      mensaje: `Has recibido un mensaje de reclutamiento: ${asunto}`,
      urlAccion: "/dashboard/developer/recruitment"
    });

    res.status(201).json({ success: true, data: contacto });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/reclutamiento
export const getContactos = async (req, res, next) => {
  try {
    const contactos = await ContactoReclutamientoModel.getAll();
    res.json({ success: true, data: contactos });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/admin/evaluaciones
export const getEvaluacionesAnalytics = async (req, res, next) => {
  try {
    const evaluaciones = await EvaluacionModel.getAllAnalytics();

    const data = await Promise.all(
      evaluaciones.map(async (ev) => {
        // getByEvaluacion devuelve [] si la evaluación no tiene rúbricas
        // registradas en detalle_evaluacion — nunca lanza, así que esto es seguro.
        const detalles = await DetalleEvaluacionModel.getByEvaluacion(ev.id);
        return {
          ...ev,
          usuario_nombre:   `${ev.nombre} ${ev.apellido ?? ""}`.trim(),
          usuario_initials: `${ev.nombre?.[0] ?? ""}${ev.apellido?.[0] ?? ""}`.toUpperCase(),
          detalles,
        };
      })
    );

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};