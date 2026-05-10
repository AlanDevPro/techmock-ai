// services/user.service.js
/**
 * Responsabilidad única: operaciones CRUD sobre usuarios.
 * NO maneja auth, NO genera tokens — eso es responsabilidad de auth.service.js
 */
import { UsuarioModel } from "../models/usuario.model.js";
import { AuthProviderModel } from "../models/authProvider.model.js";

/**
 * Obtener perfil completo del usuario con sus providers vinculados
 */
export async function getPerfilCompleto(userId) {
  const usuario = await UsuarioModel.findById(userId);
  if (!usuario) {
    throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
  }

  const providers = await AuthProviderModel.findAllByUser(userId);

  return {
    ...usuario,
    providers: providers.map(p => ({
      provider:    p.provider,
      vinculado:   true,
      tiene_password: p.tiene_password,
    })),
  };
}

/**
 * Actualizar perfil del usuario autenticado
 */
export async function actualizarPerfil(userId, datos) {
  const actualizado = await UsuarioModel.updatePerfil(userId, datos);
  if (!actualizado) {
    throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
  }
  return actualizado;
}

/**
 * Vincular un nuevo provider OAuth a una cuenta existente.
 * Caso de uso: usuario con password agrega Google login.
 */
export async function vincularProvider(userId, { provider, provider_uid }) {
  console.log("🔗 [USER SERVICE] Vinculando provider:", { userId, provider });

  const existente = await AuthProviderModel.findByProviderUid(provider, provider_uid);
  if (existente && existente.user_id !== userId) {
    throw Object.assign(
      new Error("Este proveedor ya está vinculado a otra cuenta"),
      { status: 409, code: "PROVIDER_ALREADY_LINKED" }
    );
  }

  return AuthProviderModel.linkProvider(userId, { provider, providerUid: provider_uid });
}

/**
 * Desvincular un provider OAuth de una cuenta.
 * Protege contra dejar al usuario sin ningún método de login.
 */
export async function desvincularProvider(userId, provider) {
  console.log("🔓 [USER SERVICE] Desvinculando provider:", { userId, provider });

  if (provider === "password") {
    throw Object.assign(
      new Error("No puedes desvincular el login con contraseña desde aquí. Usa el cambio de contraseña."),
      { status: 400 }
    );
  }

  return AuthProviderModel.unlinkProvider(userId, provider);
}

/**
 * Obtener todos los developers (admin)
 */
export async function getAllDevelopers() {
  return UsuarioModel.getAllDevelopers();
}

/**
 * Obtener perfil completo de un developer (admin)
 */
export async function getDeveloperProfile(developerId) {
  const perfil = await UsuarioModel.getFullProfile(developerId);
  if (!perfil) {
    throw Object.assign(new Error("Developer no encontrado"), { status: 404 });
  }
  return perfil;
}