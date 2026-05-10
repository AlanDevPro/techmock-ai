// services/auth.service.js
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
    // Validar que el email no esté ya registrado antes de hashear
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
    // ✅ Re-lanzar errores que ya tienen status (propios o de negocio)
    if (error.status) throw error;

    // Manejar duplicado de DB por si la verificación previa tuvo race condition
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
  // ✅ Validaciones de campos vacíos/nulos a nivel de servicio
  if (!email || typeof email !== "string" || !email.trim()) {
    throw Object.assign(new Error("El email es requerido"), { status: 400 });
  }
  if (!password || typeof password !== "string" || !password.trim()) {
    throw Object.assign(new Error("La contraseña es requerida"), { status: 400 });
  }

  try {
    // 1. Verificar que el usuario exista
    const usuario = await UsuarioModel.findByEmail(email.trim().toLowerCase());
    if (!usuario) {
      // ✅ Mensaje genérico para no revelar si el email existe o no (seguridad)
      throw Object.assign(
        new Error("Email o contraseña incorrectos"),
        { status: 401 }
      );
    }

    // 2. Verificar que tenga provider de password
    const authProvider = await AuthProviderModel.findByUserAndProvider(usuario.id, "password");
    if (!authProvider?.password_hash) {
      throw Object.assign(
        new Error("Esta cuenta usa inicio de sesión con Google o GitHub. Intenta con esos métodos."),
        { status: 401 }
      );
    }

    // 3. Verificar contraseña
    const valido = await bcrypt.compare(password, authProvider.password_hash);
    if (!valido) {
      throw Object.assign(
        new Error("Email o contraseña incorrectos"),
        { status: 401 }
      );
    }

    // 4. Verificar que la cuenta esté activa
    if (usuario.activo === false) {
      throw Object.assign(
        new Error("Tu cuenta ha sido desactivada. Contacta con soporte."),
        { status: 403 }
      );
    }

    // 5. Actualizar último login
    await db.query(
      "UPDATE usuarios SET ultimo_login = NOW(), ultimo_acceso = NOW() WHERE id = $1",
      [usuario.id]
    );

    return await crearSesionCompleta(usuario, { dispositivo, ip });

  } catch (error) {
    // ✅ CRÍTICO: re-lanzar errores con status propio sin envolverlos en 500
    if (error.status) throw error;

    // Solo errores inesperados llegan aquí
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