// routes/rubricas.routes.js
import { Router } from "express";
import {
  getRubricas,
  crearRubrica,
  actualizarRubrica,
} from "../controllers/rubrica.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { onlyAdmin } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { rubricaSchema, updateRubricaSchema } from "../validators/rubrica.validator.js";

const router = Router();

router.use(verifyToken, onlyAdmin);

// GET   /api/v1/admin/rubricas
router.get("/", getRubricas);

// POST  /api/v1/admin/rubricas
router.post("/", validate(rubricaSchema), crearRubrica);

// PATCH /api/v1/admin/rubricas/:id
router.patch("/:id", validate(updateRubricaSchema), actualizarRubrica);

export default router;