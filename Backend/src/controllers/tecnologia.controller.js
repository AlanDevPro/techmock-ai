import { TecnologiaModel } from "../models/tecnologia.model.js";

export const getTecnologias = async (req, res, next) => {
  try {
    const tecnologias = await TecnologiaModel.getActivas();

    res.json({
      success: true,
      data: tecnologias,
    });
  } catch (error) {
    next(error);
  }
};