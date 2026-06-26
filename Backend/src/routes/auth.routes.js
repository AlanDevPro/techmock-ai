// 📁 src/routes/auth.routes.js
import { Router } from "express";
import { 
  firebaseAuth, register, login, refreshTokenCtrl, logout,
  logoutAll, getCurrentUser, changePassword, getActiveSessions,
  revokeSession, forgotPasswordCtrl, resetPasswordCtrl, setPasswordCtrl,
} from "../controllers/auth.controller.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { 
  refreshTokenSchema, logoutSchema, registerSchema, 
  loginSchema, changePasswordSchema, revokeSessionSchema
} from "../validators/auth.validator.js";
import { verifyToken as authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// ── Rutas públicas (Usan authLimiter por IP porque no hay sesión aún) ────────
router.post("/firebase", authLimiter, firebaseAuth);
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/forgot-password", authLimiter, forgotPasswordCtrl);
router.post("/reset-password", authLimiter, resetPasswordCtrl);
router.post("/refresh", authLimiter, validate(refreshTokenSchema), refreshTokenCtrl);
router.post("/logout", validate(logoutSchema), logout);

// ── Rutas protegidas ────────────────────────────────────────────────────────
// Nota: Ya no requieren 'authenticate' individual aquí, pues se procesan en el bloque privado de index.routes.js
router.post("/logout-all", logoutAll);
router.get("/me", authenticate, getCurrentUser);
router.post("/change-password", validate(changePasswordSchema), changePassword);
router.get("/sessions", getActiveSessions);
router.delete("/sessions/:sessionId", validate(revokeSessionSchema), revokeSession);
router.post("/set-password", setPasswordCtrl);

export default router;