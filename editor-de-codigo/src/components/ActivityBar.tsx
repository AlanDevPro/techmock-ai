"use client";

import { useState } from "react";
import {
  Files,
  Search,
  Settings,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export type ActivityView = "problem" | "explorer" | "search" | "settings";

const navItems = [
  { icon: BookOpen, label: "Problem", id: "problem" as const },
  { icon: Files, label: "Explorer", id: "explorer" as const },
  { icon: Search, label: "Search", id: "search" as const },
];

const bottomItems = [
  { icon: Settings, label: "Settings", id: "settings" as const },
];

interface ActivityBarProps {
  activeView: ActivityView;
  onViewChange: (view: ActivityView) => void;
}

export default function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  const Item = ({
    icon: Icon,
    label,
    id,
  }: {
    icon: LucideIcon;
    label: string;
    id: ActivityView;
  }) => {
    const isActive = activeView === id;
    return (
      <button
        onClick={() => onViewChange(id)}
        title={label}
        className="relative w-full flex flex-col items-center justify-center py-3 gap-1 transition-all group"
        style={{
          borderLeft: isActive
            ? "2px solid var(--accent)"
            : "2px solid transparent",
          color: isActive ? "var(--text-heading)" : "var(--text-secondary)",
          background: isActive ? "var(--bg-hover)" : "transparent",
        }}
      >
        <Icon size={22} strokeWidth={1.5} />
        <span
          className="uppercase tracking-wider font-semibold leading-none opacity-80"
          style={{ fontSize: "9px" }}
        >
          {label}
        </span>
        {/* Tooltip al hacer hover */}
        <span
          className="absolute left-full ml-2 px-2 py-1 rounded text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg"
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <div
      className="w-14 flex flex-col items-center justify-between pb-2 pt-1 shrink-0 border-r"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border)",
      }}
    >
      {/* Items superiores */}
      <div className="flex flex-col w-full">
        {navItems.map((item) => (
          <Item key={item.id} {...item} />
        ))}
      </div>

      {/* Items inferiores */}
      <div className="flex flex-col w-full">
        {bottomItems.map((item) => (
          <Item key={item.id} {...item} />
        ))}
      </div>
    </div>
  );
}