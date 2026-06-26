// backend/src/controllers/rankingAdmin.controller.js
import { RankingService } from "../services/rankingAdmin.service.js";

// ─── Helper: Formatear tiempo relativo ───
function formatRelativeTime(date) {
  if (!date) return 'Nunca';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days} d`;
  return `hace ${Math.floor(days / 7)} sem`;
}

/**
 * Obtener ranking de candidatos con filtros
 * GET /api/v1/admin/rankings/candidatos
 */
export const obtenerRankingCandidatos = async (req, res) => {
  try {
    const candidatos = await RankingService.obtenerCandidatos({
      tecnologia_id: req.query.tecnologia_id,
      nivel: req.query.nivel
    });
    
    res.json({
      success: true,
      data: candidatos,
      message: 'Ranking obtenido exitosamente',
    });
  } catch (error) {
    console.error('[obtenerRankingCandidatos] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ranking de candidatos',
      error: error.message,
    });
  }
};

/**
 * Obtener detalle completo de un candidato
 * GET /api/v1/admin/rankings/candidatos/:id/detalle
 */
export const obtenerDetalleCandidato = async (req, res) => {
  try {
    const { id } = req.params;
    
    const candidatoDetail = await RankingService.obtenerDetalle(id);
    
    if (!candidatoDetail) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Aplicar el formateo de fecha justo antes de enviar al cliente
    candidatoDetail.ultima_entrevista = formatRelativeTime(candidatoDetail.ultima_entrevista);
    
    res.json({
      success: true,
      data: candidatoDetail,
      message: 'Detalle de candidato obtenido exitosamente',
    });
  } catch (error) {
    console.error('[obtenerDetalleCandidato] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle del candidato',
      error: error.message,
    });
  }
};

/**
 * Obtener tecnologías para los filtros
 * GET /api/v1/admin/rankings/tecnologias
 */
export const obtenerTecnologias = async (req, res) => {
  try {
    const tecnologias = await RankingService.obtenerTecnologias();
    
    res.json({
      success: true,
      data: tecnologias,
    });
  } catch (error) {
    console.error('[obtenerTecnologias] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tecnologías',
    });
  }
};

/**
 * Contactar a un candidato
 * POST /api/v1/admin/rankings/candidatos/:id/contactar
 */
export const contactarCandidato = async (req, res) => {
  try {
    const { id } = req.params;
    const { asunto, mensaje } = req.body;
    const admin_id = req.user.id;
    
    if (!asunto || !mensaje) {
      return res.status(400).json({
        success: false,
        message: 'Asunto y mensaje son requeridos',
      });
    }
    
    await RankingService.registrarContacto(admin_id, id, asunto, mensaje);
    
    // TODO: Enviar email real aquí
    
    res.json({
      success: true,
      message: 'Mensaje enviado exitosamente al candidato',
    });
  } catch (error) {
    console.error('[contactarCandidato] Error:', error);
    
    if (error.message === "Candidato no encontrado") {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({
      success: false,
      message: 'Error al contactar candidato',
      error: error.message,
    });
  }
};