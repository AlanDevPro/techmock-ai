// controllers/rubrica.controller.js
import { RubricaModel } from "../models/rubrica.model.js";

// GET /api/v1/admin/rubricas
export const getRubricas = async (req, res, next) => {
  try {
    const rubricas = await RubricaModel.getAll();
    res.json({ success: true, data: rubricas });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/admin/rubricas
export const crearRubrica = async (req, res, next) => {
  try {
    const { nombre, descripcion, peso_porcentual } = req.body;
    const rubrica = await RubricaModel.create({
      nombre,
      descripcion,
      pesoPorcentual: peso_porcentual,
    });
    res.status(201).json({ success: true, data: rubrica });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/admin/rubricas/:id
export const actualizarRubrica = async (req, res, next) => {
  try {
    const { nombre, descripcion, peso_porcentual, activa } = req.body;
    const rubrica = await RubricaModel.update(req.params.id, {
      nombre,
      descripcion,
      pesoPorcentual: peso_porcentual,
      activa,
    });
    if (!rubrica) {
      return res.status(404).json({ success: false, error: "Rúbrica no encontrada" });
    }
    res.json({ success: true, data: rubrica });
  } catch (error) {
    next(error);
  }
};