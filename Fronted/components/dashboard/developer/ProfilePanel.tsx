// components/dashboard/developer/ProfilePanel.tsx
'use client';

import { useRouter } from 'next/navigation';
import { IconX } from '../shared/Icons';
import LinkAccountsPanel from '../shared/LinkAccountsPanel';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  displayName: string;
  displayEmail: string;
}

export default function ProfilePanel({
  isOpen,
  onClose,
  isDark,
  displayName,
  displayEmail,
}: ProfilePanelProps) {
  const router = useRouter();

  const panelBg = isDark ? 'bg-[#111111]' : 'bg-white';
  const borderColor = isDark ? 'border-gray-800/60' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50';
  const cardBorder = isDark ? 'border-gray-800/80' : 'border-gray-200';
  const dividerColor = isDark ? 'border-gray-800/60' : 'border-gray-100';

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 z-30 transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          ${isDark ? 'bg-black/40' : 'bg-black/10'} backdrop-blur-[2px]
        `}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          fixed top-14 right-0 h-[calc(100vh-56px)] z-40
          transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}
          w-80 border-l ${panelBg} ${borderColor} overflow-y-auto shadow-2xl
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${dividerColor}`}>
          <span className={`text-sm font-semibold tracking-wide ${textPrimary}`}>Mi cuenta</span>
          <button
            onClick={onClose}
            className={`
              p-1.5 rounded-lg transition-all duration-200
              ${isDark
                ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}
            `}
          >
            <IconX />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Profile Card */}
          <div
            className={`
              relative overflow-hidden border ${cardBorder} ${cardBg} rounded-2xl
              transition-all duration-200
            `}
          >
            {/* Subtle accent line top */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00ff00]/0 via-[#00ff00]/60 to-[#00ff00]/0" />

            <div className="px-5 pt-6 pb-5">
              {/* Avatar + info */}
              <div className="flex items-center gap-4 mb-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="
                      w-14 h-14 rounded-2xl flex items-center justify-center
                      bg-gradient-to-br from-[#00ff00]/20 to-[#00cc00]/10
                      border border-[#00ff00]/20
                    "
                  >
                    <span className="text-[#00ff00] font-bold text-xl tracking-tight">
                      {initials}
                    </span>
                  </div>
                  {/* Online dot */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00ff00] rounded-full border-2 border-[#1a1a1a]" />
                </div>

                {/* Name & email */}
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold truncate text-base leading-tight ${textPrimary}`}>
                    {displayName}
                  </h3>
                  {displayEmail && (
                    <p className={`text-xs truncate mt-0.5 ${textMuted}`}>{displayEmail}</p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className={`border-t ${dividerColor} mb-4`} />

              {/* CTA Button */}
              <button
                onClick={() => {
                  router.push('/dashboard/developer/profile');
                  onClose();
                }}
                className="
                  group w-full relative overflow-hidden
                  flex items-center justify-center gap-2
                  bg-[#00ff00] hover:bg-[#00ee00]
                  text-black font-semibold text-sm
                  py-2.5 rounded-xl
                  transition-all duration-200
                  active:scale-[0.98]
                "
              >
                <svg
                  className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-[1px]"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                </svg>
                Mi perfil
              </button>
            </div>
          </div>

          {/* Link Accounts */}
          <LinkAccountsPanel isDark={isDark} />
        </div>
      </div>
    </>
  );
}