import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, FileJson, FileType2, FileBox, RefreshCw, FilePlus, FolderPlus, Trash } from 'lucide-react';
import { getWebContainer } from '@/lib/webcontainer';

interface SidebarProps {
  activeFile: string;
  onSelectFile: (file: string) => void;
  files: { [key: string]: string };
  onRefresh: () => void;
}

const getIcon = (filename: string) => {
  if (filename.endsWith('.vue')) return <FileCode size={16} className="text-green-400" />;
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return <FileType2 size={16} className="text-blue-400" />;
  if (filename.endsWith('.js')) return <FileType2 size={16} className="text-yellow-400" />;
  if (filename.endsWith('.json')) return <FileJson size={16} className="text-yellow-200" />;
  if (filename.endsWith('.css')) return <FileBox size={16} className="text-blue-300" />;
  if (filename.endsWith('.html')) return <FileCode size={16} className="text-orange-400" />;
  return <FileBox size={16} className="text-gray-400" />;
};

const FileTree = ({ data, level = 0, activeFile, onSelectFile, currentPath = "", creating, onCreateSubmit, onCreateCancel, selectedDir, onSelectDir, setExpandedFolders, expandedFolders, onDeleteNode, onOpenContextMenu, renaming, onRenameSubmit, onRenameCancel }: any) => {

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev: any) => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  return (
    <div className="flex flex-col w-full">
      {creating?.dir === currentPath && (
        <div className="flex items-center py-1 text-[13px] bg-[#37373d]" style={{ paddingLeft: `${(level * 12) + 12}px` }}>
          <span className="mr-1">
             {creating.type === 'folder' ? <ChevronRight size={16} /> : getIcon('file.txt')}
          </span>
          <input 
            autoFocus
            className="flex-1 min-w-0 bg-[#252526] text-[#cccccc] border border-[#007acc] outline-none text-[13px] mr-2 px-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onCreateSubmit(e.currentTarget.value, creating.type, currentPath);
              } else if (e.key === 'Escape') {
                onCreateCancel();
              }
            }}
            onBlur={() => {
              setTimeout(onCreateCancel, 200);
            }}
          />
        </div>
      )}
      {Object.entries(data).sort(([aDesc, aVal], [bDesc, bVal]) => {
         const aIsFolder = typeof aVal === 'object';
         const bIsFolder = typeof bVal === 'object';
         if (aIsFolder && !bIsFolder) return -1;
         if (!aIsFolder && bIsFolder) return 1;
         return aDesc.localeCompare(bDesc);
      }).map(([key, value]) => {
        const isFolder = typeof value === 'object';
        const isExpanded = expandedFolders[key] !== false; 
        const nodePath = currentPath === "" ? `/${key}` : `${currentPath}/${key}`;

        const isSelected = (!isFolder && activeFile === value) || (isFolder && selectedDir === nodePath);
        const isRenaming = renaming === nodePath;

        return (
          <div key={key}>
            <div 
              className={`flex items-center py-1 cursor-pointer text-[13px] select-none hover:bg-[#2a2d2e] group ${isSelected ? 'bg-[#37373d] text-white' : 'text-[#cccccc]'}`}
              style={{ paddingLeft: `${(level * 12) + 12}px` }}
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
                onOpenContextMenu({ x: e.clientX, y: e.clientY, nodePath, key, isFolder });
              }}
            >
              <div className="flex items-center flex-1 min-w-0">
                {isFolder ? (
                  <>
                    <span className="mr-1 opacity-80 shrink-0">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                    {isRenaming ? (
                      <input 
                        autoFocus
                        defaultValue={key}
                        className="flex-1 min-w-0 bg-[#252526] text-[#cccccc] border border-[#007acc] outline-none text-[13px] mr-2 px-1"
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => {
                          if (e.key === 'Enter') onRenameSubmit(nodePath, e.currentTarget.value);
                          if (e.key === 'Escape') onRenameCancel();
                        }}
                        onBlur={() => setTimeout(onRenameCancel, 200)}
                      />
                    ) : (
                      <span className="font-medium text-[#e8e8e8] truncate">{key}</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="mr-2 ml-3 shrink-0">{getIcon(key)}</span>
                    {isRenaming ? (
                      <input 
                        autoFocus
                        defaultValue={key}
                        className="flex-1 min-w-0 bg-[#252526] text-[#cccccc] border border-[#007acc] outline-none text-[13px] mr-2 px-1 w-full"
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => {
                          if (e.key === 'Enter') onRenameSubmit(nodePath, e.currentTarget.value);
                          if (e.key === 'Escape') onRenameCancel();
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
                className={`hidden group-hover:flex items-center justify-center shrink-0 px-1 hover:text-red-400 mr-2 opacity-50 hover:opacity-100 ${isRenaming ? '!hidden' : ''}`}
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

export default function Sidebar({ activeFile, onSelectFile, files, onRefresh }: SidebarProps) {
  const [creating, setCreating] = useState<{ type: 'file' | 'folder', dir: string } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [selectedDir, setSelectedDir] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [visibleRoot, setVisibleRoot] = useState<string | null>(null);
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodePath: string, key: string, isFolder: boolean } | null>(null);
  const [clipboard, setClipboard] = useState<{ path: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const framework = params.get('framework');
    if (framework === 'vuejs') setVisibleRoot('/practica-vue');
    if (framework === 'nextjs') setVisibleRoot('/practica-nextjs');
  }, []);

  const buildTree = (filePaths: string[]) => {
    const root: any = {};
    for (const path of filePaths) {
      const parts = path.split('/').filter(Boolean);
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
          if (!current[part] || typeof current[part] === 'string') current[part] = {};
          current = current[part];
        }
      }
    }
    return root;
  };

  const filePaths = Object.keys(files);
  const filteredPaths = visibleRoot
    ? filePaths.filter((path) => path === visibleRoot || path.startsWith(`${visibleRoot}/`))
    : filePaths;
  const treeData = buildTree(filteredPaths);

  const handleCreateFile = () => {
    if (selectedDir !== "") {
      const parts = selectedDir.split('/').filter(Boolean);
      const folderName = parts[parts.length - 1];
      setExpandedFolders(prev => ({ ...prev, [folderName]: true }));
    }
    setCreating({ type: 'file', dir: selectedDir });
  };

  const handleCreateFolder = () => {
    if (selectedDir !== "") {
      const parts = selectedDir.split('/').filter(Boolean);
      const folderName = parts[parts.length - 1];
      setExpandedFolders(prev => ({ ...prev, [folderName]: true }));
    }
    setCreating({ type: 'folder', dir: selectedDir });
  };

  const handleCreateSubmit = async (name: string, type: 'file' | 'folder', dir: string) => {
    if (!name.trim()) return;
    const container = getWebContainer();
    if (container) {
       const fullPath = dir ? `${dir}/${name}` : `/${name}`;
       try {
         if (type === 'file') {
            await container.fs.writeFile(fullPath, '');
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
    if (!window.confirm(`¿Estás seguro de eliminar '${path}'? Esta acción no se puede deshacer.`)) return;
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
    const parts = oldPath.split('/');
    const oldName = parts.pop();
    if (oldName === newName) {
      setRenaming(null);
      return;
    }
    const dir = parts.join('/');
    const newPath = dir ? `${dir}/${newName}` : `/${newName}`;
    
    const container = getWebContainer();
    if (container) {
      try {
        const process = await container.spawn('jsh', ['-c', `mv '${oldPath}' '${newPath}'`]);
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
      const destDir = contextMenu.isFolder ? contextMenu.nodePath : contextMenu.nodePath.substring(0, contextMenu.nodePath.lastIndexOf('/'));
      const fileName = clipboard.path.split('/').pop() || "";
      const cleanDest = destDir === "" ? "/" : destDir;
      
      try {
        let existingItems = [];
        try {
           const items = await container.fs.readdir(cleanDest, { withFileTypes: true });
           existingItems = items.map((i: any) => i.name);
        } catch (e) {
           // Directory might not exist or be unreadable
        }
        
        let finalName = fileName;
        let counter = 1;
        while (existingItems.includes(finalName)) {
           const parts = fileName.split('.');
           const ext = parts.length > 1 ? '.' + parts.pop() : '';
           const name = parts.join('.');
           finalName = `${name}_${counter}${ext}`;
           counter++;
        }
        
        const finalDest = cleanDest === "/" ? `/${finalName}` : `${cleanDest}/${finalName}`;
        
        const process = await container.spawn('jsh', ['-c', `cp -r '${clipboard.path}' '${finalDest}'`]);
        await process.exit;
        onRefresh();
      } catch (e) {
        console.error("Error pasting", e);
      }
    }
    setContextMenu(null);
  };

  return (
    <div className="w-64 bg-[#252526] border-r border-[#3c3c3c] flex flex-col shrink-0 relative" onClick={() => { setSelectedDir(""); setContextMenu(null); }}>
      <div className="h-9 flex items-center justify-between px-4 text-[#cccccc]" onClick={(e) => e.stopPropagation()}>
        <span className="uppercase text-[11px] font-semibold tracking-wider">Explorer</span>
        <div className="flex items-center gap-1">
          <button onClick={handleCreateFile} className="hover:text-white hover:bg-[#3c3c3c] p-1 rounded" title="Nuevo archivo">
             <FilePlus size={14} />
          </button>
          <button onClick={handleCreateFolder} className="hover:text-white hover:bg-[#3c3c3c] p-1 rounded" title="Nueva carpeta">
             <FolderPlus size={14} />
          </button>
          <button onClick={onRefresh} className="hover:text-white hover:bg-[#3c3c3c] p-1 rounded" title="Refresh files">
             <RefreshCw size={14} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pt-2 pb-4" onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, nodePath: "", key: "", isFolder: true }); }}>
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

      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setContextMenu(null)} 
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} 
          />
          <div 
            className="fixed z-50 bg-[#252526] border border-[#454545] rounded shadow-xl py-1 text-[#cccccc] text-[13px] min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.nodePath !== "" && (
              <div className="px-5 py-[5px] hover:bg-[#04395e] hover:text-white cursor-pointer" onClick={() => { setRenaming(contextMenu.nodePath); setContextMenu(null); }}>
                 Renombrar
              </div>
            )}
            {contextMenu.nodePath !== "" && (
              <div className="px-5 py-[5px] hover:bg-[#04395e] hover:text-white cursor-pointer" onClick={handleCopy}>
                 Copiar
              </div>
            )}
            <div className={`px-5 py-[5px] cursor-pointer ${clipboard ? 'hover:bg-[#04395e] hover:text-white' : 'opacity-50'}`} onClick={() => clipboard && handlePaste()}>
               Pegar
            </div>
            {contextMenu.nodePath !== "" && (
              <>
                <div className="h-[1px] bg-[#454545] my-1 mx-2" />
                <div className="px-5 py-[5px] hover:bg-[#04395e] hover:text-white cursor-pointer" onClick={() => { handleDeleteNode(contextMenu.nodePath); setContextMenu(null); }}>
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
