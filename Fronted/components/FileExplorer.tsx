// src/components/FileExplorer.tsx
import { useState } from "react";
import { useStore } from "../store/useStore";
import { useTheme } from "../hooks/useTheme";
import { addNode } from "../utils/tree";

interface TreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  language?: string;
  children?: TreeNode[];
  collapsed?: boolean;
}

interface TabNode {
  fileId: string;
  name: string;
  content: string;
  language: string;
}

interface CreatingNode {
  parentId: string;
  type: "file" | "folder";
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Iconos de archivo con color (como VSCode) ──────────────────────────────
const FILE_ICON_MAP: Record<string, { bg: string; label: string }> = {
  js:   { bg: "#f0d040", label: "JS" },
  jsx:  { bg: "#61dafb", label: "JSX" },
  ts:   { bg: "#007acc", label: "TS" },
  tsx:  { bg: "#007acc", label: "TSX" },
  css:  { bg: "#e879a0", label: "#" },
  json: { bg: "#f7c948", label: "{}" },
  md:   { bg: "#4fa6db", label: "i" },
  html: { bg: "#e76b38", label: "</>" },
};

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop() ?? "";
  const info = FILE_ICON_MAP[ext];
  if (!info) return <span style={{ width: 16, display: "inline-block" }} />;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 16, height: 16, background: info.bg, borderRadius: 2,
      fontSize: 8, fontWeight: 700, color: "#1e1e1e", flexShrink: 0,
    }}>
      {info.label}
    </span>
  );
}

// ── Iconos SVG inline ──────────────────────────────────────────────────────
const IconDescription = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="7" y1="8" x2="17" y2="8"/>
    <line x1="7" y1="12" x2="17" y2="12"/>
    <line x1="7" y1="16" x2="13" y2="16"/>
  </svg>
);

const IconExplorer = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const IconSearch = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconExtensions = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const IconSettings = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

// ── Sidebar icons pequeños ──────────────────────────────────────────────────
const SmallIcon = ({ path, title }: { path: string; title: string }) => {
  const t = useTheme();
  return (
    <button
      title={title}
      style={{
        background: "transparent", border: "none", cursor: "pointer",
        color: t.textMuted, padding: "2px 3px", borderRadius: 3,
        display: "flex", alignItems: "center",
      }}
      onMouseEnter={e => (e.currentTarget.style.color = t.text)}
      onMouseLeave={e => (e.currentTarget.style.color = t.textMuted)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={path} />
      </svg>
    </button>
  );
};

// ── Nodo del árbol de archivos ─────────────────────────────────────────────
function Node({ node, depth = 0, selectedId, setSelectedId, creating, setCreating }: { node: TreeNode; depth?: number; selectedId: string | null; setSelectedId: (id: string) => void; creating: CreatingNode | null; setCreating: (val: CreatingNode | null) => void }) {
  const { tree, setTree, openTabs, setOpenTabs, setActiveTabId } = useStore();
  const t = useTheme();
  const [open, setOpen] = useState(!node.collapsed);
  const [editingName, setEditingName] = useState("");
  const isSelected = selectedId === node.id;

  const openFile = () => {
    if (node.type !== "file") return;
    if (!openTabs.find((tab: TabNode) => tab.fileId === node.id)) {
      setOpenTabs([...openTabs, {
        fileId: node.id, name: node.name,
        content: node.content || "", language: node.language || "javascript",
      }]);
    }
    setActiveTabId(node.id);
  };

  const rowStyle: React.CSSProperties = {
    paddingLeft: depth * 12 + (node.type === "folder" ? 8 : 20),
    paddingRight: 8,
    height: 22,
    cursor: "pointer",
    background: isSelected ? "#094771" : "transparent",
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 13,
    color: t.text,
    fontFamily: t.fontUI,
    whiteSpace: "nowrap",
    overflow: "hidden",
    borderLeft: isSelected ? `2px solid #007acc` : "2px solid transparent",
  };

  return (
    <div>
      <div
        style={rowStyle}
        onClick={() => {
          setSelectedId(node.id);
          if (node.type === "folder") setOpen(o => !o);
          else openFile();
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#2a2d2e"; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
      >
        {node.type === "folder" && (
          <span style={{ fontSize: 9, color: "#858585", width: 12, flexShrink: 0 }}>
            {open ? "▼" : "▶"}
          </span>
        )}
        <span style={{ fontSize: 13, flexShrink: 0 }}>
          {node.type === "folder" ? (open ? "📂" : "📁") : <FileIcon name={node.name} />}
        </span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {node.name}
        </span>
        {isSelected && node.type === "folder" && (
          <span style={{ display: "flex", gap: 2, marginLeft: "auto", flexShrink: 0 }}>
            {[
              { icon: "📄", type: "file" },
              { icon: "📁", type: "folder" },
            ].map(({ icon, type }) => (
              <button
                key={type}
                onClick={e => { e.stopPropagation(); setCreating({ parentId: node.id, type }); }}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 12, padding: "0 2px", color: t.textMuted }}
              >
                {icon}
              </button>
            ))}
          </span>
        )}
      </div>

      {creating?.parentId === node.id && (
        <div style={{ paddingLeft: (depth + 1) * 12 + 8 }}>
          <input
            autoFocus
            placeholder={creating.type === "file" ? "archivo.js" : "nombre carpeta"}
            value={editingName}
            onChange={e => setEditingName(e.target.value)}
            style={{
              background: t.bgInput, border: `1px solid ${t.borderActive}`,
              color: t.text, padding: "2px 6px", fontSize: 12,
              width: "80%", outline: "none", borderRadius: 2, fontFamily: t.fontUI,
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && editingName) {
                const newNode = {
                  id: uid(), name: editingName, type: creating.type,
                  ...(creating.type === "file"
                    ? { content: "", language: "javascript" }
                    : { children: [] }),
                };
                setTree(addNode(tree, node.id, newNode));
                setCreating(null); setEditingName("");
              }
              if (e.key === "Escape") { setCreating(null); setEditingName(""); }
            }}
          />
        </div>
      )}

      {node.type === "folder" && open && node.children?.map((child: TreeNode) => (
        <Node key={child.id} node={child} depth={depth + 1}
          selectedId={selectedId} setSelectedId={setSelectedId}
          creating={creating} setCreating={setCreating} />
      ))}
    </div>
  );
}

