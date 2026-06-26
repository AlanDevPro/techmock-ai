// 📁 controllers/usuario.controller.js
import { UsuarioModel } from "../models/usuario.model.js";
import { db } from "../config/database.js";

// GET /api/v1/usuarios/perfil
export const getMiPerfil = async (req, res, next) => {
  try {
    const usuario = await UsuarioModel.findById(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }
    res.json({ success: true, data: usuario });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/usuarios/perfil - VERSIÓN COMPLETA CON NUEVOS CAMPOS
export const updateMiPerfil = async (req, res, next) => {
  try {
    const { 
      nombre, 
      apellido, 
      github_url, 
      linkedin_url, 
      telefono, 
      avatar_url,
      bio,
      website,
      location,
      twitter
    } = req.body;
    
    const actualizado = await UsuarioModel.updatePerfil(req.usuario.id, {
      nombre, 
      apellido, 
      github_url, 
      linkedin_url, 
      telefono, 
      avatar_url,
      bio,
      website,
      location,
      twitter
    });
    
    if (!actualizado) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }
    
    res.json({ success: true, data: actualizado });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/usuarios/:id (Admin o propio usuario)
export const getUsuarioById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuario = await UsuarioModel.findById(id);
    
    if (!usuario) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }
    
    // Verificar permisos: solo el propio usuario o un admin puede ver el perfil
    if (req.usuario.id !== id && req.usuario.rol !== 'admin') {
      return res.status(403).json({ success: false, error: "No tienes permiso para ver este perfil" });
    }
    
    res.json({ success: true, data: usuario });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/usuarios (Solo admin)
export const getAllUsuarios = async (req, res, next) => {
  try {
    // Verificar que sea admin
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ success: false, error: "Acceso no autorizado" });
    }
    
    const usuarios = await UsuarioModel.getAllDevelopers();
    res.json({ success: true, data: usuarios });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/usuarios/:id/estadisticas (Estadísticas completas)
export const getEstadisticasUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const perfilCompleto = await UsuarioModel.getFullProfile(id);
    
    if (!perfilCompleto) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }
    
    // Verificar permisos: solo el propio usuario o un admin puede ver estadísticas
    if (req.usuario.id !== id && req.usuario.rol !== 'admin') {
      return res.status(403).json({ success: false, error: "No tienes permiso para ver estas estadísticas" });
    }
    
    res.json({ success: true, data: perfilCompleto });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/usuarios/:id (Admin - actualizar rol, activar/desactivar)
export const updateUsuarioByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rol, activo } = req.body;
    
    // Verificar que sea admin
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ success: false, error: "Acceso no autorizado" });
    }
    
    // No permitir que un admin se desactive a sí mismo o cambie su propio rol
    if (req.usuario.id === id) {
      return res.status(400).json({ 
        success: false, 
        error: "No puedes modificar tu propio rol o estado a través de esta ruta" 
      });
    }
    
    const result = await db.query(`
      UPDATE usuarios 
      SET rol = COALESCE($1, rol),
          activo = COALESCE($2, activo),
          updated_at = NOW()
      WHERE id = $3
      RETURNING id, email, nombre, apellido, rol, activo
    `, [rol, activo, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/usuarios/:id (Admin - eliminar usuario)
export const deleteUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verificar que sea admin
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ success: false, error: "Acceso no autorizado" });
    }
    
    // No permitir eliminar a sí mismo
    if (req.usuario.id === id) {
      return res.status(400).json({ 
        success: false, 
        error: "No puedes eliminar tu propia cuenta" 
      });
    }
    
    const result = await db.query(`
      DELETE FROM usuarios WHERE id = $1 RETURNING id, email
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }
    
    res.json({ 
      success: true, 
      message: `Usuario ${result.rows[0].email} eliminado correctamente` 
    });
  } catch (error) {
    next(error);
  }
};