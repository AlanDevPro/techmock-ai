"use client";

import { useState, useEffect } from "react";
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

  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);

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

  const handleRefreshFs = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const updatedFs = await readWebContainerFiles();
    setFileSystem(updatedFs);
    setIsRefreshing(false);
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-1 h-[calc(100vh-22px)] overflow-hidden">
        <ActivityBar />
        <Sidebar 
          activeFile={activeFile} 
          onSelectFile={setActiveFile} 
          files={fileSystem} 
          onRefresh={handleRefreshFs}
        />
        
        <div className="flex flex-col flex-1 h-full min-w-0">
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
