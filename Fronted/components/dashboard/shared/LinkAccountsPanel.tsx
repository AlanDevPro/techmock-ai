// components/dashboard/shared/LinkAccountsPanel.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

/* ── Icons ── */
const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const GithubIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/* ── SetPasswordModal ── */
interface SetPasswordModalProps {
  onClose: () => void;
  onSuccess: () => void;
  accessToken: string;
  isDark: boolean;
}

function SetPasswordModal({ onClose, onSuccess, accessToken, isDark }: SetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000/api/v1';

  const inputBase = `
    w-full rounded-xl px-3.5 py-2.5 text-sm
    border transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-[#00ff00]/30 focus:border-[#00ff00]/50
    placeholder:text-gray-600
    ${isDark
      ? 'bg-[#111111] border-gray-700/60 text-white'
      : 'bg-gray-50 border-gray-200 text-gray-900'}
  `;

  const handleSubmit = async () => {
    setError('');
    if (password.length < 6) return setError('Mínimo 6 caracteres');
    if (password !== confirm) return setError('Las contraseñas no coinciden');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la contraseña');
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`
          relative w-full max-w-sm mx-4 rounded-2xl shadow-2xl border
          transition-all duration-200 p-6
          ${isDark ? 'bg-[#1a1a1a] border-gray-800/80' : 'bg-white border-gray-200'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-[#00ff00]/0 via-[#00ff00]/50 to-[#00ff00]/0" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
              <LockIcon />
            </div>
            <h3 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Crear contraseña
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`
              p-1.5 rounded-lg transition-colors
              ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}
            `}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className={`text-sm mb-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Crea una contraseña para iniciar sesión también con tu email.
        </p>

        <div className="space-y-3">
          <div>
            <label className={`text-xs font-medium mb-1.5 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Nueva contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className={inputBase}
            />
          </div>
          <div>
            <label className={`text-xs font-medium mb-1.5 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              className={inputBase}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          {error && (
            <p className="text-red-400 text-xs flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className={`
              flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200
              ${isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10 border border-gray-700/60' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
            `}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-[#00ff00] hover:bg-[#00ee00] text-black py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loading ? <><SpinnerIcon /> Guardando...</> : 'Crear contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── LinkAccountsPanel ── */
interface LinkAccountsPanelProps {
  isDark: boolean;
}

export default function LinkAccountsPanel({ isDark }: LinkAccountsPanelProps) {
  const { user, linkGithubToCurrentUser, linkGoogleToCurrentUser } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const providers = user?.providers ?? [];
  const hasGoogle = providers.includes('google');
  const hasGithub = providers.includes('github');
  const hasPassword = providers.includes('password');
  const allLinked = hasGoogle && hasGithub && hasPassword;

  const accessToken =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') ?? '' : '';

  const cardBg = isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50';
  const cardBorder = isDark ? 'border-gray-800/80' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const divider = isDark ? 'border-gray-800/60' : 'border-gray-100';

  const notify = (msg: string, isError = false) => {
    isError ? setError(msg) : setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const handleLinkGithub = async () => {
    setError(''); setSuccess('');
    setLoadingGithub(true);
    try {
      await linkGithubToCurrentUser();
      notify('GitHub vinculado correctamente');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Error inesperado', true);
    } finally {
      setLoadingGithub(false);
    }
  };

  const handleLinkGoogle = async () => {
    setError(''); setSuccess('');
    setLoadingGoogle(true);
    try {
      await linkGoogleToCurrentUser();
      notify('Google vinculado correctamente');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Error inesperado', true);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handlePasswordSuccess = () => {
    setShowPasswordModal(false);
    notify('Contraseña creada correctamente');
    setTimeout(() => window.location.reload(), 1500);
  };

  /* Linked badge pill */
  const LinkedBadge = ({ label }: { label: string }) => (
    <div className={`
      flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium
      ${isDark ? 'bg-white/3 border-gray-800/60 text-gray-500' : 'bg-gray-50 border-gray-100 text-gray-400'}
    `}>
      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#00ff00]/20 text-[#00ff00]">
        <CheckIcon />
      </span>
      {label}
    </div>
  );

  return (
    <>
      <div className={`relative overflow-hidden border ${cardBorder} ${cardBg} rounded-2xl`}>
        {/* Accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00ff00]/0 via-[#00ff00]/30 to-[#00ff00]/0" />

        <div className="px-5 pt-5 pb-4">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
              <svg className={`w-3.5 h-3.5 ${textMuted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <span className={`text-sm font-semibold ${textPrimary}`}>Cuentas vinculadas</span>
          </div>

          {/* Feedback */}
          {success && (
            <div className="flex items-center gap-2 text-[#00ff00] text-xs mb-3 bg-[#00ff00]/5 border border-[#00ff00]/20 rounded-xl px-3 py-2">
              <CheckIcon />
              {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs mb-3 bg-red-500/5 border border-red-500/20 rounded-xl px-3 py-2">
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {allLinked ? (
            <div className="text-center py-3">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-[#00ff00] bg-[#00ff00]/8 border border-[#00ff00]/20 rounded-xl px-4 py-2">
                <CheckIcon />
                Todas las cuentas vinculadas
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Divider */}
              <div className={`border-t ${divider} mb-3`} />

              {hasGoogle ? (
                <LinkedBadge label="Google vinculado" />
              ) : (
                <button
                  onClick={handleLinkGoogle}
                  disabled={loadingGoogle}
                  className={`
                    w-full flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl
                    text-sm font-semibold transition-all duration-200 active:scale-[0.98]
                    bg-white hover:bg-gray-50 text-gray-900
                    border border-gray-200 shadow-sm
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {loadingGoogle ? <SpinnerIcon /> : <GoogleIcon />}
                  {loadingGoogle ? 'Vinculando...' : 'Vincular con Google'}
                </button>
              )}

              {hasGithub ? (
                <LinkedBadge label="GitHub vinculado" />
              ) : (
                <button
                  onClick={handleLinkGithub}
                  disabled={loadingGithub}
                  className={`
                    w-full flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl
                    text-sm font-semibold transition-all duration-200 active:scale-[0.98]
                    border disabled:opacity-50 disabled:cursor-not-allowed
                    ${isDark
                      ? 'bg-white/5 hover:bg-white/10 text-white border-gray-700/60'
                      : 'bg-gray-900 hover:bg-gray-800 text-white border-gray-800'}
                  `}
                >
                  {loadingGithub ? <SpinnerIcon /> : <GithubIcon />}
                  {loadingGithub ? 'Vinculando...' : 'Vincular con GitHub'}
                </button>
              )}

              {hasPassword ? (
                <LinkedBadge label="Contraseña configurada" />
              ) : (
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className={`
                    w-full flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl
                    text-sm font-semibold transition-all duration-200 active:scale-[0.98]
                    border
                    ${isDark
                      ? 'bg-white/5 hover:bg-white/10 text-white border-gray-700/60'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200'}
                  `}
                >
                  <LockIcon />
                  Vincular con contraseña
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <SetPasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={handlePasswordSuccess}
          accessToken={accessToken}
          isDark={isDark}
        />
      )}
    </>
  );
}