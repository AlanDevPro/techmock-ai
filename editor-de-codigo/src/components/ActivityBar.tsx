import { Files, Search, GitBranch, Play, Settings } from 'lucide-react';

export default function ActivityBar() {
  return (
    <div className="w-12 bg-[#333333] flex flex-col items-center justify-between pb-4 pt-2">
      <div className="flex flex-col gap-4 w-full items-center">
        <div className="p-2 border-l-2 border-l-[#007acc] text-white cursor-pointer w-full flex justify-center opacity-100">
          <Files size={24} strokeWidth={1.5} />
        </div>
        <div className="p-2 border-l-2 border-l-transparent text-[#858585] hover:text-white cursor-pointer w-full flex justify-center">
          <Search size={24} strokeWidth={1.5} />
        </div>
        <div className="p-2 border-l-2 border-l-transparent text-[#858585] hover:text-white cursor-pointer w-full flex justify-center">
          <GitBranch size={24} strokeWidth={1.5} />
        </div>
        <div className="p-2 border-l-2 border-l-transparent text-[#858585] hover:text-white cursor-pointer w-full flex justify-center">
          <Play size={24} strokeWidth={1.5} />
        </div>
      </div>
      <div>
        <div className="p-2 text-[#858585] hover:text-white cursor-pointer">
          <Settings size={24} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
