// components/dashboard/shared/LinkAccountsPanel.tsx
'use client'

import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const GithubIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const PasswordIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// ── Modal para crear contraseña ───────────────────────────────────────
interface SetPasswordModalProps {
  onClose: () => void;
  onSuccess: () => void;
  accessToken: string;
}

function SetPasswordModal({ onClose, onSuccess, accessToken }: SetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (password.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres');
    }
    if (password !== confirm) {
      return setError('Las contraseñas no coinciden');
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear la contraseña');
      }

      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-base">Crear contraseña</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-5">
          Crea una contraseña para poder iniciar sesión también con tu email.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-800 text-gray-300 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors border border-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-white text-black py-2 px-3 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : 'Crear contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────────────
export default function LinkAccountsPanel() {
  const { user, linkGithubToCurrentUser, linkGoogleToCurrentUser } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const providers = user?.providers ?? [];
  const hasGoogle = providers.includes('google.com');
  const hasGithub = providers.includes('github.com');
  const hasPassword = providers.includes('password');
  const allLinked = hasGoogle && hasGithub && hasPassword;

  // Obtener el accessToken desde donde lo guardes (localStorage, contexto, etc.)
  const accessToken =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') ?? '' : '';

  const notify = (msg: string, isError = false) => {
    isError ? setError(msg) : setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const handleLinkGithub = async () => {
    try {
      await linkGithubToCurrentUser();
      notify('✅ GitHub vinculado correctamente');
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Ocurrió un error inesperado', true);
    }
  };

  const handleLinkGoogle = async () => {
    try {
      await linkGoogleToCurrentUser();
      notify('✅ Google vinculado correctamente');
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Ocurrió un error inesperado', true);
    }
  };

  const handlePasswordSuccess = () => {
    setShowPasswordModal(false);
    notify('✅ Contraseña creada correctamente');
    // Si tu AuthContext expone una función para refrescar el usuario, llámala aquí:
    // refreshUser();
  };

  return (
    <>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-4">Vincular Cuentas</h3>

        {success && <p className="text-green-400 text-xs mb-3">{success}</p>}
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <div className="space-y-3">
          {allLinked ? (
            <p className="text-gray-500 text-sm text-center py-2">
              ✅ Todas las cuentas vinculadas
            </p>
          ) : (
            <>
              {!hasGoogle && (
                <button
                  onClick={handleLinkGoogle}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black py-2 px-3 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
                >
                  <GoogleIcon />
                  Vincular con Google
                </button>
              )}

              {!hasGithub && (
                <button
                  onClick={handleLinkGithub}
                  className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors border border-gray-700"
                >
                  <GithubIcon />
                  Vincular con GitHub
                </button>
              )}

              {!hasPassword && (
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors border border-gray-700"
                >
                  <PasswordIcon />
                  Vincular con contraseña
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <SetPasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={handlePasswordSuccess}
          accessToken={accessToken}
        />
      )}
    </>
  );
}