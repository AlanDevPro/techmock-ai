// hooks/useTecnologias.ts
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface TecnologiaBackend {
  id: number;
  nombre: string;
  slug: string;
  tipo: string;
  version_actual: string | null;
  icono_url: string | null;
  activo: boolean;
  sesiones: number;
  avg_score: number;
}

interface TrackFromBackend {
  id: string;
  title: string;
  description: string;
  duration: string;
  tags: string[];
  locked?: boolean;
  framework: string;
  icono_url?: string | null;
  sesiones?: number;
  avg_score?: number;
}

export function useTecnologias() {
  const { user } = useAuth(); // ✅ Solo obtener user, no accessToken
  const [tecnologias, setTecnologias] = useState<TecnologiaBackend[]>([]);
  const [tracks, setTracks] = useState<TrackFromBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTecnologias = async () => {
      try {
        // ✅ Obtener token directamente de localStorage
        const accessToken = localStorage.getItem('accessToken');
        
        if (!accessToken) {
          console.warn('⚠️ [useTecnologias] No hay accessToken disponible');
          setLoading(false);
          return;
        }

        const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const response = await fetch(`${apiBase}/api/v1/tecnologias`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Error fetching tecnologias: ${response.status}`);
        }

        const result = await response.json();
        const data: TecnologiaBackend[] = result.data || result;

        setTecnologias(data);

        // Transformar a tracks
        const transformedTracks: TrackFromBackend[] = data.map(tech => ({
          id: tech.slug,
          title: tech.nombre,
          description: getDescriptionForTechnology(tech.nombre, tech.tipo),
          duration: getDurationForTechnology(tech.tipo),
          tags: getTagsForTechnology(tech.nombre),
          locked: !tech.activo,
          framework: tech.slug,
          icono_url: tech.icono_url,
          sesiones: tech.sesiones,
          avg_score: tech.avg_score,
        }));

        setTracks(transformedTracks);
      } catch (err) {
        console.error('Error loading tecnologias:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchTecnologias();
  }, [user]);

  return { tecnologias, tracks, loading, error };
}

// Funciones auxiliares para mapear datos
function getDescriptionForTechnology(nombre: string, tipo: string): string {
  const descriptions: Record<string, string> = {
    nextjs: 'Domina el framework React más popular para producción. Aprende SSR, SSG y las últimas características.',
    react: 'Desarrolla interfaces modernas y reactivas con el ecosistema más popular de JavaScript.',
    vuejs: 'Construye aplicaciones progresivas con Vue.js, el framework progresivo por excelencia.',
    cpp: 'Domina C++ para sistemas de alto rendimiento, juegos y aplicaciones críticas.',
  };
  
  return descriptions[nombre.toLowerCase()] || 
    `Practica y mejora tus habilidades en ${nombre}. Entrevistas técnicas adaptativas con IA.`;
}

function getDurationForTechnology(tipo: string): string {
  const durations: Record<string, string> = {
    'frontend': '45 mins',
    'backend': '60 mins',
    'fullstack': '75 mins',
    'mobile': '50 mins',
    'devops': '60 mins',
  };
  
  return durations[tipo] || '45 mins';
}

function getTagsForTechnology(nombre: string): string[] {
  const tags: Record<string, string[]> = {
    nextjs: ['React', 'SSR', 'Frontend'],
    react: ['Frontend', 'UI/UX', 'Hooks'],
    vuejs: ['Frontend', 'Reactive', 'Components'],
    cpp: ['Systems', 'Performance', 'Memory'],
  };
  
  return tags[nombre.toLowerCase()] || ['Técnica', 'Programación'];
}