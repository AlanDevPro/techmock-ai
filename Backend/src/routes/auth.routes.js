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
  revokeSession,
  forgotPasswordCtrl,
  resetPasswordCtrl,
  setPasswordCtrl,
} from "../controllers/auth.controller.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
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

// ──────────────────────────────────────────────────────────
// Rutas públicas (sin autenticación)
// ──────────────────────────────────────────────────────────

router.post("/firebase", authLimiter, firebaseAuth);
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/forgot-password", authLimiter, forgotPasswordCtrl);
router.post("/reset-password", authLimiter, resetPasswordCtrl);
router.post("/refresh", authLimiter, validate(refreshTokenSchema), refreshTokenCtrl);
router.post("/logout", validate(logoutSchema), logout);

// ──────────────────────────────────────────────────────────
// Rutas protegidas (requieren autenticación)
// ──────────────────────────────────────────────────────────

router.post("/logout-all", authenticate, logoutAll);
router.get("/me", authenticate, getCurrentUser);
router.post("/change-password", authenticate, validate(changePasswordSchema), changePassword);
router.get("/sessions", authenticate, getActiveSessions);
router.delete("/sessions/:sessionId", authenticate, validate(revokeSessionSchema), revokeSession);
router.post("/set-password", authenticate, setPasswordCtrl); // ✅ NUEVO

export default router;