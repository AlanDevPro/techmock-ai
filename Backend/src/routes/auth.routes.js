// routes/auth.routes.js
import { Router } from "express";
import { 
  firebaseAuth, 
  register, 
  login, 
  refreshTokenCtrl, 
  logout,
  logoutAll,
  getCurrentUser,
  changePassword,
  getActiveSessions,
  revokeSession
} from "../controllers/auth.controller.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
//import { authenticate } from "../middlewares/auth.middleware.js";
import { verifyToken as authenticate } from "../middlewares/auth.middleware.js";
import { 
  refreshTokenSchema, 
  logoutSchema, 
  registerSchema, 
  loginSchema,
  changePasswordSchema,
  revokeSessionSchema
} from "../validators/auth.validator.js";

const router = Router();

// Rutas públicas (sin autenticación)
// POST /api/v1/auth/firebase - Autenticación con Firebase (Google/GitHub)
router.post("/firebase", authLimiter, firebaseAuth);

// POST /api/v1/auth/register - Registro con email y contraseña
router.post("/register", authLimiter, validate(registerSchema), register);

// POST /api/v1/auth/login - Login con email y contraseña
router.post("/login", authLimiter, validate(loginSchema), login);

// POST /api/v1/auth/refresh - Refrescar access token
router.post("/refresh", authLimiter, validate(refreshTokenSchema), refreshTokenCtrl);

// POST /api/v1/auth/logout - Cerrar sesión (requiere refresh token)
router.post("/logout", validate(logoutSchema), logout);

// Rutas protegidas (requieren autenticación)
// POST /api/v1/auth/logout-all - Cerrar sesión en todos los dispositivos
router.post("/logout-all", authenticate, logoutAll);

// GET /api/v1/auth/me - Obtener perfil del usuario actual
router.get("/me", authenticate, getCurrentUser);

// POST /api/v1/auth/change-password - Cambiar contraseña
router.post("/change-password", authenticate, validate(changePasswordSchema), changePassword);

// GET /api/v1/auth/sessions - Obtener sesiones activas
router.get("/sessions", authenticate, getActiveSessions);

// DELETE /api/v1/auth/sessions/:sessionId - Revocar una sesión específica
router.delete("/sessions/:sessionId", authenticate, validate(revokeSessionSchema), revokeSession);

export default router;