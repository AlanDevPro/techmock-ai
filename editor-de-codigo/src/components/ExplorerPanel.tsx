"use client";

import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileJson,
  FileType2,
  FileBox,
  RefreshCw,
  FilePlus,
  FolderPlus,
  Trash,
} from "lucide-react";
import { getWebContainer } from "@/lib/webcontainer";

interface ExplorerPanelProps {
  activeFile: string;
  onSelectFile: (file: string) => void;
  files: { [key: string]: string };
  onRefresh: () => void;
}

const getIcon = (filename: string) => {
  if (filename.endsWith(".vue"))
    return <FileCode size={14} className="text-green-400" />;
  if (filename.endsWith(".ts") || filename.endsWith(".tsx"))
    return <FileType2 size={14} className="text-blue-400" />;
  if (filename.endsWith(".js"))
    return <FileType2 size={14} className="text-yellow-400" />;
  if (filename.endsWith(".json"))
    return <FileJson size={14} className="text-yellow-200" />;
  if (filename.endsWith(".css"))
    return <FileBox size={14} className="text-blue-300" />;
  if (filename.endsWith(".html"))
    return <FileCode size={14} className="text-orange-400" />;
  return <FileBox size={14} className="text-gray-400" />;
};

type FileTreeData = { [key: string]: string | FileTreeData };

interface FileTreeProps {
  data: FileTreeData;
  level?: number;
  activeFile: string;
  onSelectFile: (file: string) => void;
  currentPath?: string;
  creating: { type: "file" | "folder"; dir: string } | null;
  onCreateSubmit: (name: string, type: "file" | "folder", dir: string) => void;
  onCreateCancel: () => void;
  selectedDir: string;
  onSelectDir: (dir: string) => void;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedFolders: Record<string, boolean>;
  onDeleteNode: (path: string) => void;
  onOpenContextMenu: (menu: { x: number; y: number; nodePath: string; key: string; isFolder: boolean }) => void;
  renaming: string | null;
  onRenameSubmit: (oldPath: string, newName: string) => void;
  onRenameCancel: () => void;
};

