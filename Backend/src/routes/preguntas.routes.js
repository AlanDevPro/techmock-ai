// routes/preguntas.routes.js
import { Router } from "express";
import {
  getPreguntas,
  crearPregunta,
  actualizarPregunta,
  eliminarPregunta,
} from "../controllers/pregunta.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { onlyAdmin } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { preguntaSchema, updatePreguntaSchema } from "../validators/pregunta.validator.js";

const router = Router();

router.use(verifyToken, onlyAdmin);

// GET    /api/v1/admin/preguntas
router.get("/", getPreguntas);

// POST   /api/v1/admin/preguntas
router.post("/", validate(preguntaSchema), crearPregunta);

// PATCH  /api/v1/admin/preguntas/:id
router.patch("/:id", validate(updatePreguntaSchema), actualizarPregunta);

// DELETE /api/v1/admin/preguntas/:id
router.delete("/:id", eliminarPregunta);

export default router;