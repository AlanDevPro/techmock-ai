import { db } from "../config/database.js";
import { UsuarioModel } from "../models/usuario.model.js";
import { AuthProviderModel } from "../models/authProvider.model.js";
import { verifyAndNormalizeFirebaseToken } from "./firebase.service.js";
import {
  crearSesionCompleta,
  rotarRefreshToken,
  revocarToken,
  revocarTodosLosTokens,
} from "./token.service.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendResetPasswordEmail } from "./email.service.js";

// ── Google / GitHub vía Firebase ──────────────────────────────────────
export async function syncFirebaseUser(firebaseToken, { dispositivo, ip } = {}) {
  const datosFirebase = await verifyAndNormalizeFirebaseToken(firebaseToken);

  try {
    const usuario = await UsuarioModel.upsertConProvider(datosFirebase);
    return await crearSesionCompleta(usuario, { dispositivo, ip });
  } catch (error) {
    throw Object.assign(
      new Error(`Error al sincronizar usuario: ${error.message}`),
      { status: error.status ?? 500 }
    );
  }
}

// ── Email + Password (registro) ───────────────────────────────────────
export async function registrarConPassword(
  { email, nombre, apellido, password },
  { dispositivo, ip } = {}
) {
  try {
    const usuarioExistente = await UsuarioModel.findByEmail(email);
    if (usuarioExistente) {
      throw Object.assign(new Error("El email ya está registrado"), { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const usuario = await UsuarioModel.registrarConPassword({
      email, nombre, apellido, passwordHash,
    });
    return await crearSesionCompleta(usuario, { dispositivo, ip });
  } catch (error) {
    if (error.status) throw error;

    if (error.code === "23505") {
      throw Object.assign(new Error("El email ya está registrado"), { status: 409 });
    }

    throw Object.assign(
      new Error(`Error al registrar usuario: ${error.message}`),
      { status: 500 }
    );
  }
}

// ── Email + Password (login) ──────────────────────────────────────────
export async function loginConPassword({ email, password, dispositivo, ip }) {
  if (!email || typeof email !== "string" || !email.trim()) {
    throw Object.assign(new Error("El email es requerido"), { status: 400 });
  }
  if (!password || typeof password !== "string" || !password.trim()) {
    throw Object.assign(new Error("La contraseña es requerida"), { status: 400 });
  }

  try {
    const usuario = await UsuarioModel.findByEmail(email.trim().toLowerCase());
    if (!usuario) {
      throw Object.assign(new Error("Email o contraseña incorrectos"), { status: 401 });
    }

    const authProvider = await AuthProviderModel.findByUserAndProvider(usuario.id, "password");
    if (!authProvider?.password_hash) {
      throw Object.assign(
        new Error("Esta cuenta usa inicio de sesión con Google o GitHub. Intenta con esos métodos."),
        { status: 401 }
      );
    }

    const valido = await bcrypt.compare(password, authProvider.password_hash);
    if (!valido) {
      throw Object.assign(new Error("Email o contraseña incorrectos"), { status: 401 });
    }

    if (usuario.activo === false) {
      throw Object.assign(
        new Error("Tu cuenta ha sido desactivada. Contacta con soporte."),
        { status: 403 }
      );
    }

    await db.query(
      "UPDATE usuarios SET ultimo_login = NOW(), ultimo_acceso = NOW() WHERE id = $1",
      [usuario.id]
    );

    return await crearSesionCompleta(usuario, { dispositivo, ip });
  } catch (error) {
    if (error.status) throw error;

    throw Object.assign(
      new Error("Error interno al iniciar sesión"),
      { status: 500 }
    );
  }
}

// ── Refresh Token ─────────────────────────────────────────────────────
export async function refreshAccessToken(refreshTokenRaw, { dispositivo, ip } = {}) {
  return await rotarRefreshToken(refreshTokenRaw, { dispositivo, ip });
}

// ── Logout ────────────────────────────────────────────────────────────
export async function logout(refreshTokenRaw) {
  try {
    await revocarToken(refreshTokenRaw);
    return { success: true, message: "Sesión cerrada correctamente" };
  } catch {
    throw Object.assign(new Error("Error al cerrar sesión"), { status: 500 });
  }
}

// ── Logout de todos los dispositivos ─────────────────────────────────
export async function logoutAllDevices(usuarioId) {
  try {
    await revocarTodosLosTokens(usuarioId);
    return { success: true, message: "Sesiones cerradas en todos los dispositivos" };
  } catch {
    throw Object.assign(new Error("Error al cerrar sesiones"), { status: 500 });
  }
}

// ── Recuperación de contraseña ────────────────────────────────────────
export async function forgotPassword(email) {
  const usuario = await UsuarioModel.findByEmail(email.trim().toLowerCase());

  if (!usuario) {
    return { success: true, message: "Si el correo existe, se enviará un enlace" };
  }

  const authProvider = await AuthProviderModel.findByUserAndProvider(usuario.id, "password");
  if (!authProvider) {
    return { success: true, message: "Si el correo existe, se enviará un enlace" };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

  await db.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [usuario.id, tokenHash, expiresAt]
  );

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  await sendResetPasswordEmail(usuario.email, resetLink);

  return { success: true, message: "Si el correo existe, se enviará un enlace" };
}

// ── Resetear contraseña ───────────────────────────────────────────────
export async function resetPassword(token, newPassword) {
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    throw Object.assign(
      new Error("La contraseña debe tener al menos 6 caracteres"),
      { status: 400 }
    );
  }

  const result = await db.query(
    `SELECT * FROM password_reset_tokens WHERE used = FALSE AND expires_at > NOW() ORDER BY created_at DESC`
  );

  let validToken = null;
  for (const row of result.rows) {
    const valid = await bcrypt.compare(token, row.token_hash);
    if (valid) {
      validToken = row;
      break;
    }
  }

  if (!validToken) {
    throw Object.assign(new Error("Token inválido o expirado"), { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.query(
    `UPDATE auth_providers SET password_hash = $1, updated_at = NOW() WHERE user_id = $2 AND provider = 'password'`,
    [passwordHash, validToken.user_id]
  );

  await db.query(
    `UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`,
    [validToken.id]
  );

  await revocarTodosLosTokens(validToken.user_id);

  return { success: true, message: "Contraseña actualizada correctamente" };
}

// ── Set password para usuario OAuth ✅ NUEVO ──────────────────────────
export async function setPasswordForOAuthUser(userId, password) {
  const existingProvider = await AuthProviderModel.findByUserAndProvider(userId, "password");

  if (existingProvider) {
    throw Object.assign(
      new Error("El usuario ya tiene contraseña"),
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.query(
    `INSERT INTO auth_providers (user_id, provider, password_hash) VALUES ($1, 'password', $2)`,
    [userId, passwordHash]
  );

  return { success: true, message: "Contraseña creada correctamente" };
}