// ── Panel: Enunciado del problema ──────────────────────────────────────────
function ProblemPanel() {
  return (
    <div style={{ padding: 16, overflowY: "auto", height: "100%", color: "#cccccc", fontFamily: "Segoe UI, sans-serif" }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#858585", textTransform: "uppercase", marginBottom: 14 }}>
        Question Description
      </p>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#e8e8e8", marginBottom: 10 }}>
        Item List Manager
      </h1>
      <p style={{ fontSize: 13, color: "#cccccc", lineHeight: 1.7, marginBottom: 16 }}>
        You are tasked with creating a simple React application called "Item List Manager" that displays
        a list of items and allows users to add new items to the list. The items will be displayed in an
        unordered list (<code style={{ background: "#3c3c3c", padding: "1px 5px", borderRadius: 3, fontFamily: "monospace", fontSize: 12, color: "#ce9178" }}>&lt;ul&gt;</code>),
        and there will be an input field along with a button to add new items.
      </p>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e8e8e8", marginBottom: 8 }}>Detailed Requirements</h3>
      <ol style={{ fontSize: 13, color: "#cccccc", lineHeight: 1.8, paddingLeft: 18 }}>
        <li>Display an <code style={{ background: "#3c3c3c", padding: "1px 4px", borderRadius: 3, fontFamily: "monospace", fontSize: 12, color: "#ce9178" }}>&lt;h1&gt;</code> heading "Item List".</li>
        <li>Render a <code style={{ background: "#3c3c3c", padding: "1px 4px", borderRadius: 3, fontFamily: "monospace", fontSize: 12, color: "#ce9178" }}>&lt;ul&gt;</code> showing all current items.</li>
        <li>Include an <code style={{ background: "#3c3c3c", padding: "1px 4px", borderRadius: 3, fontFamily: "monospace", fontSize: 12, color: "#ce9178" }}>&lt;input&gt;</code> field para ingresar nuevos items.</li>
        <li>Botón "Add Item" que agrega el valor al listado.</li>
        <li>Limpiar el input después de agregar.</li>
      </ol>
    </div>
  );
}

// ── Barra de actividad lateral ─────────────────────────────────────────────
type SideTab = "problem" | "explorer" | "search" | "extensions";

function ActivityBar({ active, onChange }: { active: SideTab; onChange: (t: SideTab) => void }) {
  const t = useTheme();

  const btnStyle = (id: SideTab): React.CSSProperties => ({
    width: 48, height: 48,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", background: "transparent", border: "none",
    color: active === id ? "#ffffff" : "#858585",
    borderLeft: active === id ? "2px solid #007acc" : "2px solid transparent",
    transition: "color 0.1s",
  });

  return (
    <div style={{
      width: 48, background: "#333333", display: "flex", flexDirection: "column",
      alignItems: "center", paddingTop: 8, flexShrink: 0, borderRight: `1px solid ${t.border}`,
    }}>
      {([
        { id: "problem",    Icon: IconDescription },
        { id: "explorer",   Icon: IconExplorer },
        { id: "search",     Icon: IconSearch },
        { id: "extensions", Icon: IconExtensions },
      ] as const).map(({ id, Icon }) => (
        <button
          key={id}
          style={btnStyle(id)}
          onClick={() => onChange(id)}
          onMouseEnter={e => { if (active !== id) e.currentTarget.style.color = "#cccccc"; }}
          onMouseLeave={e => { if (active !== id) e.currentTarget.style.color = "#858585"; }}
        >
          <Icon />
        </button>
      ))}

      <div style={{ flex: 1 }} />
      <button style={{ ...btnStyle("extensions"), marginBottom: 8 }}>
        <IconSettings />
      </button>
    </div>
  );
}

// ── Barra de menú superior ─────────────────────────────────────────────────
function TopMenuBar() {
  const t = useTheme();
  const menuItems = ["Edit", "Selection", "View", "Go"];

  const logoStyle: React.CSSProperties = {
    width: 22, height: 22, background: "#007acc", borderRadius: 2,
    display: "flex", alignItems: "center", justifyContent: "center",
    marginRight: 10, flexShrink: 0,
  };

  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: "#3c3c3c", height: 30, padding: "0 8px",
      flexShrink: 0, borderBottom: `1px solid #252526`,
    }}>
      <div style={logoStyle}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="white">
          <path d="M1 3l5 5-5 5 1.5 1.5L8 9.5l5.5 5L15 13l-5-5 5-5L13.5 1.5 8 6.5 2.5 1.5z" />
        </svg>
      </div>

      {menuItems.map(item => (
        <button
          key={item}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "#cccccc", fontSize: 13, padding: "0 8px", height: 30,
            borderRadius: 3, fontFamily: t.fontUI,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          {item}
        </button>
      ))}

      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
        {["←", "→"].map(arrow => (
          <button key={arrow} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "#858585", fontSize: 14, width: 26, height: 22,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 3,
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "#ccc"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#858585"; e.currentTarget.style.background = "transparent"; }}
          >
            {arrow}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sidebar wrapper ────────────────────────────────────────────────────────
function Sidebar({ activeTab, tree, selectedId, setSelectedId, creating, setCreating, setTree }: { activeTab: SideTab; tree: TreeNode[]; selectedId: string | null; setSelectedId: (id: string) => void; creating: CreatingNode | null; setCreating: (val: CreatingNode | null) => void; setTree: (tree: any) => void }) {
  const t = useTheme();

  const sidebarTitles: Record<SideTab, string> = {
    problem: "QUESTION DESCRIPTION",
    explorer: "EXPLORER: PROJECTS",
    search: "SEARCH",
    extensions: "EXTENSIONS",
  };

  return (
    <div style={{
      width: 240, background: t.bgSidebar, display: "flex", flexDirection: "column",
      flexShrink: 0, borderRight: `1px solid #1e1e1e`, overflow: "hidden",
    }}>
      <div style={{
        height: 35, background: t.bgPanel, borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 8px", flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: t.textMuted, textTransform: "uppercase", fontFamily: t.fontUI }}>
          {sidebarTitles[activeTab as SideTab]}
        </span>
        {activeTab === "explorer" && (
          <div style={{ display: "flex", gap: 2 }}>
            <SmallIcon title="New File"    path="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15h6" />
            <SmallIcon title="New Folder"  path="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2zM12 11v6M9 14h6" />
            <SmallIcon title="Refresh"     path="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            <SmallIcon title="Collapse"    path="M4 14l6-6 6 6" />
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "explorer" ? (
          tree.map((node: TreeNode) => (
            <Node key={node.id} node={node}
              selectedId={selectedId} setSelectedId={setSelectedId}
              creating={creating} setCreating={setCreating} />
          ))
        ) : activeTab === "problem" ? (
          <div style={{ padding: "10px", fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
            Vista previa disponible en el panel principal.
          </div>
        ) : (
          <div style={{ padding: "10px", fontSize: 12, color: t.textMuted }}>
            Próximamente...
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function FileExplorer() {
  const { tree, setTree } = useStore();
  const t = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState<CreatingNode | null>(null);
  const [activeTab, setActiveTab] = useState<SideTab>("problem");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Barra de menú superior */}
      <TopMenuBar />

      {/* Cuerpo principal */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Barra de actividad */}
        <ActivityBar active={activeTab} onChange={setActiveTab} />

        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          tree={tree}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          creating={creating}
          setCreating={setCreating}
          setTree={setTree}
        />

        
      </div>
    </div>
  );
}