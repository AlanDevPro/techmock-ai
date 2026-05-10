// controllers/contactoReclutamiento.controller.js
import { ContactoReclutamientoModel } from "../models/contactoReclutamiento.model.js";
import { UsuarioModel } from "../models/usuario.model.js";
import { NotificacionModel } from "../models/notificacion.model.js";

// POST /api/v1/admin/reclutamiento
export const contactarDeveloper = async (req, res, next) => {
  try {
    const { developer_id, sesion_entrevista_id, asunto, mensaje } = req.body;

    const developer = await UsuarioModel.findById(developer_id);
    if (!developer || developer.rol !== "developer") {
      return res.status(404).json({ success: false, error: "Developer no encontrado" });
    }

    const contacto = await ContactoReclutamientoModel.create({
      adminId: req.usuario.id,
      developerId: developer_id,
      sesionEntrevistaId: sesion_entrevista_id ?? null,
      asunto,
      mensaje,
    });

    // Notificar al developer
    await NotificacionModel.create({
      usuarioId: developer_id,
      tipo: "reclutamiento",
      titulo: "Tienes un nuevo mensaje de reclutamiento",
      mensaje: asunto,
      urlAccion: `/reclutamiento/${contacto.id}`,
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