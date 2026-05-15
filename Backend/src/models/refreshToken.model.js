// models/refreshToken.model.js
import { db } from "../config/database.js";
import crypto from "crypto";

export const RefreshTokenModel = {

  /**
   * Crea un refresh token, guarda solo su hash en DB.
   * Retorna el token en crudo (rawToken) para enviarlo al cliente UNA sola vez.
   */
  async crear({ usuarioId, dispositivo, ip }) {
    const rawToken = crypto.randomBytes(64).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

    await db.query(
      `INSERT INTO refresh_tokens (usuario_id, token_hash, dispositivo, ip, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [usuarioId, tokenHash, dispositivo ?? null, ip ?? null, expiresAt]
    );

    return { rawToken };
  },

  /**
   * Valida un refresh token crudo.
   * Retorna los datos del token si es válido y no expiró/revocó.
   */
  async validar(rawToken) {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const result = await db.query(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1
         AND revocado = false
         AND expires_at > NOW()`,
      [tokenHash]
    );

    return result.rows[0] || null;
  },

  /**
   * Revoca un token por su valor crudo
   */
  async revocar(rawToken) {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await db.query(
      `UPDATE refresh_tokens SET revocado = true WHERE token_hash = $1`,
      [tokenHash]
    );
  },

  /**
   * Revoca todos los tokens de un usuario
   */
  async revocarTodosDelUsuario(usuarioId) {
    await db.query(
      `UPDATE refresh_tokens SET revocado = true WHERE usuario_id = $1`,
      [usuarioId]
    );
  },

  /**
   * Revoca un token específico por ID, verificando que pertenezca al usuario
   */
  async revocarPorId(tokenId, usuarioId) {
    const result = await db.query(
      `UPDATE refresh_tokens
       SET revocado = true
       WHERE id = $1 AND usuario_id = $2
       RETURNING id`,
      [tokenId, usuarioId]
    );
    return result.rows[0] || null;
  },

  /**
   * Obtener sesiones activas de un usuario
   */
  async obtenerTokensActivos(usuarioId) {
    const result = await db.query(
      `SELECT id, dispositivo, ip, fecha_creacion, expires_at
       FROM refresh_tokens
       WHERE usuario_id = $1
         AND revocado = false
         AND expires_at > NOW()
       ORDER BY fecha_creacion DESC`,
      [usuarioId]
    );
    return result.rows;
  },

  /**
   * Limpieza de tokens expirados (para cron job)
   */
  async limpiarExpirados() {
    const result = await db.query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revocado = true`
    );
    return result.rowCount;
  },
};