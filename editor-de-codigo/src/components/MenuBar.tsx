"use client";

import { useState, useRef, useEffect } from "react";
import type { Theme } from "./IDE";

interface MenuItem {
  label: string;
  items: { label: string; shortcut?: string; separator?: boolean }[];
}

const MENUS: MenuItem[] = [
  {
    label: "Edit",
    items: [
      { label: "Undo", shortcut: "Ctrl+Z" },
      { label: "Redo", shortcut: "Ctrl+Y" },
      { label: "", separator: true },
      { label: "Cut", shortcut: "Ctrl+X" },
      { label: "Copy", shortcut: "Ctrl+C" },
      { label: "Paste", shortcut: "Ctrl+V" },
      { label: "", separator: true },
      { label: "Find", shortcut: "Ctrl+F" },
      { label: "Replace", shortcut: "Ctrl+H" },
    ],
  },
  {
    label: "Selection",
    items: [
      { label: "Select All", shortcut: "Ctrl+A" },
      { label: "Expand Selection", shortcut: "Alt+Shift+→" },
      { label: "Shrink Selection", shortcut: "Alt+Shift+←" },
    ],
  },
  {
    label: "View",
    items: [
      { label: "Toggle Sidebar", shortcut: "Ctrl+B" },
      { label: "Toggle Terminal", shortcut: "Ctrl+`" },
      { label: "Toggle Preview" },
      { label: "", separator: true },
      { label: "Zoom In", shortcut: "Ctrl+=" },
      { label: "Zoom Out", shortcut: "Ctrl+-" },
    ],
  },
  {
    label: "Go",
    items: [
      { label: "Go to File", shortcut: "Ctrl+P" },
      { label: "Go to Line", shortcut: "Ctrl+G" },
      { label: "Go to Symbol", shortcut: "Ctrl+Shift+O" },
    ],
  },
];

export default function MenuBar({ theme }: { theme: Theme }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div
      ref={ref}
      className="flex items-center h-[24px] px-2 shrink-0 relative z-30 select-none"
      style={{
        background: "var(--bg-topbar)",
        borderBottom: "1px solid var(--border)",
        color: "var(--text-muted)",
        fontSize: 12,
      }}
    >
      {MENUS.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            className="px-3 h-full rounded flex items-center transition-colors"
            style={{
              height: 24,
              color: openMenu === menu.label ? "var(--text-heading)" : "var(--text-muted)",
              background: openMenu === menu.label ? "var(--menu-hover)" : "transparent",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "var(--text-heading)";
              e.currentTarget.style.background = "var(--menu-hover)";
              if (openMenu) setOpenMenu(menu.label);
            }}
            onMouseLeave={e => {
              if (openMenu !== menu.label) {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "transparent";
              }
            }}
            onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
          >
            {menu.label}
          </button>

          {openMenu === menu.label && (
            <div
              className="absolute top-full left-0 mt-0 rounded shadow-2xl py-1 min-w-[200px] z-50"
              style={{
                background: "var(--context-bg)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {menu.items.map((item, i) =>
                item.separator ? (
                  <div key={i} className="my-1 mx-2" style={{ height: 1, background: "var(--border)" }} />
                ) : (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-4 py-1.5 cursor-pointer transition-colors"
                    style={{ fontSize: 12 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--context-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => setOpenMenu(null)}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 24 }}>
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}