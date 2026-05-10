// routes/usuarios.routes.js
import { Router } from "express";
import { getMiPerfil, updateMiPerfil } from "../controllers/usuario.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updatePerfilSchema } from "../validators/auth.validator.js";

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.use(verifyToken);

// GET  /api/v1/usuarios/perfil
router.get("/perfil", getMiPerfil);

// PATCH /api/v1/usuarios/perfil
router.patch("/perfil", validate(updatePerfilSchema), updateMiPerfil);

export default router;