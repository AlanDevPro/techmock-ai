// middlewares/auth.middleware.js
import jwt from "jsonwebtoken";
import { db } from "../config/database.js";

/**
 * Middleware base de verificación de JWT
 */
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Token no proporcionado",
    });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db.query(
      "SELECT id, email, nombre, apellido, rol, activo FROM usuarios WHERE id = $1",
      [payload.sub]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Usuario no encontrado",
      });
    }

    const usuario = result.rows[0];

    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        error: "Cuenta desactivada",
      });
    }

    req.usuario = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expirado",
        code: "TOKEN_EXPIRED",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Token inválido",
        code: "TOKEN_INVALID",
      });
    }

    console.error("❌ [AUTH] Error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Error interno al verificar token",
    });
  }
};

/**
 * Alias semántico PRO
 */
export const authenticate = verifyToken;