const FileTree = ({
  data,
  level = 0,
  activeFile,
  onSelectFile,
  currentPath = "",
  creating,
  onCreateSubmit,
  onCreateCancel,
  selectedDir,
  onSelectDir,
  setExpandedFolders,
  expandedFolders,
  onDeleteNode,
  onOpenContextMenu,
  renaming,
  onRenameSubmit,
  onRenameCancel,
}: FileTreeProps) => {
  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev: Record<string, boolean>) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    border: "1px solid var(--accent)",
    outline: "none",
    fontSize: "13px",
    padding: "0 4px",
  };

  return (
    <div className="flex flex-col w-full">
      {creating?.dir === currentPath && (
        <div
          className="flex items-center py-1 text-[13px]"
          style={{
            paddingLeft: `${level * 12 + 12}px`,
            background: "var(--bg-hover)",
          }}
        >
          <span className="mr-1">
            {creating.type === "folder" ? (
              <ChevronRight size={14} />
            ) : (
              getIcon("file.txt")
            )}
          </span>
          <input
            autoFocus
            style={inputStyle}
            className="flex-1 min-w-0 mr-2"
            onKeyDown={(e) => {
              if (e.key === "Enter")
                onCreateSubmit(e.currentTarget.value, creating.type, currentPath);
              else if (e.key === "Escape") onCreateCancel();
            }}
            onBlur={() => setTimeout(onCreateCancel, 200)}
          />
        </div>
      )}

      {Object.entries(data)
        .sort(([aKey, aVal], [bKey, bVal]) => {
          const aIsFolder = typeof aVal === "object";
          const bIsFolder = typeof bVal === "object";
          if (aIsFolder && !bIsFolder) return -1;
          if (!aIsFolder && bIsFolder) return 1;
          return aKey.localeCompare(bKey);
        })
        .map(([key, value]) => {
          const isFolder = typeof value === "object";
          const isExpanded = expandedFolders[key] !== false;
          const nodePath =
            currentPath === "" ? `/${key}` : `${currentPath}/${key}`;
          const isSelected =
            (!isFolder && activeFile === value) ||
            (isFolder && selectedDir === nodePath);
          const isRenaming = renaming === nodePath;

          return (
            <div key={key}>
              <div
                className="flex items-center py-1 cursor-pointer text-[13px] select-none group transition-colors"
                style={{
                  paddingLeft: `${level * 12 + 12}px`,
                  background: isSelected ? "var(--bg-hover)" : "transparent",
                  color: isSelected
                    ? "var(--text-heading)"
                    : "var(--text-primary)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isFolder) {
                    onSelectDir(nodePath);
                    toggleFolder(key);
                  } else {
                    onSelectDir(currentPath);
                    onSelectFile(value as string);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectDir(isFolder ? nodePath : currentPath);
                  onOpenContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    nodePath,
                    key,
                    isFolder,
                  });
                }}
              >
                <div className="flex items-center flex-1 min-w-0">
                  {isFolder ? (
                    <>
                      <span
                        className="mr-1 opacity-60 shrink-0"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </span>
                      {isRenaming ? (
                        <input
                          autoFocus
                          defaultValue={key}
                          style={inputStyle}
                          className="flex-1 min-w-0 mr-2"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              onRenameSubmit(nodePath, e.currentTarget.value);
                            if (e.key === "Escape") onRenameCancel();
                          }}
                          onBlur={() => setTimeout(onRenameCancel, 200)}
                        />
                      ) : (
                        <span
                          className="font-medium truncate"
                          style={{ color: "var(--text-heading)" }}
                        >
                          {key}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="mr-2 ml-3 shrink-0">{getIcon(key)}</span>
                      {isRenaming ? (
                        <input
                          autoFocus
                          defaultValue={key}
                          style={inputStyle}
                          className="flex-1 min-w-0 mr-2 w-full"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              onRenameSubmit(nodePath, e.currentTarget.value);
                            if (e.key === "Escape") onRenameCancel();
                          }}
                          onBlur={() => setTimeout(onRenameCancel, 200)}
                        />
                      ) : (
                        <span className="truncate">{key}</span>
                      )}
                    </>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(nodePath);
                  }}
                  className={`hidden group-hover:flex items-center justify-center shrink-0 px-1 hover:text-red-400 mr-2 opacity-50 hover:opacity-100 ${
                    isRenaming ? "!hidden" : ""
                  }`}
                  style={{ color: "var(--text-secondary)" }}
                  title={`Eliminar ${key}`}
                >
                  <Trash size={13} />
                </button>
              </div>

              {isFolder && isExpanded && (
                <FileTree
                  data={value}
                  level={level + 1}
                  activeFile={activeFile}
                  onSelectFile={onSelectFile}
                  currentPath={nodePath}
                  creating={creating}
                  onCreateSubmit={onCreateSubmit}
                  onCreateCancel={onCreateCancel}
                  selectedDir={selectedDir}
                  onSelectDir={onSelectDir}
                  setExpandedFolders={setExpandedFolders}
                  expandedFolders={expandedFolders}
                  onDeleteNode={onDeleteNode}
                  onOpenContextMenu={onOpenContextMenu}
                  renaming={renaming}
                  onRenameSubmit={onRenameSubmit}
                  onRenameCancel={onRenameCancel}
                />
              )}
            </div>
          );
        })}
    </div>
  );
};

