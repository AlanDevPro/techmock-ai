// middlewares/role.middleware.js

/**
 * Fábrica de middleware de roles.
 * Uso: requireRole("admin") o requireRole("admin", "developer")
 * Depende de que verifyToken haya corrido antes y req.usuario esté disponible.
 */
export const requireRole = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        error: "No autenticado",
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        error: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(" o ")}`,
      });
    }

    next();
  };
};

// Shortcuts para los dos roles del sistema
export const onlyAdmin = requireRole("admin");
export const onlyDeveloper = requireRole("developer");
export const adminOrDeveloper = requireRole("admin", "developer");