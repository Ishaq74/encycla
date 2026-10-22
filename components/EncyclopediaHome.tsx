
import React, { useMemo } from 'react';
import { CATEGORIES } from '../constants';
import { Category, GameMode, Difficulty } from '../types';
import { getCategoryThumbnail, getMenuCoverImage } from '../services/geminiService';

interface EncyclopediaHomeProps {
  onStart: (mode: GameMode, cat: Category | null, diff: Difficulty) => void;
}

export const EncyclopediaHome: React.FC<EncyclopediaHomeProps> = ({ onStart }) => {
  const [view, setView] = React.useState<'MAIN' | 'SUBJECT_SELECT'>('MAIN');
  const [selectedCategory, setSelectedCategory] = React.useState<Category>(CATEGORIES[0]);

  // Generate stable thumbnails once on mount so they don't flicker on re-renders
  const categoryThumbnails = useMemo(() => {
    const thumbnails: Record<string, string> = {};
    CATEGORIES.forEach(cat => {
      const url = getCategoryThumbnail(cat);
      thumbnails[cat] = url ? `url("${url}")` : 'none';
    });
    return thumbnails;
  }, []);

  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-900 text-white font-sans overflow-hidden relative">
        {/* Retro Grid Animation */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none perspective-[500px]">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-blue-900/20"></div>
            <div 
                className="absolute w-[200%] h-[200%] -left-[50%] -top-[50%] opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    transform: 'perspective(500px) rotateX(60deg)',
                    animation: 'gridMove 20s linear infinite'
                }}
            ></div>
            <style>{`
                @keyframes gridMove {
                    0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
                    100% { transform: perspective(500px) rotateX(60deg) translateY(40px); }
                }
            `}</style>
        </div>

        {/* Floating Particles/Stars */}
        <div className="absolute inset-0 z-0 opacity-30 animate-pulse">
            <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"></div>
            <div className="absolute top-3/4 left-1/3 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_10px_blue]"></div>
            <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-[0_0_10px_purple]"></div>
        </div>

        <div className="w-full h-full max-w-7xl p-4 md:p-8 flex flex-col items-center justify-evenly relative z-10">
            
            <div className="text-center shrink-0">
                <h1 className="text-4xl md:text-7xl font-black mb-2 md:mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-white to-purple-300 drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] filter tracking-tight">
                    VISUAL TRIVIA
                </h1>
                <div className="inline-block relative">
                     <p className="text-blue-200/70 text-sm md:text-xl tracking-[0.5em] uppercase font-light">Encyclopedia Challenge</p>
                     <div className="absolute -bottom-2 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                </div>
            </div>

            {view === 'MAIN' ? (
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full max-w-6xl flex-1 max-h-[60vh] items-center justify-center px-4">
                    <button 
                        onClick={() => onStart(GameMode.CLASSIC, null, Difficulty.NOVICE)}
                        className="group relative flex-1 w-full h-full bg-slate-800 rounded-3xl border border-slate-700/50 hover:border-blue-400 transition-all duration-300 hover:shadow-[0_0_50px_rgba(59,130,246,0.2)] flex flex-col items-center justify-center overflow-hidden min-h-[140px] active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-700" style={{backgroundImage: `url("${getMenuCoverImage('CLASSIC')}")`}}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent opacity-90 group-hover:opacity-80 transition-opacity"></div>
                        
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-blue-900/30 backdrop-blur-md flex items-center justify-center mb-4 border border-blue-400/30 group-hover:border-blue-400/80 group-hover:scale-110 transition-all duration-300 shadow-xl relative z-10">
                             <span className="text-4xl md:text-5xl drop-shadow-lg">🌍</span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold mb-1 relative z-10 text-white group-hover:text-blue-200 transition-colors drop-shadow-md">Classic</h3>
                        <p className="text-blue-200/60 text-xs md:text-sm relative z-10 tracking-widest uppercase font-bold group-hover:text-blue-100">Campaign Mode</p>
                    </button>

                    <button 
                        onClick={() => setView('SUBJECT_SELECT')}
                        className="group relative flex-1 w-full h-full bg-slate-800 rounded-3xl border border-slate-700/50 hover:border-purple-400 transition-all duration-300 hover:shadow-[0_0_50px_rgba(168,85,247,0.2)] flex flex-col items-center justify-center overflow-hidden min-h-[140px] active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-700" style={{backgroundImage: `url("${getMenuCoverImage('SUBJECT')}")`}}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent opacity-90 group-hover:opacity-80 transition-opacity"></div>

                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-purple-900/30 backdrop-blur-md flex items-center justify-center mb-4 border border-purple-400/30 group-hover:border-purple-400/80 group-hover:scale-110 transition-all duration-300 shadow-xl relative z-10">
                             <span className="text-4xl md:text-5xl drop-shadow-lg">🎯</span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold mb-1 relative z-10 text-white group-hover:text-purple-200 transition-colors drop-shadow-md">Subject</h3>
                        <p className="text-purple-200/60 text-xs md:text-sm relative z-10 tracking-widest uppercase font-bold group-hover:text-purple-100">Focus Study</p>
                    </button>

                    <button 
                        onClick={() => onStart(GameMode.CONTEST, null, Difficulty.ADVENTURER)}
                        className="group relative flex-1 w-full h-full bg-slate-800 rounded-3xl border border-slate-700/50 hover:border-red-400 transition-all duration-300 hover:shadow-[0_0_50px_rgba(239,68,68,0.2)] flex flex-col items-center justify-center overflow-hidden min-h-[140px] active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-700" style={{backgroundImage: `url("${getMenuCoverImage('CONTEST')}")`}}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent opacity-90 group-hover:opacity-80 transition-opacity"></div>

                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-red-900/30 backdrop-blur-md flex items-center justify-center mb-4 border border-red-400/30 group-hover:border-red-400/80 group-hover:scale-110 transition-all duration-300 shadow-xl relative z-10">
                             <span className="text-4xl md:text-5xl drop-shadow-lg">⚔️</span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold mb-1 relative z-10 text-white group-hover:text-red-200 transition-colors drop-shadow-md">Contest</h3>
                        <p className="text-red-200/60 text-xs md:text-sm relative z-10 tracking-widest uppercase font-bold group-hover:text-red-100">2 Players VS</p>
                    </button>
                </div>
            ) : (
                <div className="w-full max-w-5xl bg-slate-800/80 backdrop-blur-xl p-6 md:p-10 rounded-3xl border border-slate-600/50 shadow-2xl animate-fade-in flex flex-col max-h-[70vh]">
                    <div className="flex justify-between items-center mb-6 md:mb-8 shrink-0 border-b border-slate-700 pb-4">
                        <div className="flex flex-col">
                            <h2 className="text-2xl md:text-3xl font-bold text-white">Select Topic</h2>
                            <p className="text-slate-400 text-sm">Choose a specific field of study.</p>
                        </div>
                        <button onClick={() => setView('MAIN')} className="text-slate-400 hover:text-white hover:bg-slate-700 px-4 py-2 rounded-full transition-all text-sm md:text-base flex items-center gap-2 font-bold uppercase tracking-wider">
                            <span>←</span> Back
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8 overflow-y-auto flex-1 custom-scrollbar pr-2">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`group relative p-4 md:p-6 rounded-2xl text-center transition-all font-bold text-sm md:text-lg flex flex-col items-center justify-center gap-2 overflow-hidden aspect-video md:aspect-auto h-24 md:h-32 ${
                                    selectedCategory === cat 
                                    ? 'ring-2 ring-blue-500 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] scale-[1.02]' 
                                    : 'hover:ring-1 hover:ring-slate-400/50'
                                }`}
                            >
                                <div 
                                    className={`absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110 ${selectedCategory === cat ? 'opacity-50' : 'opacity-40 grayscale group-hover:grayscale-0'}`}
                                    style={{ backgroundImage: categoryThumbnails[cat] }}
                                ></div>
                                <div className={`absolute inset-0 transition-colors ${selectedCategory === cat ? 'bg-blue-900/30' : 'bg-slate-900/50 group-hover:bg-slate-900/30'}`}></div>

                                <div className="relative z-10 flex flex-col items-center">
                                    <span className="text-white drop-shadow-md text-shadow-sm">{cat}</span>
                                    {selectedCategory === cat && (
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 shadow-[0_0_5px_rgba(96,165,250,1)]"></div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="flex justify-center shrink-0">
                        <button 
                            onClick={() => onStart(GameMode.SUBJECT, selectedCategory, Difficulty.ADVENTURER)}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white text-lg md:text-xl font-black px-12 py-4 md:px-16 md:py-5 rounded-full shadow-[0_0_40px_rgba(59,130,246,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center gap-3 tracking-wide"
                        >
                            Start Quiz <span>🚀</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
