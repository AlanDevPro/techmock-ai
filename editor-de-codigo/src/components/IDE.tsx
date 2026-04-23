"use client";

import { useState, useEffect, useRef } from "react";
import ActivityBar from "./ActivityBar";
import Sidebar from "./Sidebar";
import EditorArea from "./EditorArea";
import PreviewArea from "./PreviewArea";
import TerminalArea from "./TerminalArea";
import StatusBar from "./StatusBar";
import { bootWebContainer, getFileSystem, readWebContainerFiles } from "@/lib/webcontainer";

export default function IDE() {
  const [activeFile, setActiveFile] = useState("/src/App.vue");
  const [fileSystem, setFileSystem] = useState<{ [key: string]: string }>({});
  const [isBooting, setIsBooting] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBootingUi, setIsBootingUi] = useState(true);

  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<'vuejs' | 'nextjs' | null>(null);
  const [questionData, setQuestionData] = useState<{
    pregunta_practica: string;
    comprension_a_evaluar: string;
    explicacion_codigo_esperado: string;
    error_por_falta_de_contexto?: string | null;
  } | null>(null);
  const [isQuestionOpen, setIsQuestionOpen] = useState(true);
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const hasLoadedQuestionsRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    bootWebContainer().then(() => {
      if (mounted) {
        setIsBooting(false);
        setFileSystem(getFileSystem());
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isBooting) return;
    const timer = setTimeout(() => {
      setIsBootingUi(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isBooting]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasLoadedQuestionsRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const framework = params.get("framework");
    if (framework === "vuejs" || framework === "nextjs") {
      hasLoadedQuestionsRef.current = true;
      setSelectedFramework(framework);
      loadQuestions(framework);
    }
  }, []);

  const handleRefreshFs = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const updatedFs = await readWebContainerFiles();
    setFileSystem(updatedFs);
    setIsRefreshing(false);
  };

  const loadQuestions = async (framework: 'vuejs' | 'nextjs') => {
    const endpoint = framework === 'vuejs' ? 'vue' : 'next';
    setIsQuestionLoading(true);
    setQuestionError(null);

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/generar-preguntas/${endpoint}`);
      if (!response.ok) {
        throw new Error('No se pudo obtener las preguntas');
      }
      const data = await response.json();
      setQuestionData(data);
    } catch (error) {
      console.error('Error al cargar preguntas:', error);
      setQuestionData(null);
      setQuestionError('No se pudieron cargar las preguntas. Verifica la API RAG.');
    } finally {
      setIsQuestionLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {isBootingUi && (
        <div className="absolute inset-0 z-50 bg-[#1e1e1e] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-[#cccccc]">
            <div className="h-2 w-24 bg-[#2d2d2d] rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-[#007acc] animate-pulse" />
            </div>
            <span className="text-sm uppercase tracking-widest">
              Cargando editor...
            </span>
          </div>
        </div>
      )}
      <div className="flex flex-1 h-[calc(100vh-22px)] overflow-hidden">
        <ActivityBar />
        <Sidebar 
          activeFile={activeFile} 
          onSelectFile={setActiveFile} 
          files={fileSystem} 
          onRefresh={handleRefreshFs}
        />
        
        <div className="flex flex-col flex-1 h-full min-w-0">
          <div className="border-b border-[#3c3c3c] bg-[#252526] text-[#cccccc]">
            <details
              open={isQuestionOpen}
              onToggle={(event) => setIsQuestionOpen((event.currentTarget as HTMLDetailsElement).open)}
            >
              <summary className="w-full flex items-center justify-between px-4 py-2 text-left text-[12px] font-semibold uppercase tracking-widest cursor-pointer list-none">
                <span>Preguntas de la prueba</span>
                <span className="text-[11px] text-[#8c8c8c]">
                  {selectedFramework ? (selectedFramework === 'vuejs' ? 'Vue.js' : 'Next.js') : 'Sin seleccionar'}
                </span>
              </summary>
              <div className="px-4 pb-3 text-[12px] text-[#bdbdbd] max-h-56 overflow-auto">
                {isQuestionLoading && (
                  <p className="text-[#8c8c8c]">Cargando preguntas...</p>
                )}
                {questionError && (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-red-400">{questionError}</p>
                    {selectedFramework && (
                      <button
                        onClick={() => loadQuestions(selectedFramework)}
                        className="text-[11px] text-[#8c8c8c] hover:text-white"
                      >
                        Reintentar
                      </button>
                    )}
                  </div>
                )}
                {!isQuestionLoading && !questionError && !questionData && (
                  <p className="text-[#8c8c8c]">
                    Selecciona Vue.js o Next.js para cargar la pregunta tecnica.
                  </p>
                )}
                {!isQuestionLoading && !questionError && questionData && (
                  <div className="space-y-2">
                    <p className="text-white text-[13px] font-semibold">
                      {questionData.pregunta_practica}
                    </p>
                    <p className="text-[#9e9e9e]">
                      {questionData.comprension_a_evaluar}
                    </p>
                    <p className="text-[#bdbdbd] whitespace-pre-wrap">
                      {questionData.explicacion_codigo_esperado}
                    </p>
                    {questionData.error_por_falta_de_contexto && (
                      <p className="text-yellow-300">
                        {questionData.error_por_falta_de_contexto}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </details>
          </div>

          <div className="flex-1 min-h-0 relative bg-[#1e1e1e] flex flex-row">
             {isBooting ? (
               <div className="flex items-center justify-center h-full w-full text-[#858585]">
                 Arrancando micro-sistema operativo en la web...
               </div>
             ) : (
               <>
                 <div className="flex-1 min-w-0 h-full">
                   <EditorArea 
                     activeFile={activeFile} 
                     fileSystem={fileSystem} 
                   />
                 </div>
                 <div className="w-1/3 min-w-[300px] h-full hidden md:block">
                   <PreviewArea />
                 </div>
               </>
             )}
          </div>
          
          <div className="h-64 border-t border-[#3c3c3c] bg-[#1e1e1e] flex flex-col shrink-0">
             <div className="flex h-9 border-b border-[#3c3c3c] items-center px-4">
                <span className="text-[11px] font-medium uppercase cursor-pointer text-[#e7e7e7] border-b border-[#e7e7e7] h-full flex items-center mb-[-1px]">
                  Terminal
                </span>
             </div>
             <div className="flex-1 relative bg-[#1e1e1e] overflow-hidden p-2">
                <TerminalArea isBooting={isBooting} />
             </div>
          </div>
        </div>
      </div>
      
      <StatusBar isBooting={isBooting} />
    </div>
  );
}
