// routes/authProvider.routes.js
import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  getMisProviders,
  linkProvider,
  unlinkProvider,
  changePassword,
} from "../controllers/authProvider.controller.js";
import {
  linkProviderSchema,
  changePasswordSchema,
} from "../validators/authProvider.validator.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// GET  /api/v1/auth/providers         → ver mis métodos de login
router.get("/", getMisProviders);

// POST /api/v1/auth/providers/link     → vincular Google/GitHub a cuenta existente
router.post("/link", validate(linkProviderSchema), linkProvider);

// DELETE /api/v1/auth/providers/:provider  → desvincular un provider
router.delete("/:provider", unlinkProvider);

// PATCH /api/v1/auth/providers/password    → cambiar contraseña
router.patch("/password", validate(changePasswordSchema), changePassword);

export default router;