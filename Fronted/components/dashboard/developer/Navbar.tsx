// components/dashboard/developer/Navbar.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  IconSearch,
  IconSun,
  IconMoon,
  IconChevronDown,
} from '../shared/Icons';
import NotificationsDropdown from './NotificationsDropdown';

export interface NavItem {
  label: string;
  href: string;
}

export const developerNavItems: NavItem[] = [
  { label: 'Prepare', href: '/dashboard/developer' },
  { label: 'Certify', href: '/dashboard/developer/progress' },
  { label: 'Compete', href: '/dashboard/developer/rankings' },
];

interface NavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  displayName: string;
  displayEmail: string;
  onProfileClick: () => void;
  isPanelOpen: boolean;
}

export default function DeveloperNavbar({
  isDark,
  onToggleTheme,
  displayName,
  displayEmail,
  onProfileClick,
  isPanelOpen,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState('');

  const bg = isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const searchBg = isDark ? 'bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400';
  const iconHover = isDark ? 'hover:text-white hover:bg-gray-800' : 'hover:text-gray-900 hover:bg-gray-100';

  const getActiveTab = () => {
    const activeItem = developerNavItems.find(item => pathname === item.href);
    return activeItem?.label || 'Prepare';
  };

  const activeTab = getActiveTab();

  return (
    <nav className={`sticky top-0 z-50 border-b ${bg} transition-colors duration-200`}>
      <div className="flex items-center h-14 px-6 gap-4">
        {/* Logo */}
        <div 
          className="flex items-center gap-1 mr-4 shrink-0 cursor-pointer"
          onClick={() => router.push('/dashboard/developer')}
        >
          <span className={`text-xl font-extrabold tracking-tight ${textPrimary}`}>TechMock</span>
          <span className="w-3 h-3 rounded-sm bg-[#00ff00] inline-block ml-0.5 mb-0.5" />
        </div>

        {/* Nav tabs */}
        <div className="flex items-center gap-1">
          {developerNavItems.map((item) => {
            const isActive = activeTab === item.label;
            return (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors relative ${
                  isActive
                    ? `${textPrimary} after:absolute after:bottom-[-17px] after:left-0 after:right-0 after:h-[2px] after:bg-[#00ff00]`
                    : `${textMuted} ${iconHover}`
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search bar */}
        <div className="relative hidden md:block">
          <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`}>
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={`pl-9 pr-4 py-1.5 rounded-full text-sm border w-56 outline-none focus:ring-1 focus:ring-[#00ff00] transition ${searchBg}`}
          />
        </div>

        {/* Icon actions */}
        <div className="flex items-center gap-1">
          {/* ✅ Notificaciones con dropdown */}
          <NotificationsDropdown isDark={isDark} />

          {/* Toggle tema */}
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-full ${textMuted} ${iconHover} transition-colors`}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <IconSun /> : <IconMoon />}
          </button>

          {/* Perfil */}
          <button
            onClick={onProfileClick}
            className={`flex items-center gap-1.5 ml-1 p-1 rounded-full transition-colors ${
              isPanelOpen ? 'ring-2 ring-[#00ff00]' : `${iconHover}`
            }`}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#00ff00] to-green-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-black font-bold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className={`text-sm font-medium ${textPrimary} hidden sm:block max-w-[80px] truncate`}>
              {displayName}
            </span>
            <span className={textMuted}>
              <IconChevronDown />
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}