'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { IconBell, IconCheck, IconX, IconTrash, IconChevronLeft } from '../shared/Icons';
import { notificationsService, type Notif, TIPO_CONFIG } from '@/services/notifications.service';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationsDropdownProps {
  isDark: boolean;
}

type ViewState = 'list' | 'detail';

export default function NotificationsDropdown({ isDark }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ViewState>('list');
  const [selectedNotif, setSelectedNotif] = useState<Notif | null>(null);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setIsMarking] = useState(false); // Eliminado warning de variable no usada
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Temas ──────────────────────────────────
  const bg = isDark ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const textFaint = isDark ? 'text-gray-500' : 'text-gray-400';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const detailBg = isDark ? 'bg-gray-800/30' : 'bg-gray-50';

  // ─── Cargar notificaciones ──────────────────
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationsService.getNotificaciones();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.leida).length);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Efectos ────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setTimeout(() => {
          setView('list');
          setSelectedNotif(null);
        }, 300);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Handlers ───────────────────────────────

  const handleViewDetail = async (notif: Notif) => {
    setSelectedNotif(notif);
    setView('detail');

    if (!notif.leida) {
      try {
        setIsMarking(true);
        await notificationsService.markAsRead(notif.id);
        
        setNotifications(prev =>
          prev.map(n => n.id === notif.id ? { ...n, leida: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        setSelectedNotif(prev => prev ? { ...prev, leida: true } : null);
      } catch (err) {
        console.error('Error al marcar como leída:', err);
      } finally {
        setIsMarking(false);
      }
    }
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedNotif(null);
  };

  const handleMarkAsRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, leida: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error al marcar como leída:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, leida: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error al marcar todas como leídas:', err);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsService.deleteNotif(id);
      const updated = notifications.filter(n => n.id !== id);
      setNotifications(updated);
      setUnreadCount(updated.filter(n => !n.leida).length);
      
      if (selectedNotif?.id === id) {
        handleBackToList();
      }
    } catch (err) {
      console.error('Error al eliminar notificación:', err);
    }
  };

  const getTypeConfig = (tipo: string) => {
    return TIPO_CONFIG[tipo as keyof typeof TIPO_CONFIG] || TIPO_CONFIG.info;
  };

  const unreadNotifications = notifications.filter(n => !n.leida);

  // ─── Render: Vista de Detalle ──────────────
  if (view === 'detail' && selectedNotif) {
    const config = getTypeConfig(selectedNotif.tipo);
    
    return (
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-full transition-colors relative ${
            isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Notificaciones"
        >
          <IconBell />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#1a1a1a]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className={`absolute right-0 mt-2 w-96 max-h-[500px] overflow-hidden rounded-xl shadow-2xl border ${bg} z-50`}>
            {/* Header con volver */}
            <div className={`flex items-center gap-2 p-4 border-b ${borderColor}`}>
              <button
                onClick={handleBackToList}
                className={`p-1 rounded-md transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                }`}
              >
                <div className="w-[18px] h-[18px] flex items-center justify-center">
                  <IconChevronLeft />
                </div>
              </button>
              <h3 className={`font-semibold flex-1 ${textPrimary}`}>
                Detalle de notificación
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded-md transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                }`}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <IconX />
                </div>
              </button>
            </div>

            {/* Contenido del detalle */}
            <div className="p-4 overflow-y-auto max-h-[400px]">
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-2xl ${config.c}`}>
                  <i className={`ti ${config.icon}`} />
                </span>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: config.bg, color: config.c }}
                >
                  {config.label}
                </span>
                <span className="text-xs text-gray-400 ml-auto">✅ Leída</span>
              </div>

              <h2 className={`text-xl font-bold mb-3 ${textPrimary}`}>
                {selectedNotif.titulo}
              </h2>

              <div className={`p-4 rounded-lg mb-4 ${detailBg}`}>
                <p className={`text-sm leading-relaxed ${textMuted}`}>
                  {selectedNotif.mensaje}
                </p>
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className={textFaint}>Fecha</span>
                  <span className={textMuted}>
                    {new Date(selectedNotif.fecha_creacion).toLocaleString('es-ES', {
                      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={textFaint}>Hace</span>
                  <span className={textMuted}>
                    {formatDistanceToNow(new Date(selectedNotif.fecha_creacion), {
                      addSuffix: true, locale: es,
                    })}
                  </span>
                </div>
                {selectedNotif.url_accion && (
                  <div className="flex justify-between">
                    <span className={textFaint}>Acción</span>
                    <a
                      href={selectedNotif.url_accion}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400 hover:underline"
                    >
                      Ir a la acción →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Render: Vista de Lista ─────────────────
  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full transition-colors relative ${
          isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`}
        title="Notificaciones"
      >
        <IconBell />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#1a1a1a]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 w-96 max-h-[500px] overflow-hidden rounded-xl shadow-2xl border ${bg} z-50`}>
          <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
            <h3 className={`font-semibold ${textPrimary}`}>
              Notificaciones
              {unreadCount > 0 && (
                <span className={`ml-2 text-xs font-normal ${textMuted}`}>
                  ({unreadCount} nuevas)
                </span>
              )}
            </h3>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Marcar todas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded-md transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                }`}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <IconX />
                </div>
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#00ff00] border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-32 text-red-500 text-sm p-4 text-center">
                <span className="text-3xl mb-2">⚠️</span>
                <p>{error}</p>
                <button onClick={loadNotifications} className="mt-2 text-blue-500 hover:text-blue-400 text-xs">
                  Reintentar
                </button>
              </div>
            ) : unreadNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <span className="text-4xl mb-2">🎉</span>
                <p className="text-sm">¡Estás al día! No hay notificaciones nuevas.</p>
              </div>
            ) : (
              unreadNotifications.map((notification) => {
                const config = getTypeConfig(notification.tipo);
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleViewDetail(notification)}
                    className={`relative p-4 border-b ${borderColor} cursor-pointer transition-colors ${
                      isDark ? 'bg-gray-800/50 hover:bg-gray-800' : 'bg-blue-50/50 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`text-xl ${config.c} shrink-0 mt-0.5`}>
                        <i className={`ti ${config.icon}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${textPrimary}`}>
                            {notification.titulo}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                            <button
                              onClick={(e) => handleDelete(notification.id, e)}
                              className={`p-1 rounded-md transition-colors ${
                                isDark ? 'hover:bg-gray-700 text-gray-500 hover:text-red-400' : 'hover:bg-gray-200 text-gray-400 hover:text-red-500'
                              }`}
                            >
                              <div className="w-[14px] h-[14px] flex items-center justify-center">
                                <IconTrash />
                              </div>
                            </button>
                          </div>
                        </div>

                        {notification.mensaje && (
                          <p className={`text-sm mt-1 line-clamp-2 ${textMuted}`}>
                            {notification.mensaje}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs ${textFaint}`}>
                            {formatDistanceToNow(new Date(notification.fecha_creacion), {
                              addSuffix: true, locale: es,
                            })}
                          </span>
                          <button
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            className={`text-xs px-2 py-0.5 rounded-md transition-colors flex items-center gap-0.5 ${
                              isDark ? 'hover:bg-gray-700 text-blue-400 hover:text-blue-300' : 'hover:bg-gray-200 text-blue-600 hover:text-blue-700'
                            }`}
                          >
                            <div className="w-3 h-3 flex items-center justify-center">
                              <IconCheck />
                            </div>
                            Ocultar
                          </button>
                          <span className={`text-xs ${textFaint} ml-auto`}>
                            Ver más →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}