// models/usuario.model.js
import { db } from "../config/database.js";

export const UsuarioModel = {

  async findById(id) {
    const result = await db.query(
      "SELECT * FROM usuarios WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },

  async findByEmail(email) {
    const result = await db.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Upsert usuario OAuth (Google / GitHub vía Firebase).
   * Crea o actualiza el usuario Y su auth_provider en una sola transacción.
   * Si el email ya existe con otro provider → vincula el nuevo provider automáticamente.
   */
  async upsertConProvider({ email, nombre, apellido, avatar_url, email_verificado, provider, provider_uid }) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // 1. Upsert del usuario
      const upsertUsuario = await client.query(`
        INSERT INTO usuarios (email, nombre, apellido, avatar_url, rol, email_verificado, ultimo_login, ultimo_acceso)
        VALUES ($1, $2, $3, $4, 'developer', $5, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET
          nombre           = COALESCE(EXCLUDED.nombre, usuarios.nombre),
          apellido         = COALESCE(EXCLUDED.apellido, usuarios.apellido),
          avatar_url       = COALESCE(EXCLUDED.avatar_url, usuarios.avatar_url),
          email_verificado = EXCLUDED.email_verificado,
          ultimo_login     = NOW(),
          ultimo_acceso    = NOW(),
          updated_at       = NOW()
        RETURNING *
      `, [email, nombre, apellido, avatar_url, email_verificado]);

      const usuario = upsertUsuario.rows[0];

      // 2. Manejo profesional de providers
      
      // Intentar encontrar si ya existe ese provider_uid
      const existingProvider = await client.query(`
        SELECT * FROM auth_providers
        WHERE provider = $1 AND provider_uid = $2
      `, [provider, provider_uid]);

      if (existingProvider.rows.length > 0) {
        // Ya existe → actualizar el user_id (caso: linking de cuentas)
        await client.query(`
          UPDATE auth_providers
          SET user_id = $1
          WHERE provider = $2 AND provider_uid = $3
        `, [usuario.id, provider, provider_uid]);

      } else {
        // No existe → intentar insertar

        try {
          await client.query(`
            INSERT INTO auth_providers (user_id, provider, provider_uid)
            VALUES ($1, $2, $3)
          `, [usuario.id, provider, provider_uid]);

        } catch (err) {
          // Si falla por UNIQUE(user_id, provider), ignorar (ya está vinculado)
          if (err.code !== "23505") {
            throw err;
          }
        }
      }

      // 3. Estadísticas iniciales si es nuevo usuario
      await client.query(`
        INSERT INTO estadisticas_usuario (usuario_id)
        VALUES ($1)
        ON CONFLICT DO NOTHING
      `, [usuario.id]);

      await client.query("COMMIT");
      return usuario;

    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ [USUARIO MODEL] Error en upsertConProvider:", err.message);
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Registro con email + password.
   * Lanza 409 si el email ya existe.
   */
  async registrarConPassword({ email, nombre, apellido, passwordHash }) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Lock para evitar race conditions
      const existente = await client.query(
        "SELECT id FROM usuarios WHERE email = $1 FOR UPDATE",
        [email]
      );
      if (existente.rows.length > 0) {
        throw Object.assign(
          new Error("Email ya registrado"),
          { status: 409, code: "EMAIL_TAKEN" }
        );
      }

      const userResult = await client.query(`
        INSERT INTO usuarios (email, nombre, apellido, rol, email_verificado)
        VALUES ($1, $2, $3, 'developer', false)
        RETURNING *
      `, [email, nombre, apellido]);
      const usuario = userResult.rows[0];

      await client.query(`
        INSERT INTO auth_providers (user_id, provider, password_hash)
        VALUES ($1, 'password', $2)
      `, [usuario.id, passwordHash]);

      await client.query(`
        INSERT INTO estadisticas_usuario (usuario_id) VALUES ($1)
        ON CONFLICT DO NOTHING
      `, [usuario.id]);

      await client.query("COMMIT");
      return usuario;

    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Actualizar perfil del usuario
   */
  async updatePerfil(id, { nombre, apellido, github_url, linkedin_url, telefono, avatar_url }) {
    const result = await db.query(`
      UPDATE usuarios SET
        nombre       = COALESCE($2, nombre),
        apellido     = COALESCE($3, apellido),
        github_url   = COALESCE($4, github_url),
        linkedin_url = COALESCE($5, linkedin_url),
        telefono     = COALESCE($6, telefono),
        avatar_url   = COALESCE($7, avatar_url),
        updated_at   = NOW()
      WHERE id = $1
      RETURNING id, nombre, apellido, email, avatar_url, github_url, linkedin_url, telefono, rol
    `, [id, nombre, apellido, github_url, linkedin_url, telefono, avatar_url]);
    return result.rows[0] || null;
  },

  // ── ADMIN ──────────────────────────────────────────────────────────────

  async getAllDevelopers() {
    const result = await db.query(`
      SELECT
        u.id, u.nombre, u.apellido, u.email, u.avatar_url,
        u.github_url, u.linkedin_url, u.activo, u.fecha_creacion, u.ultimo_login,
        e.total_entrevistas, e.entrevistas_finalizadas,
        e.puntaje_promedio, e.mejor_puntaje, e.racha_maxima,
        t.nombre AS tecnologia_favorita
      FROM usuarios u
      LEFT JOIN estadisticas_usuario e ON e.usuario_id = u.id
      LEFT JOIN tecnologias t ON t.id = e.tecnologia_favorita_id
      WHERE u.rol = 'developer'
      ORDER BY u.fecha_creacion DESC
    `);
    return result.rows;
  },

  async getFullProfile(id) {
    const result = await db.query(`
      SELECT
        u.id, u.nombre, u.apellido, u.email, u.avatar_url,
        u.github_url, u.linkedin_url, u.telefono, u.activo,
        u.fecha_creacion, u.ultimo_login,
        e.total_entrevistas, e.entrevistas_finalizadas, e.entrevistas_abandonadas,
        e.puntaje_promedio, e.mejor_puntaje, e.peor_puntaje,
        e.tiempo_promedio_segundos, e.racha_actual, e.racha_maxima,
        e.ultima_entrevista_fecha,
        t.nombre AS tecnologia_favorita
      FROM usuarios u
      LEFT JOIN estadisticas_usuario e ON e.usuario_id = u.id
      LEFT JOIN tecnologias t ON t.id = e.tecnologia_favorita_id
      WHERE u.id = $1 AND u.rol = 'developer'
    `, [id]);
    return result.rows[0] || null;
  },
};