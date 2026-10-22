import React from 'react';

interface RetroWindowProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  onClose?: () => void;
}

export const RetroWindow: React.FC<RetroWindowProps> = ({ children, title, className = '', onClose }) => {
  return (
    <div className={`bg-[#c0c0c0] border-t-2 border-l-2 border-r-2 border-b-2 border-t-white border-l-white border-r-black border-b-black p-1 flex flex-col shadow-xl ${className}`}>
      {/* Title Bar */}
      <div className="bg-[#000080] px-2 py-1 flex justify-between items-center mb-1">
        <span className="text-white font-bold tracking-wide text-sm md:text-base truncate">
          {title || "Encarta MindMaze"}
        </span>
        <div className="flex gap-1">
            {/* Minimize/Maximize fake buttons */}
           <button className="w-5 h-5 bg-[#c0c0c0] border-t border-l border-white border-r border-b border-black flex items-center justify-center font-bold text-xs leading-none active:border-t-black active:border-l-black active:border-r-white active:border-b-white">
            _
          </button>
           <button className="w-5 h-5 bg-[#c0c0c0] border-t border-l border-white border-r border-b border-black flex items-center justify-center font-bold text-xs leading-none active:border-t-black active:border-l-black active:border-r-white active:border-b-white">
            □
          </button>
          {onClose && (
             <button 
                onClick={onClose}
                className="w-5 h-5 bg-[#c0c0c0] border-t border-l border-white border-r border-b border-black flex items-center justify-center font-bold text-xs leading-none active:border-t-black active:border-l-black active:border-r-white active:border-b-white ml-1"
             >
              X
            </button>
          )}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};