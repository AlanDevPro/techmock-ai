// services/token.service.js
import jwt from "jsonwebtoken";
import { RefreshTokenModel } from "../models/refreshToken.model.js";
import { UsuarioModel } from "../models/usuario.model.js";

export function generarAccessToken(usuario) {
  return jwt.sign(
    {
      sub:      usuario.id,
      email:    usuario.email,
      nombre:   usuario.nombre,
      apellido: usuario.apellido,
      rol:      usuario.rol,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

export async function crearSesionCompleta(usuario, { dispositivo, ip } = {}) {
  const accessToken  = generarAccessToken(usuario);
  const refreshToken = await RefreshTokenModel.crear({
    usuarioId: usuario.id,
    dispositivo,
    ip,
  });

  return {
    usuario: {
      id:         usuario.id,
      email:      usuario.email,
      nombre:     usuario.nombre,
      apellido:   usuario.apellido,
      avatar_url: usuario.avatar_url,
      rol:        usuario.rol,
    },
    accessToken,
    refreshToken: refreshToken.rawToken,
  };
}

export async function rotarRefreshToken(refreshTokenRaw, { dispositivo, ip } = {}) {
  const tokenData = await RefreshTokenModel.validar(refreshTokenRaw);
  if (!tokenData) {
    throw Object.assign(new Error("Refresh token inválido o expirado"), { status: 401 });
  }

  const usuario = await UsuarioModel.findById(tokenData.usuario_id);
  if (!usuario || !usuario.activo) {
    throw Object.assign(new Error("Usuario no válido"), { status: 401 });
  }

  await RefreshTokenModel.revocar(refreshTokenRaw);
  const newRefreshToken = await RefreshTokenModel.crear({
    usuarioId: usuario.id,
    dispositivo,
    ip,
  });

  return {
    accessToken:  generarAccessToken(usuario),
    refreshToken: newRefreshToken.rawToken,
  };
}

export async function revocarToken(refreshTokenRaw) {
  await RefreshTokenModel.revocar(refreshTokenRaw);
}

export async function revocarTodosLosTokens(usuarioId) {
  await RefreshTokenModel.revocarTodosDelUsuario(usuarioId);
}