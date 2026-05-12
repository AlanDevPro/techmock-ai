// routes/admin.routes.js
import { Router } from "express";
import {
  getUsuarios,
  getUsuarioPerfil,
  getSesionesGlobal,
  getDashboard,
  contactarDeveloper,
  getContactos,
} from "../controllers/admin.controller.js";
import {
  getPreguntas,
  crearPregunta,
  actualizarPregunta,
  eliminarPregunta,
} from "../controllers/pregunta.controller.js";
import {
  getRubricas,
  crearRubrica,
  actualizarRubrica,
} from "../controllers/rubrica.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { onlyAdmin } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { preguntaSchema, updatePreguntaSchema } from "../validators/pregunta.validator.js";
import { contactoSchema } from "../validators/contacto.validator.js";

import {
  getEvaluacionesAnalytics
} from "../controllers/admin.controller.js";

const router = Router();

// Todas las rutas admin requieren token válido + rol admin
router.use(verifyToken, onlyAdmin);

// ── Usuarios ─────────────────────────────────────────────────────────────────
router.get("/usuarios",     getUsuarios);
router.get("/usuarios/:id", getUsuarioPerfil);

// ── Sesiones ─────────────────────────────────────────────────────────────────
router.get("/sesiones", getSesionesGlobal);

// ── Estadísticas dashboard ────────────────────────────────────────────────────
router.get("/estadisticas", getDashboard);

// ── Reclutamiento ─────────────────────────────────────────────────────────────
router.post("/reclutamiento", validate(contactoSchema), contactarDeveloper);
router.get("/reclutamiento",  getContactos);

// ── Preguntas ─────────────────────────────────────────────────────────────────
router.get("/preguntas",      getPreguntas);
router.post("/preguntas",     validate(preguntaSchema), crearPregunta);
router.patch("/preguntas/:id", validate(updatePreguntaSchema), actualizarPregunta);
router.delete("/preguntas/:id", eliminarPregunta);

// ── Rúbricas ──────────────────────────────────────────────────────────────────
router.get("/rubricas",       getRubricas);
router.post("/rubricas",      crearRubrica);
router.patch("/rubricas/:id", actualizarRubrica);

// ── Evaluaciones ──────────────────────────────────────────────────────────────────
router.get("/evaluaciones", getEvaluacionesAnalytics);

export default router;