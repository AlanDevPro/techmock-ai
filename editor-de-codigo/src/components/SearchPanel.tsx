"use client";

import { useState, useEffect } from "react";
import { Search, FileCode, X, ChevronDown, ChevronRight } from "lucide-react";

interface SearchResult {
  file: string;
  line: number;
  content: string;
  matchStart: number;
  matchEnd: number;
}

interface SearchPanelProps {
  files: { [key: string]: string };
  onSelectFile: (file: string, line?: number) => void;
}

export default function SearchPanel({ files, onSelectFile }: SearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regexMode, setRegexMode] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.trim().length > 0) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, caseSensitive, wholeWord, regexMode]);

  const performSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    const newResults: SearchResult[] = [];
    
    try {
      let searchPattern: RegExp;
      if (regexMode) {
        try {
          searchPattern = new RegExp(searchTerm, caseSensitive ? "g" : "gi");
        } catch (e) {
          console.error("Invalid regex:", e);
          setIsSearching(false);
          return;
        }
      } else {
        let escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (wholeWord) {
          escapedTerm = `\\b${escapedTerm}\\b`;
        }
        searchPattern = new RegExp(escapedTerm, caseSensitive ? "g" : "gi");
      }

      for (const [filePath, content] of Object.entries(files)) {
        // Skip directories
        if (content === "DIRECTORY:") continue;
        
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let match;
          searchPattern.lastIndex = 0;
          while ((match = searchPattern.exec(line)) !== null) {
            newResults.push({
              file: filePath,
              line: i + 1,
              content: line.trim(),
              matchStart: match.index,
              matchEnd: match.index + match[0].length,
            });
          }
        }
      }
      
      setResults(newResults);
      
      // Auto-expand first few files
      const filesToExpand = new Set<string>();
      newResults.slice(0, 10).forEach(result => {
        filesToExpand.add(result.file);
      });
      setExpandedFiles(filesToExpand);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFileExpand = (file: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(file)) {
      newExpanded.delete(file);
    } else {
      newExpanded.add(file);
    }
    setExpandedFiles(newExpanded);
  };

  const highlightMatch = (text: string, start: number, end: number) => {
    const before = text.substring(0, start);
    const match = text.substring(start, end);
    const after = text.substring(end);
    return (
      <span>
        {before}
        <span className="bg-yellow-500 text-black font-semibold">{match}</span>
        {after}
      </span>
    );
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith(".vue")) return "🟢";
    if (filename.endsWith(".ts") || filename.endsWith(".tsx")) return "🔵";
    if (filename.endsWith(".js")) return "🟡";
    if (filename.endsWith(".json")) return "🟠";
    if (filename.endsWith(".css")) return "🔷";
    if (filename.endsWith(".html")) return "🟠";
    return "📄";
  };

  const groupResultsByFile = () => {
    const grouped: { [key: string]: SearchResult[] } = {};
    for (const result of results) {
      if (!grouped[result.file]) {
        grouped[result.file] = [];
      }
      grouped[result.file].push(result);
    }
    return grouped;
  };

  const groupedResults = groupResultsByFile();

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      {/* Search Header */}
      <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en archivos..."
            className="w-full pl-8 pr-8 py-1.5 text-sm rounded focus:outline-none transition-all"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70"
            >
              <X size={14} style={{ color: "var(--text-secondary)" }} />
            </button>
          )}
        </div>

        {/* Search Options */}
        <div className="flex gap-3 mt-2 text-[11px]">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="cursor-pointer"
            />
            <span style={{ color: "var(--text-secondary)" }}>Aa</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={(e) => setWholeWord(e.target.checked)}
              className="cursor-pointer"
            />
            <span style={{ color: "var(--text-secondary)" }}>Palabra completa</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={regexMode}
              onChange={(e) => setRegexMode(e.target.checked)}
              className="cursor-pointer"
            />
            <span style={{ color: "var(--text-secondary)" }}>.*</span>
          </label>
        </div>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        {searchTerm.trim().length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
            <Search size={32} />
            <p className="text-sm">Ingresa un término para buscar</p>
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{__html: 'Ejemplo: &ldquo;function&rdquo;, &ldquo;import&rdquo;, &ldquo;export&rdquo;'}} />
          </div>
        ) : isSearching ? (
          <div className="flex items-center justify-center h-full gap-2">
            <div className="h-4 w-4 rounded-full animate-spin border-2" style={{ borderColor: "var(--accent) transparent" }} />
            <p className="text-sm">Buscando...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
            <p className="text-sm">No se encontraron resultados para &ldquo;{searchTerm}&rdquo;</p>
          </div>
        ) : (
          <div className="p-2">
            <p className="text-[11px] px-2 py-1 mb-2" style={{ color: "var(--text-secondary)" }}>
              {results.length} resultado{results.length !== 1 ? "s" : ""} en {Object.keys(groupedResults).length} archivo{Object.keys(groupedResults).length !== 1 ? "s" : ""}
            </p>
            {Object.entries(groupedResults).map(([file, fileResults]) => (
              <div key={file} className="mb-2">
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:opacity-80"
                  style={{ background: "var(--bg-tertiary)" }}
                  onClick={() => toggleFileExpand(file)}
                >
                  {expandedFiles.has(file) ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                  <span className="text-[11px]">{getFileIcon(file)}</span>
                  <span className="text-[12px] font-mono flex-1 truncate">{file}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                    {fileResults.length}
                  </span>
                </div>
                {expandedFiles.has(file) && (
                  <div className="ml-5 mt-1">
                    {fileResults.map((result, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1 rounded cursor-pointer text-[12px] font-mono hover:opacity-80 transition-all mb-0.5"
                        style={{ background: "var(--bg-hover)" }}
                        onClick={() => onSelectFile(file, result.line)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px]" style={{ color: "var(--accent)" }}>
                            L{result.line}
                          </span>
                          <span className="truncate flex-1">
                            {highlightMatch(result.content, result.matchStart, result.matchEnd)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}