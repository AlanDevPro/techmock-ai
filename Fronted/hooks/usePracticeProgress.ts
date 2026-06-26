// hooks/usePracticeProgress.ts
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PracticeProgressFromAPI {
  id: string;
  label: string;
  icon: string;
  percent: number;
  framework: string;
  total_sesiones?: number;
  ultimo_puntaje?: number;
}

export function usePracticeProgress(tecnologiasSlugs: string[]) {
  const { user } = useAuth(); // ✅ Solo obtener user, no accessToken
  const [progress, setProgress] = useState<PracticeProgressFromAPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || tecnologiasSlugs.length === 0) {
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_RAG_API_URL || 'http://localhost:8000';
        
        // ✅ Obtener token directamente de localStorage
        const accessToken = localStorage.getItem('accessToken');
        
        if (!accessToken) {
          console.warn('⚠️ [usePracticeProgress] No hay accessToken disponible');
          setLoading(false);
          return;
        }

        // Obtener progreso para cada tecnología
        const progressPromises = tecnologiasSlugs.map(async (slug) => {
          const response = await fetch(
            `${apiBase}/usuarios/${user.id}/progreso/${slug}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          
          if (response.ok) {
            return await response.json();
          }
          return null;
        });

        const results = await Promise.all(progressPromises);
        
        // Transformar resultados
        const progressData: PracticeProgressFromAPI[] = results
          .filter(result => result !== null)
          .map((result, index) => ({
            id: tecnologiasSlugs[index],
            label: getIconForTechnology(tecnologiasSlugs[index]).label,
            icon: getIconForTechnology(tecnologiasSlugs[index]).icon,
            percent: result.porcentaje_completado || result.puntaje_promedio || 0,
            framework: tecnologiasSlugs[index],
            total_sesiones: result.total_sesiones,
            ultimo_puntaje: result.ultimo_puntaje,
          }));

        setProgress(progressData);
      } catch (error) {
        console.error('Error fetching practice progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user, tecnologiasSlugs]);

  return { progress, loading };
}

function getIconForTechnology(slug: string): { label: string; icon: string } {
  const icons: Record<string, { label: string; icon: string }> = {
    react: { label: 'React', icon: '⚛️' },
    nextjs: { label: 'Next.js', icon: '▲' },
    vuejs: { label: 'Vue.js', icon: '◈' },
    cpp: { label: 'C++', icon: 'C' },
    angular: { label: 'Angular', icon: '🅰' },
    python: { label: 'Python', icon: '🐍' },
    java: { label: 'Java', icon: '☕' },
  };
  
  return icons[slug] || { label: slug, icon: '💻' };
}