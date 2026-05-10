// controllers/empresa.controller.js
import { EmpresaModel } from "../models/empresa.model.js";

// GET /api/v1/empresa
export const getEmpresa = async (req, res, next) => {
  try {
    const empresa = await EmpresaModel.getEmpresa();
    if (!empresa) {
      return res.status(404).json({ success: false, error: "Empresa no encontrada" });
    }
    res.json({ success: true, data: empresa });
  } catch (error) {
    next(error);
  }
};