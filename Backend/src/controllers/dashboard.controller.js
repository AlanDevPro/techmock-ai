// controllers/dashboard.controller.js
import { DashboardModel } from "../models/dashboard.model.js";

// GET /api/v1/dashboard/stats
export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await DashboardModel.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/dashboard/recent-sessions
export const getRecentSessions = async (req, res, next) => {
  try {
    const sessions = await DashboardModel.getRecentSessions();
    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/dashboard/top-technologies
export const getTopTechnologies = async (req, res, next) => {
  try {
    const techs = await DashboardModel.getTopTechnologies();
    res.json({
      success: true,
      data: techs,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/dashboard/admin
export const getAdminDashboard = async (req, res, next) => {
  try {
    // Verificar que es admin
    if (req.usuario.rol !== "admin") {
      return res.status(403).json({ 
        success: false, 
        error: "Acceso denegado. Se requieren permisos de administrador." 
      });
    }

    const dashboard = await DashboardModel.getAdminDashboard();
    res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/dashboard/developer
export const getDeveloperDashboard = async (req, res, next) => {
  try {
    const dashboard = await DashboardModel.getDeveloperDashboard(req.usuario.id);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/dashboard/recent-recruitment
export const getRecentRecruitment = async (req, res, next) => {
  try {
    // Solo admin puede ver reclutamiento
    if (req.usuario.rol !== "admin") {
      return res.status(403).json({ 
        success: false, 
        error: "Acceso denegado. Se requieren permisos de administrador." 
      });
    }

    const recruitment = await DashboardModel.getRecentRecruitment();
    res.json({ success: true, data: recruitment });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/dashboard/notifications
export const getRecentNotifications = async (req, res, next) => {
  try {
    const notifications = await DashboardModel.getRecentNotifications(req.usuario.id);
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};