"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { getWebContainer } from "@/lib/webcontainer";
import { useTheme } from "./IDE";
import type { WebContainerProcess } from "@webcontainer/api";
import "xterm/css/xterm.css";

export default function TerminalArea({ 
  isBooting,
  onReady 
}: { 
  isBooting: boolean;
  onReady?: () => void;
}) {
  const { theme } = useTheme();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isTerminalReadyRef = useRef(false);
  const isShellReadyRef = useRef(false);
  const shellProcessRef = useRef<WebContainerProcess | null>(null);
  const inputWriterRef = useRef<WritableStreamDefaultWriter<string> | null>(null);



  useEffect(() => {
    if (!terminalRef.current || isTerminalReadyRef.current) return;

    xtermRef.current = new Terminal({
      theme:
        theme === "dark"
          ? {
              background: "#1e1e1e",
              foreground: "#cccccc",
              cursor: "#ffffff",
              selectionBackground: "#5da5d533",
              black: "#1e1e1e",
            }
          : {
              background: "#ffffff",
              foreground: "#1e1e1e",
              cursor: "#333333",
              selectionBackground: "#0055cc33",
              black: "#ffffff",
            },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      scrollback: 9999, // Asegura que haya suficiente historial para el scroll
    });

    fitAddonRef.current = new FitAddon();
    xtermRef.current.loadAddon(fitAddonRef.current);
    xtermRef.current.open(terminalRef.current);
    fitAddonRef.current.fit();
    isTerminalReadyRef.current = true;
    onReady?.();

    const handleResize = () => fitAddonRef.current?.fit();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [theme, onReady]);

  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;
    term.options.theme =
      theme === "dark"
        ? {
            background: "#1e1e1e",
            foreground: "#cccccc",
            cursor: "#ffffff",
            selectionBackground: "#5da5d533",
            black: "#1e1e1e",
          }
        : {
            background: "#ffffff",
            foreground: "#1e1e1e",
            cursor: "#333333",
            selectionBackground: "#0055cc33",
            black: "#ffffff",
          };
  }, [theme]);

  const isInitializingShellRef = useRef(false);

  useEffect(() => {
    if (isBooting || isShellReadyRef.current || !xtermRef.current) return;
    let cancelled = false;

    const tryStartShell = async () => {
      if (cancelled || isShellReadyRef.current) return;
      
      const container = getWebContainer();
      if (!container) {
        setTimeout(tryStartShell, 200);
        return;
      }

      if (isInitializingShellRef.current) return;
      isInitializingShellRef.current = true;

      try {
        const shellProcess = await container.spawn("jsh", {
          terminal: {
            cols: xtermRef.current!.cols,
            rows: xtermRef.current!.rows,
          },
        });

        if (cancelled) {
          shellProcess.kill();
          return;
        }

        shellProcessRef.current = shellProcess;
        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              xtermRef.current?.write(data);
            },
          })
        );

        const writer = shellProcess.input.getWriter();
        inputWriterRef.current = writer;
        await writer.write("ls\r");

        xtermRef.current?.onData((data) => {
          inputWriterRef.current?.write(data);
        });

        isShellReadyRef.current = true;
      } catch (err) {
        console.error("Shell initialization error", err);
        isInitializingShellRef.current = false;
      }
    };

    tryStartShell();

    return () => {
      cancelled = true;
    };
  }, [isBooting]);

  // Añadimos pl-2 para el margen izquierdo y algo de padding general, 
  // pero el contenedor debe manejar su propio tamaño con xterm.
  return (
    <div 
      className="w-full h-full p-2 pr-4" 
      ref={terminalRef} 
      style={{ overflow: 'hidden' }}
    />
  );
}