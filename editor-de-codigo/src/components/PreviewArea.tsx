"use client";

import { useEffect, useState } from "react";
import { getWebContainer } from "@/lib/webcontainer";
import { RotateCw, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { useTheme } from "./IDE";

export default function PreviewArea({
  minified = false,
  onToggleMinify,
}: {
  minified?: boolean;
  onToggleMinify?: () => void;
}) {
  const { theme } = useTheme();
  const [url, setUrl] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const checkContainer = setInterval(() => {
      const container = getWebContainer();
      if (container) {
        clearInterval(checkContainer);
        container.on("server-ready", (_port: number, appUrl: string) => {
          setUrl(appUrl);
        });
      }
    }, 1000);
    return () => clearInterval(checkContainer);
  }, []);

  const handleRefresh = () => setKey((k) => k + 1);

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Header */}
      <div
        className="flex h-9 items-center justify-between px-4 shrink-0 border-b text-[12px]"
        style={{
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
          borderColor: "var(--border)",
        }}
      >
        {!minified && (
          <span className="font-semibold uppercase tracking-wider">
            Live Preview
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {!minified && (
            <>
              <button
                onClick={handleRefresh}
                className="p-1.5 rounded transition-colors hover:opacity-70"
                style={{ color: "var(--text-secondary)" }}
                title="Recargar"
              >
                <RotateCw size={13} />
              </button>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded flex items-center transition-colors hover:opacity-70"
                  style={{ color: "var(--text-secondary)" }}
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink size={13} />
                </a>
              )}
            </>
          )}
          {onToggleMinify && (
            <button
              onClick={onToggleMinify}
              className="p-1.5 rounded transition-colors hover:opacity-70"
              style={{ color: "var(--text-secondary)" }}
              title={minified ? "Expandir" : "Minimizar"}
            >
              {minified ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Preview content */}
      <div
        className={`flex-1 w-full relative ${minified ? "hidden" : "block"}`}
        style={{ background: theme === "light" ? "#ffffff" : "#1e1e1e" }}
      >
        {!url ? (
          <div
            className="absolute inset-0 flex items-center justify-center p-6 text-center"
            style={{
              background: "var(--bg-primary)",
              color: "var(--text-secondary)",
            }}
          >
            <div>
              <p className="mb-3 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Drag a view here to display.
              </p>
              <p className="text-sm">
                Escribe{" "}
                <code
                  className="px-1 py-0.5 rounded text-[12px]"
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--accent)",
                  }}
                >
                  npm install
                </code>{" "}
                y{" "}
                <code
                  className="px-1 py-0.5 rounded text-[12px]"
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--accent)",
                  }}
                >
                  npm run dev
                </code>{" "}
                en la terminal para iniciar la vista previa.
              </p>
            </div>
          </div>
        ) : (
          <iframe
            key={key}
            src={url}
            className="w-full h-full border-none"
            style={{ background: "#ffffff" }}
          />
        )}
      </div>
    </div>
  );
}