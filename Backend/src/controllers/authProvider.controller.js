// controllers/authProvider.controller.js
import { AuthProviderModel } from "../models/authProvider.model.js";
import bcrypt from "bcryptjs";

/**
 * GET /api/v1/auth/providers
 * Retorna los providers del usuario autenticado (sin exponer hashes)
 */
export const getMisProviders = async (req, res, next) => {
  try {
    const providers = await AuthProviderModel.findAllByUser(req.usuario.id);
    res.json({ success: true, data: providers });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/providers/link
 * Vincula un provider OAuth (Google/GitHub) a la cuenta actual.
 * Body: { provider: "google" | "github", provider_uid: "...", firebase_token: "..." }
 */
export const linkProvider = async (req, res, next) => {
  try {
    const { provider, provider_uid } = req.body;

    // Verificar que no sea el provider 'password' (ese tiene su propio flujo)
    if (provider === "password") {
      return res.status(400).json({
        success: false,
        error: "Para agregar contraseña usa PATCH /providers/password",
      });
    }

    // Verificar que ese provider_uid no esté ya vinculado a OTRA cuenta
    const existente = await AuthProviderModel.findByProviderUid(provider, provider_uid);
    if (existente && existente.usuario_id !== req.usuario.id) {
      return res.status(409).json({
        success: false,
        error: "Este provider ya está vinculado a otra cuenta",
      });
    }

    const linked = await AuthProviderModel.linkProvider(req.usuario.id, {
      provider,
      providerUid: provider_uid,
    });

    res.json({ success: true, data: linked });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/auth/providers/:provider
 * Desvincula un provider del usuario autenticado.
 * No permite desvincular el último método de login.
 */
export const unlinkProvider = async (req, res, next) => {
  try {
    const { provider } = req.params;

    const eliminado = await AuthProviderModel.unlinkProvider(req.usuario.id, provider);

    if (!eliminado) {
      return res.status(404).json({
        success: false,
        error: "Provider no encontrado en tu cuenta",
      });
    }

    res.json({ success: true, message: `Provider "${provider}" desvinculado correctamente` });
  } catch (error) {
    // El modelo lanza 400 si es el último provider
    next(error);
  }
};

/**
 * PATCH /api/v1/auth/providers/password
 * Cambia o establece la contraseña del usuario.
 * Si ya tiene provider password → requiere contraseña actual.
 * Si NO tiene → la crea directamente (linked account).
 * Body: { currentPassword?: string, newPassword: string }
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const providerActual = await AuthProviderModel.findByUserAndProvider(
      req.usuario.id,
      "password"
    );

    if (providerActual) {
      // Ya tiene contraseña → validar la actual
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: "Debes proporcionar tu contraseña actual",
        });
      }

      const valido = await bcrypt.compare(currentPassword, providerActual.password_hash);
      if (!valido) {
        return res.status(401).json({
          success: false,
          error: "La contraseña actual es incorrecta",
        });
      }

      const nuevoHash = await bcrypt.hash(newPassword, 12);
      await AuthProviderModel.updatePasswordHash(req.usuario.id, nuevoHash);

      return res.json({ success: true, message: "Contraseña actualizada correctamente" });
    }

    // No tiene contraseña aún → crearla (ej: usuario que solo usaba Google)
    const nuevoHash = await bcrypt.hash(newPassword, 12);
    await AuthProviderModel.createPasswordProvider(req.usuario.id, nuevoHash);

    res.json({ success: true, message: "Contraseña creada correctamente" });
  } catch (error) {
    next(error);
  }
};