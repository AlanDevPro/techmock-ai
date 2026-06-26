// src/controllers/ranking.controller.js
import RankingService from '../services/ranking.service.js';

class RankingController {
  
  /**
   * GET /api/v1/rankings
   * Obtiene el ranking completo de desarrolladores
   */
  static async getRankings(req, res) {
    try {
      const { tecnologia_id, nivel, limit } = req.query;
      
      const data = await RankingService.getRankingData({
        tecnologia_id: tecnologia_id ? parseInt(tecnologia_id) : null,
        nivel: nivel || 'all',
        limit: limit ? parseInt(limit) : 100
      });
      
      // Obtener estadísticas
      const stats = await RankingService.getRankingStats();
      
      res.json({
        success: true,
        data: {
          candidatos: data,
          estadisticas: stats,
          total: data.length
        }
      });
    } catch (error) {
      console.error('Error en getRankings:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener el ranking'
      });
    }
  }
  
  /**
   * GET /api/v1/rankings/:usuarioId
   * Obtiene el detalle de un candidato específico
   */
  static async getCandidateDetail(req, res) {
    try {
      const { usuarioId } = req.params;
      
      const data = await RankingService.getCandidateDetail(usuarioId);
      
      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Candidato no encontrado'
        });
      }
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error en getCandidateDetail:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener el detalle del candidato'
      });
    }
  }
  
  /**
   * GET /api/v1/rankings/tecnologia/:tecnologiaId/top
   * Obtiene el top de candidatos por tecnología
   */
  static async getTopByTech(req, res) {
    try {
      const { tecnologiaId } = req.params;
      const { limit } = req.query;
      
      const data = await RankingService.getTopCandidatesByTech(
        parseInt(tecnologiaId),
        limit ? parseInt(limit) : 10
      );
      
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error en getTopByTech:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener el top por tecnología'
      });
    }
  }
  
  /**
   * GET /api/v1/rankings/stats
   * Obtiene estadísticas generales del ranking
   */
  static async getStats(req, res) {
    try {
      const stats = await RankingService.getRankingStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error en getStats:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener estadísticas'
      });
    }
  }
}

export default RankingController;