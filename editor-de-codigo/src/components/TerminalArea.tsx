"use client";

import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { getWebContainer } from '@/lib/webcontainer';
import 'xterm/css/xterm.css';

export default function TerminalArea({ isBooting }: { isBooting: boolean }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isTerminalReady, setIsTerminalReady] = useState(false);

  useEffect(() => {
    if (isBooting || !terminalRef.current || isTerminalReady) return;

    if (!xtermRef.current) {
      xtermRef.current = new Terminal({
        theme: {
          background: '#1e1e1e',
          foreground: '#cccccc',
          cursor: '#ffffff',
          selectionBackground: '#5da5d533',
          black: '#1e1e1e',
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
        shellProcess = await container.spawn('jsh', {
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
        
        // As you have multiple projects, you can CD into the one you want
        await inputWriter.write('ls\r');

        xtermRef.current.onData((data) => {
          if (inputWriter) {
            inputWriter.write(data);
          }
        });
      } catch (err) {
        console.error("Shell initialization error", err);
      }
    };

    initTerminal();

    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isBooting, isTerminalReady]);

  return (
    <div className="w-full h-full" ref={terminalRef}></div>
  );
}
