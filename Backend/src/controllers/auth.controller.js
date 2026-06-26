import {
  syncFirebaseUser,
  registrarConPassword,
  loginConPassword,
  refreshAccessToken,
  logout as logoutService,
  logoutAllDevices,
  forgotPassword,
  resetPassword,
  setPasswordForOAuthUser,
} from "../services/auth.service.js";
import { RefreshTokenModel } from "../models/refreshToken.model.js";
import { AuthProviderModel } from "../models/authProvider.model.js";
import { db } from "../config/database.js";
import bcrypt from "bcryptjs";

// ── Helpers de validación ─────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarEmail(email) {
  if (!email || typeof email !== "string" || !email.trim()) {
    return "El email es requerido";
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return "El formato del email no es válido";
  }
  return null;
}

function validarPassword(password, campo = "La contraseña") {
  if (!password || typeof password !== "string" || !password.trim()) {
    return `${campo} es requerida`;
  }
  if (password.length < 6) {
    return `${campo} debe tener al menos 6 caracteres`;
  }
  return null;
}

// ── Helper: obtener providers del usuario ────────────────────────────
async function getProviders(userId) {
  const result = await db.query(
    "SELECT provider FROM auth_providers WHERE user_id = $1",
    [userId]
  );
  return result.rows.map((r) => r.provider);
}

