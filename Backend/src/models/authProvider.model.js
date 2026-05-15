// models/authProvider.model.js
import { db } from "../config/database.js";

export const AuthProviderModel = {

  /**
   * Buscar provider por user_id y tipo de provider
   */
  async findByUserAndProvider(userId, provider) {
    const result = await db.query(
      `SELECT * FROM auth_providers WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );
    return result.rows[0] || null;
  },

  /**
   * Buscar provider por provider externo (Google, GitHub)
   */
  async findByProviderUid(provider, providerUid) {
    const result = await db.query(
      `SELECT ap.*, u.id AS usuario_id FROM auth_providers ap
       INNER JOIN usuarios u ON u.id = ap.user_id
       WHERE ap.provider = $1 AND ap.provider_uid = $2`,
      [provider, providerUid]
    );
    return result.rows[0] || null;
  },

  /**
   * Obtener todos los providers de un usuario
   * (útil para saber qué métodos de login tiene habilitados)
   */
  async findAllByUser(userId) {
    const result = await db.query(
      `SELECT provider, provider_uid,
              CASE WHEN password_hash IS NOT NULL THEN true ELSE false END AS tiene_password,
              creado_en
       FROM auth_providers
       WHERE user_id = $1
       ORDER BY creado_en ASC`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Vincular un nuevo provider a un usuario existente
   * (linking de cuentas: ej. usuario con password agrega Google)
   */
  async linkProvider(userId, { provider, providerUid }) {
    const result = await db.query(
      `INSERT INTO auth_providers (user_id, provider, provider_uid)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, provider) DO UPDATE SET
         provider_uid = EXCLUDED.provider_uid
       RETURNING *`,
      [userId, provider, providerUid]
    );
    return result.rows[0];
  },

  /**
   * Crear provider de password
   */
  async createPasswordProvider(userId, passwordHash) {
    const result = await db.query(
      `INSERT INTO auth_providers (user_id, provider, password_hash)
       VALUES ($1, 'password', $2)
       RETURNING *`,
      [userId, passwordHash]
    );
    return result.rows[0];
  },

  /**
   * Actualizar password hash
   */
  async updatePasswordHash(userId, newPasswordHash) {
    const result = await db.query(
      `UPDATE auth_providers
       SET password_hash = $1
       WHERE user_id = $2 AND provider = 'password'
       RETURNING *`,
      [newPasswordHash, userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Desvincular un provider de un usuario
   * (solo si tiene al menos otro método de login)
   */
  async unlinkProvider(userId, provider) {
    // Verificar que no sea el único método de login
    const countResult = await db.query(
      `SELECT COUNT(*) FROM auth_providers WHERE user_id = $1`,
      [userId]
    );
    const count = parseInt(countResult.rows[0].count);
    if (count <= 1) {
      throw Object.assign(
        new Error("No puedes desvincular tu único método de inicio de sesión"),
        { status: 400, code: "LAST_PROVIDER" }
      );
    }

    const result = await db.query(
      `DELETE FROM auth_providers
       WHERE user_id = $1 AND provider = $2
       RETURNING *`,
      [userId, provider]
    );
    return result.rows[0] || null;
  },
};