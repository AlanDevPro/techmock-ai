"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { getWebContainer } from "@/lib/webcontainer";
import { useTheme } from "./IDE";
import type { WebContainerProcess } from "@webcontainer/api";
import "xterm/css/xterm.css";

interface TerminalAreaProps {
  isBooting: boolean;
  onReady?: () => void;
  isVisible: boolean;
  framework?: "vuejs" | "nextjs" | null;
}

export interface TerminalAreaRef {
  fitTerminal: () => void;
}

const TerminalArea = forwardRef<TerminalAreaRef, TerminalAreaProps>(function TerminalArea(
  { isBooting, onReady, isVisible, framework },
  ref
) {
  const { theme } = useTheme();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  
  const isShellReadyRef = useRef(false);
  const shellProcessRef = useRef<WebContainerProcess | null>(null);
  const isInitializingShellRef = useRef(false);
  const [hasDimensions, setHasDimensions] = useState(false);

  // 1. Monitorear el contenedor
  useEffect(() => {
    if (!terminalRef.current) return;

    const observer = new ResizeObserver((entries) => {
      // 🔥 SOLUCIONADO: Cambiado 'let' por 'const' para satisfacer prefer-const de ESLint
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 20 && height > 20) {
          setHasDimensions(true);
        } else {
          setHasDimensions(false);
        }
      }
    });

    observer.observe(terminalRef.current);
    return () => observer.disconnect();
  }, []);

  // FUNCIÓN DE AJUSTE GEOMÉTRICO
  const safeFit = () => {
    if (!fitAddonRef.current || !xtermRef.current || !terminalRef.current || !hasDimensions || !isVisible) return;

    try {
      fitAddonRef.current.fit();
      
      const cols = xtermRef.current.cols > 0 ? xtermRef.current.cols : 80;
      const rows = xtermRef.current.rows > 0 ? xtermRef.current.rows : 24;

      if (shellProcessRef.current) {
        shellProcessRef.current.resize({ cols, rows });
      }
    } catch (e) {
      console.warn("[TERMINAL] Fallo controlado al ajustar dimensiones:", e);
    }
  };

  useImperativeHandle(ref, () => ({
    fitTerminal: safeFit,
  }));

  // trigger de ajuste cuando pasa a ser visible
  useEffect(() => {
    if (isVisible && hasDimensions) {
      setTimeout(() => {
        safeFit();
        xtermRef.current?.focus();
      }, 50);
    }
  }, [isVisible, hasDimensions]);

  // 2. Inicialización de Xterm.js
  useEffect(() => {
    if (isBooting || !terminalRef.current || xtermRef.current) return;

    const term = new Terminal({
      theme:
        theme === "dark"
          ? { background: "#1e1e1e", foreground: "#cccccc", cursor: "#ffffff", selectionBackground: "#5da5d533", black: "#1e1e1e" }
          : { background: "#ffffff", foreground: "#1e1e1e", cursor: "#333333", selectionBackground: "#0055cc33", black: "#ffffff" },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      scrollback: 9999,
      cols: 80,
      rows: 24,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    
    if (onReady) onReady();

    const handleResize = () => safeFit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      try {
        term.dispose();
      } catch (e) {}
      xtermRef.current = null;
      fitAddonRef.current = null;
      isShellReadyRef.current = false;
    };
  }, [isBooting]);

  // 3. Sincronización dinámica de temas
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;
    term.options.theme =
      theme === "dark"
        ? { background: "#1e1e1e", foreground: "#cccccc", cursor: "#ffffff", selectionBackground: "#5da5d533", black: "#1e1e1e" }
        : { background: "#ffffff", foreground: "#1e1e1e", cursor: "#333333", selectionBackground: "#0055cc33", black: "#ffffff" };
  }, [theme]);

  // 4. Conexión persistente con el proceso Shell
  useEffect(() => {
    if (isBooting || !xtermRef.current || isShellReadyRef.current) return;
    
    let cancelled = false;
    let dataListener: { dispose: () => void } | null = null;
    let npmProcess: WebContainerProcess | null = null;
    let devProcess: WebContainerProcess | null = null;

    const startShellProcess = async () => {
      const container = getWebContainer();
      if (!container) {
        setTimeout(startShellProcess, 200);
        return;
      }

      if (isInitializingShellRef.current || isShellReadyRef.current) return;
      isInitializingShellRef.current = true;

      try {
        // 🎯 SOLUCIÓN CLAVE: Iniciar el shell en el directorio correcto
        let targetDir = "/";
        let projectName = "";
        let devPort = "3000";

        if (framework === "vuejs") {
          targetDir = "/practica-vue";
          projectName = "Vue.js";
          devPort = "5173";
        } else if (framework === "nextjs") {
          targetDir = "/practica-nextjs";
          projectName = "Next.js";
          devPort = "3000";
        }

        // Extraer y asegurar dimensiones numéricas para evitar errores de tipado en TypeScript
        const terminalCols = xtermRef.current ? xtermRef.current.cols : 80;
        const terminalRows = xtermRef.current ? xtermRef.current.rows : 24;

        // 🔥 IMPORTANTE: Usar cwd para iniciar el shell en el directorio correcto
        const shellProcess = await container.spawn("jsh", {
          cwd: targetDir, // <-- ESTA ES LA CLAVE DEL ÉXITO
          terminal: {
            cols: terminalCols > 0 ? terminalCols : 80,
            rows: terminalRows > 0 ? terminalRows : 24,
          },
        });

        if (cancelled) {
          shellProcess.kill();
          return;
        }

        shellProcessRef.current = shellProcess;

        // Tubería de salida del micro-SO hacia la pantalla
        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              xtermRef.current?.write(data);
            },
          })
        );

        const writer = shellProcess.input.getWriter();

        // Esperar a que el shell esté listo
        await writer.write("\r");
        await new Promise(resolve => setTimeout(resolve, 100));

        // Mostrar mensaje de bienvenida
        await writer.write(`echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"\r`);
        await writer.write(`echo "📂 Proyecto: ${projectName}"\r`);
        await writer.write(`echo "📁 Directorio: ${targetDir}"\r`);
        await writer.write(`echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"\r`);
        
        // Verificar el contenido del directorio
        await writer.write(`ls -la\r`);
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verificar si existe package.json
        await writer.write(`cat package.json | head -5\r`);
        await new Promise(resolve => setTimeout(resolve, 200));

        // 🚀 EJECUTAR npm install (con manejo de errores)
        await writer.write(`echo "📦 Instalando dependencias... (npm install)"\r`);
        
        // Ejecutar npm install como un proceso separado
        npmProcess = await container.spawn("npm", ["install"], {
          cwd: targetDir,
        });

        // Capturar la salida de npm install
        npmProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              xtermRef.current?.write(data);
            },
          })
        );

        // Esperar a que npm install termine
        const npmExitCode = await npmProcess.exit;
        if (npmExitCode === 0) {
          await writer.write(`echo "✅ Dependencias instaladas correctamente"\r`);
        } else {
          await writer.write(`echo "❌ Error en npm install (código: ${npmExitCode})"\r`);
        }

        // 🚀 EJECUTAR npm run dev
        await writer.write(`echo "🚀 Iniciando servidor de desarrollo... (npm run dev)"\r`);
        
        // Ejecutar npm run dev como un proceso separado (que queda corriendo)
        devProcess = await container.spawn("npm", ["run", "dev"], {
          cwd: targetDir,
        });

        // Capturar la salida de npm run dev
        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              xtermRef.current?.write(data);
            },
          })
        );

        // No esperamos a que termine porque es un proceso que queda corriendo
        await new Promise(resolve => setTimeout(resolve, 500));

        await writer.write(`echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"\r`);
        await writer.write(`echo "✅ Servidor de desarrollo iniciado"\r`);
        await writer.write(`echo "🌐 Accede a: http://localhost:${devPort}"\r`);
        await writer.write(`echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"\r`);

        // Escucha del teclado para comandos manuales
        dataListener = xtermRef.current!.onData((data) => {
          if (writer) {
            writer.write(data).catch((e) => console.error("Error escribiendo en terminal:", e));
          }
        });

        isShellReadyRef.current = true;
        
        // Ajustamos la pantalla
        setTimeout(() => safeFit(), 100);
      } catch (err) {
        console.error("❌ Error inicializando la Shell JSH:", err);
        if (xtermRef.current) {
          xtermRef.current.write(`\r\n❌ Error: ${err instanceof Error ? err.message : 'Error desconocido'}\r\n`);
        }
      } finally {
        isInitializingShellRef.current = false;
      }
    };

    startShellProcess();

    return () => {
      cancelled = true;
      if (dataListener) dataListener.dispose();
      if (npmProcess) {
        try {
          npmProcess.kill();
        } catch (e) {}
      }
      if (devProcess) {
        try {
          devProcess.kill();
        } catch (e) {}
      }
      if (shellProcessRef.current) {
        try {
          shellProcessRef.current.kill();
        } catch (e) {}
      }
      isShellReadyRef.current = false;
      shellProcessRef.current = null;
    };
  }, [isBooting, framework]);

  return (
    <div
      className="w-full h-full p-2"
      ref={terminalRef}
      style={{ overflow: "hidden", display: "block" }}
    />
  );
});

export default TerminalArea;