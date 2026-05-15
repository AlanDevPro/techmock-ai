// controllers/nivelDificultad.controller.js
import { NivelDificultadModel } from "../models/nivelDificultad.model.js";

// GET /api/v1/niveles
export const getNiveles = async (req, res, next) => {
  try {
    const niveles = await NivelDificultadModel.getAll();
    res.json({ success: true, data: niveles });
  } catch (error) {
    next(error);
  }
};