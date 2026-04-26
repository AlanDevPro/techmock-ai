"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { getWebContainer } from "@/lib/webcontainer";
import { useTheme } from "./IDE";
import "xterm/css/xterm.css";

export default function TerminalArea({ isBooting }: { isBooting: boolean }) {
  const { theme } = useTheme();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isTerminalReady, setIsTerminalReady] = useState(false);

  useEffect(() => {
    if (isBooting || !terminalRef.current || isTerminalReady) return;

    if (!xtermRef.current) {
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
      });

      fitAddonRef.current = new FitAddon();
      xtermRef.current.loadAddon(fitAddonRef.current);
      xtermRef.current.open(terminalRef.current);
      fitAddonRef.current.fit();
      setIsTerminalReady(true);
    }

    let shellProcess: any;
    let inputWriter: WritableStreamDefaultWriter<string>;

    const initTerminal = async () => {
      const container = getWebContainer();
      if (!container || !xtermRef.current) return;

      try {
        shellProcess = await container.spawn("jsh", {
          terminal: {
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows,
          },
        });

        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              xtermRef.current?.write(data);
            },
          })
        );

        inputWriter = shellProcess.input.getWriter();
        await inputWriter.write("ls\r");

        xtermRef.current.onData((data) => {
          if (inputWriter) inputWriter.write(data);
        });
      } catch (err) {
        console.error("Shell initialization error", err);
      }
    };

    initTerminal();

    const handleResize = () => fitAddonRef.current?.fit();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isBooting, isTerminalReady]);

  return <div className="w-full h-full" ref={terminalRef} />;
}