"use client";

import { useEffect, useState } from 'react';
import { getWebContainer } from '@/lib/webcontainer';
import { RotateCw, ExternalLink, Minimize2, Maximize2 } from 'lucide-react';

export default function PreviewArea({ minified = false, onToggleMinify }: any) {
  const [url, setUrl] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const checkContainer = setInterval(() => {
      const container = getWebContainer();
      if (container) {
        clearInterval(checkContainer);
        container.on('server-ready', (port, appUrl) => {
          setUrl(appUrl);
        });
      }
    }, 1000);

    return () => clearInterval(checkContainer);
  }, []);

  const handleRefresh = () => setKey(k => k + 1);

  return (
    <div className={`flex ${minified ? 'flex-col' : 'flex-col'} h-full w-full bg-[#1e1e1e] border-l border-[#3c3c3c]`}>
      <div className={`flex ${minified ? 'flex-col py-2' : 'h-9 px-2'} bg-[#252526] items-center justify-between border-b border-[#1e1e1e] shrink-0 text-[#cccccc] transition-all`}>
        {!minified && (
          <div className="flex items-center text-[12px] px-2 font-semibold">
             Live Preview
          </div>
        )}
        <div className={`flex items-center gap-1 ${minified ? 'flex-col' : ''}`}>
           {!minified && (
             <>
               <button onClick={handleRefresh} className="p-1 hover:bg-[#3c3c3c] rounded" title="Recargar">
                 <RotateCw size={14} />
               </button>
               {url && (
                 <a href={url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-[#3c3c3c] rounded flex items-center" title="Abrir en pestaña">
                   <ExternalLink size={14} />
                 </a>
               )}
             </>
           )}
           <button onClick={onToggleMinify} className="p-1 hover:bg-[#3c3c3c] rounded" title={minified ? "Expandir" : "Minimizar"}>
             {minified ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
           </button>
        </div>
      </div>
      <div className={`flex-1 w-full bg-white relative ${minified ? 'hidden' : 'block'}`}>
        {!url ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[#858585] bg-[#1e1e1e]">
            <div>
              <p className="mb-2 text-lg">Modo Servidor no iniciado</p>
              <p className="text-sm">Escribe <code className="bg-[#3c3c3c] px-1 py-0.5 rounded text-white">npm install</code> y <code className="bg-[#3c3c3c] px-1 py-0.5 rounded text-white">npm run dev</code> en la consola para iniciar la vista previa.</p>
            </div>
          </div>
        ) : (
          <iframe key={key} src={url} className="w-full h-full border-none" />
        )}
      </div>
    </div>
  );
}
