export default function StatusBar({ isBooting }: { isBooting: boolean }) {
  return (
    <div className="h-[22px] bg-[#007acc] text-white flex items-center px-4 text-[12px] shrink-0 justify-between select-none font-medium">
      <div className="flex items-center gap-4">
        {isBooting ? (
          <span className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
             Iniciando Entorno Web...
          </span>
        ) : (
          <span className="flex items-center gap-2 cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded">
             <span className="w-2 h-2 rounded-full bg-green-400"></span>
             WebContainer Listo
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded">UTF-8</span>
        <span className="cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded">TypeScript React</span>
        <span className="cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded">Next.js Web IDE</span>
      </div>
    </div>
  );
}