// ── POST /api/v1/auth/firebase ────────────────────────────────────────
export const firebaseAuth = async (req, res, next) => {
  const firebaseToken = req.headers.authorization?.replace("Bearer ", "");
  if (!firebaseToken) {
    return res.status(401).json({ success: false, error: "Token de Firebase requerido" });
  }

  try {
    const dispositivo = req.headers["user-agent"];
    const ip = req.ip || req.connection.remoteAddress;

    const { usuario, accessToken, refreshToken } = await syncFirebaseUser(firebaseToken, { dispositivo, ip });
    const providers = await getProviders(usuario.id);

    res.json({
      success: true,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        avatar: usuario.avatar_url,
        rol: usuario.rol,
        providers,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/auth/register ────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { email, nombre, apellido, password } = req.body;

    const errores = [];
    const emailError = validarEmail(email);
    if (emailError) errores.push(emailError);
    const passwordError = validarPassword(password);
    if (passwordError) errores.push(passwordError);
    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      errores.push("El nombre es requerido");
    }
    if (!apellido || typeof apellido !== "string" || !apellido.trim()) {
      errores.push("El apellido es requerido");
    }
    if (errores.length > 0) {
      return res.status(400).json({ success: false, error: errores[0], errores });
    }

    const dispositivo = req.headers["user-agent"];
    const ip = req.ip || req.connection.remoteAddress;

    const { usuario, accessToken, refreshToken } = await registrarConPassword(
      {
        email: email.trim().toLowerCase(),
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        password,
      },
      { dispositivo, ip }
    );

    const providers = await getProviders(usuario.id);

    res.status(201).json({
      success: true,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        avatar: usuario.avatar_url,
        rol: usuario.rol,
        providers,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/auth/login ───────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const emailError = validarEmail(email);
    if (emailError) return res.status(400).json({ success: false, error: emailError });

    const passwordError = validarPassword(password);
    if (passwordError) return res.status(400).json({ success: false, error: passwordError });

    const dispositivo = req.headers["user-agent"];
    const ip = req.ip || req.connection.remoteAddress;

    const { usuario, accessToken, refreshToken } = await loginConPassword({
      email: email.trim().toLowerCase(),
      password,
      dispositivo,
      ip,
    });

    const providers = await getProviders(usuario.id);

    res.json({
      success: true,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        avatar: usuario.avatar_url,
        rol: usuario.rol,
        providers,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/auth/refresh ─────────────────────────────────────────
export const refreshTokenCtrl = async (req, res, next) => {
  const { refreshToken: token } = req.body;

  if (!token || typeof token !== "string" || !token.trim()) {
    return res.status(400).json({ success: false, error: "Refresh token requerido" });
  }

  try {
    const dispositivo = req.headers["user-agent"];
    const ip = req.ip || req.connection.remoteAddress;

    const { accessToken, refreshToken } = await refreshAccessToken(token, { dispositivo, ip });
    res.json({ success: true, accessToken, refreshToken });
  } catch (error) {
    if (error.status === 401) {
      return res.status(401).json({ success: false, error: error.message || "Refresh token inválido o expirado" });
    }
    next(error);
  }
};

// ── POST /api/v1/auth/logout ──────────────────────────────────────────
export const logout = async (req, res, next) => {
  const { refreshToken: token } = req.body;
  try {
    if (token) await logoutService(token);
    res.json({ success: true, message: "Sesión cerrada correctamente" });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/auth/logout-all ─────────────────────────────────────
export const logoutAll = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });

    await logoutAllDevices(userId);
    res.json({ success: true, message: "Sesiones cerradas en todos los dispositivos" });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/auth/me ───────────────────────────────────────────────
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = req.usuario;
    if (!user) return res.status(401).json({ success: false, error: "Usuario no autenticado" });

    const providers = await getProviders(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        avatar: user.avatar_url,
        rol: user.rol,
        github_url: user.github_url,
        linkedin_url: user.linkedin_url,
        telefono: user.telefono,
        email_verificado: user.email_verificado,
        providers,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/auth/change-password ────────────────────────────────
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.usuario?.id;

    if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });

    if (!currentPassword || typeof currentPassword !== "string" || !currentPassword.trim()) {
      return res.status(400).json({ success: false, error: "La contraseña actual es requerida" });
    }

    const newPasswordError = validarPassword(newPassword, "La nueva contraseña");
    if (newPasswordError) return res.status(400).json({ success: false, error: newPasswordError });

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, error: "La nueva contraseña debe ser diferente a la actual" });
    }

    const authProvider = await AuthProviderModel.findByUserAndProvider(userId, "password");
    if (!authProvider?.password_hash) {
      return res.status(400).json({ success: false, error: "Este usuario no tiene contraseña configurada" });
    }

    const valido = await bcrypt.compare(currentPassword, authProvider.password_hash);
    if (!valido) return res.status(401).json({ success: false, error: "La contraseña actual es incorrecta" });

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await db.query(
      `UPDATE auth_providers SET password_hash = $1, updated_at = NOW() WHERE user_id = $2 AND provider = 'password'`,
      [newPasswordHash, userId]
    );

    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/auth/forgot-password ────────────────────────────────
export const forgotPasswordCtrl = async (req, res, next) => {
  try {
    const { email } = req.body;

    const emailError = validarEmail(email);
    if (emailError) {
      return res.status(400).json({ success: false, error: emailError });
    }

    const result = await forgotPassword(email.trim().toLowerCase());
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/auth/reset-password ─────────────────────────────────
export const resetPasswordCtrl = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({ success: false, error: "Token requerido" });
    }

    const passwordError = validarPassword(password, "La contraseña");
    if (passwordError) return res.status(400).json({ success: false, error: passwordError });

    const result = await resetPassword(token.trim(), password);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/auth/sessions ─────────────────────────────────────────
export const getActiveSessions = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });

    const sessions = await RefreshTokenModel.obtenerTokensActivos(userId);

    res.json({
      success: true,
      sessions: sessions.map((session) => ({
        id: session.id,
        dispositivo: session.dispositivo,
        ip: session.ip,
        creado: session.created_at,
        expira: session.expires_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/v1/auth/sessions/:sessionId ───────────────────────────
export const revokeSession = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    const { sessionId } = req.params;

    if (!userId) return res.status(401).json({ success: false, error: "Usuario no autenticado" });

    const id = parseInt(sessionId, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, error: "ID de sesión inválido" });
    }

    const revoked = await RefreshTokenModel.revocarPorId(id, userId);
    if (!revoked) return res.status(404).json({ success: false, error: "Sesión no encontrada" });

    res.json({ success: true, message: "Sesión revocada correctamente" });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/auth/set-password ───────────────────────────────────
export const setPasswordCtrl = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    const { password } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Usuario no autenticado" });
    }

    const passwordError = validarPassword(password);
    if (passwordError) return res.status(400).json({ success: false, error: passwordError });

    const result = await setPasswordForOAuthUser(userId, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
};