export default function ExplorerPanel({
  activeFile,
  onSelectFile,
  files,
  onRefresh,
}: ExplorerPanelProps) {
  const [creating, setCreating] = useState<{
    type: "file" | "folder";
    dir: string;
  } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [selectedDir, setSelectedDir] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({});
  const [visibleRoot, setVisibleRoot] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodePath: string;
    key: string;
    isFolder: boolean;
  } | null>(null);
  const [clipboard, setClipboard] = useState<{ path: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const framework = params.get("framework");
    if (framework === "vuejs") setVisibleRoot("/practica-vue");
    if (framework === "nextjs") setVisibleRoot("/practica-nextjs");
  }, []);

  type TreeNode = { [key: string]: TreeNode | string };

  const buildTree = (filePaths: string[]) => {
    const root: TreeNode = {};
    for (const path of filePaths) {
      const parts = path.split("/").filter(Boolean);
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          if (files[path] === "DIRECTORY:") {
            if (!current[part]) current[part] = {};
          } else {
            current[part] = path;
          }
        } else {
          if (!current[part] || typeof current[part] === "string")
            current[part] = {};
          current = current[part];
        }
      }
    }
    return root;
  };

  const filePaths = Object.keys(files);
  const filteredPaths = visibleRoot
    ? filePaths.filter(
        (path) =>
          path === visibleRoot || path.startsWith(`${visibleRoot}/`)
      )
    : filePaths;
  const treeData = buildTree(filteredPaths);

  const handleCreateFile = () => {
    if (selectedDir !== "") {
      const parts = selectedDir.split("/").filter(Boolean);
      const folderName = parts[parts.length - 1];
      setExpandedFolders((prev) => ({ ...prev, [folderName]: true }));
    }
    setCreating({ type: "file", dir: selectedDir });
  };

  const handleCreateFolder = () => {
    if (selectedDir !== "") {
      const parts = selectedDir.split("/").filter(Boolean);
      const folderName = parts[parts.length - 1];
      setExpandedFolders((prev) => ({ ...prev, [folderName]: true }));
    }
    setCreating({ type: "folder", dir: selectedDir });
  };

  const handleCreateSubmit = async (
    name: string,
    type: "file" | "folder",
    dir: string
  ) => {
    if (!name.trim()) return;
    const container = getWebContainer();
    if (container) {
      const fullPath = dir ? `${dir}/${name}` : `/${name}`;
      try {
        if (type === "file") {
          await container.fs.writeFile(fullPath, "");
          onSelectFile(fullPath);
        } else {
          await container.fs.mkdir(fullPath, { recursive: true });
        }
        onRefresh();
      } catch (e) {
        console.error("Error creating item:", e);
      }
    }
    setCreating(null);
  };

  const handleDeleteNode = async (path: string) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar '${path}'? Esta acción no se puede deshacer.`
      )
    )
      return;
    const container = getWebContainer();
    if (container) {
      try {
        await container.fs.rm(path, { recursive: true });
        onRefresh();
      } catch (e) {
        console.error("Error deleting item", e);
      }
    }
  };

  const handleRenameSubmit = async (oldPath: string, newName: string) => {
    if (!newName.trim()) return;
    const parts = oldPath.split("/");
    const oldName = parts.pop();
    if (oldName === newName) {
      setRenaming(null);
      return;
    }
    const dir = parts.join("/");
    const newPath = dir ? `${dir}/${newName}` : `/${newName}`;
    const container = getWebContainer();
    if (container) {
      try {
        const process = await container.spawn("jsh", [
          "-c",
          `mv '${oldPath}' '${newPath}'`,
        ]);
        await process.exit;
        onRefresh();
        if (activeFile === oldPath) onSelectFile(newPath);
      } catch (e) {
        console.error("Error renaming", e);
      }
    }
    setRenaming(null);
  };

  const handleCopy = () => {
    if (contextMenu) setClipboard({ path: contextMenu.nodePath });
    setContextMenu(null);
  };

  const handlePaste = async () => {
    if (!clipboard || !contextMenu) return;
    const container = getWebContainer();
    if (container) {
      const destDir = contextMenu.isFolder
        ? contextMenu.nodePath
        : contextMenu.nodePath.substring(
            0,
            contextMenu.nodePath.lastIndexOf("/")
          );
      const fileName = clipboard.path.split("/").pop() || "";
      const cleanDest = destDir === "" ? "/" : destDir;
      try {
        let existingItems: string[] = [];
        try {
          const items = await container.fs.readdir(cleanDest, {
            withFileTypes: true,
          }) as Array<{ name: string }>;
          existingItems = items.map((i) => i.name);
        } catch {}
        let finalName = fileName;
        let counter = 1;
        while (existingItems.includes(finalName)) {
          const parts = fileName.split(".");
          const ext = parts.length > 1 ? "." + parts.pop() : "";
          const name = parts.join(".");
          finalName = `${name}_${counter}${ext}`;
          counter++;
        }
        const finalDest =
          cleanDest === "/" ? `/${finalName}` : `${cleanDest}/${finalName}`;
        const process = await container.spawn("jsh", [
          "-c",
          `cp -r '${clipboard.path}' '${finalDest}'`,
        ]);
        await process.exit;
        onRefresh();
      } catch (e) {
        console.error("Error pasting", e);
      }
    }
    setContextMenu(null);
  };

  const ctxMenuItemStyle: React.CSSProperties = {
    padding: "5px 20px",
    cursor: "pointer",
    fontSize: "13px",
    color: "var(--text-primary)",
  };

  return (
    <div
      className="h-full flex flex-col relative"
      style={{
        background: "var(--bg-secondary)",
      }}
      onClick={() => {
        setSelectedDir("");
        setContextMenu(null);
      }}
    >
      {/* Header */}
      <div
        className="h-9 flex items-center justify-between px-4 border-b shrink-0"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="uppercase text-[11px] font-bold tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCreateFile}
            className="p-1 rounded transition-opacity hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}
            title="Nuevo archivo"
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={handleCreateFolder}
            className="p-1 rounded transition-opacity hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}
            title="Nueva carpeta"
          >
            <FolderPlus size={14} />
          </button>
          <button
            onClick={onRefresh}
            className="p-1 rounded transition-opacity hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}
            title="Actualizar"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* File tree */}
      <div
        className="flex-1 overflow-y-auto pt-1 pb-4"
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            nodePath: "",
            key: "",
            isFolder: true,
          });
        }}
      >
        <FileTree
          data={treeData}
          activeFile={activeFile}
          onSelectFile={onSelectFile}
          currentPath=""
          creating={creating}
          onCreateSubmit={handleCreateSubmit}
          onCreateCancel={() => setCreating(null)}
          selectedDir={selectedDir}
          onSelectDir={setSelectedDir}
          setExpandedFolders={setExpandedFolders}
          expandedFolders={expandedFolders}
          onDeleteNode={handleDeleteNode}
          onOpenContextMenu={setContextMenu}
          renaming={renaming}
          onRenameSubmit={handleRenameSubmit}
          onRenameCancel={() => setRenaming(null)}
        />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="fixed z-50 rounded shadow-xl py-1 text-[13px] min-w-[160px] border"
            style={{
              top: contextMenu.y,
              left: contextMenu.x,
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.nodePath !== "" && (
              <div
                style={ctxMenuItemStyle}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "var(--accent)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "transparent")
                }
                onClick={() => {
                  setRenaming(contextMenu.nodePath);
                  setContextMenu(null);
                }}
              >
                Renombrar
              </div>
            )}
            {contextMenu.nodePath !== "" && (
              <div
                style={ctxMenuItemStyle}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "var(--accent)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "transparent")
                }
                onClick={handleCopy}
              >
                Copiar
              </div>
            )}
            <div
              style={{
                ...ctxMenuItemStyle,
                opacity: clipboard ? 1 : 0.5,
                cursor: clipboard ? "pointer" : "default",
              }}
              onMouseEnter={(e) => {
                if (clipboard)
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--accent)";
              }}
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "transparent")
              }
              onClick={() => clipboard && handlePaste()}
            >
              Pegar
            </div>
            {contextMenu.nodePath !== "" && (
              <>
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "4px 8px",
                  }}
                />
                <div
                  style={ctxMenuItemStyle}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "#7f1d1d")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "transparent")
                  }
                  onClick={() => {
                    handleDeleteNode(contextMenu.nodePath);
                    setContextMenu(null);
                  }}
                >
                  Eliminar
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}