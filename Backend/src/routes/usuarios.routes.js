// 📁 routes/usuarios.routes.js
import { Router } from "express";
import { 
  getMiPerfil, 
  updateMiPerfil,
  getUsuarioById,
  getAllUsuarios,
  getEstadisticasUsuario,
  updateUsuarioByAdmin,
  deleteUsuario
} from "../controllers/usuario.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updatePerfilSchema } from "../validators/auth.validator.js";

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.use(verifyToken);

// ─── Rutas de perfil propio ───
// GET  /api/v1/usuarios/perfil
router.get("/perfil", getMiPerfil);

// PATCH /api/v1/usuarios/perfil
router.patch("/perfil", validate(updatePerfilSchema), updateMiPerfil);

// ─── Rutas de administración (requieren rol admin) ───
// GET /api/v1/usuarios - Listar todos los developers (admin)
router.get("/", getAllUsuarios);

// GET /api/v1/usuarios/:id - Obtener usuario por ID
router.get("/:id", getUsuarioById);

// GET /api/v1/usuarios/:id/estadisticas - Obtener estadísticas del usuario
router.get("/:id/estadisticas", getEstadisticasUsuario);

// PATCH /api/v1/usuarios/:id - Actualizar usuario (admin)
router.patch("/:id", updateUsuarioByAdmin);

// DELETE /api/v1/usuarios/:id - Eliminar usuario (admin)
router.delete("/:id", deleteUsuario);

export default router;