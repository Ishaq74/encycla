
import React, { useMemo } from 'react';
import { QuestionData } from '../types';

interface ArticleViewerProps {
  data: QuestionData;
  onContinue: () => void;
}

export const ArticleViewer: React.FC<ArticleViewerProps> = ({ data, onContinue }) => {
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    if (target.dataset.errorHandled) return;
    target.dataset.errorHandled = "true";
    
    const bgColors = ["1e3a8a", "065f46", "7f1d1d", "581c87", "0f172a", "431407"];
    const randomColor = bgColors[Math.floor(Math.random() * bgColors.length)];
    // Fallback safe subject
    const subject = data.subject && data.subject.trim() !== "" ? data.subject : "Specimen";
    target.src = `https://placehold.co/800x600/${randomColor}/FFFFFF?text=${encodeURIComponent(subject)}`;
  };

  const readingTime = useMemo(() => {
     // Approx reading speed 200 wpm
     const words = (data.articleBody + data.explanation).split(' ').length;
     const mins = Math.ceil(words / 200);
     return mins < 1 ? 1 : mins;
  }, [data.articleBody, data.explanation]);

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in duration-700 overflow-hidden bg-[#f8f5f0] text-slate-900 font-serif-encarta relative">
       {/* Background Paper Texture */}
       <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-0" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}></div>

       {/* Elegant Header - Compact on Mobile */}
       <div className="bg-[#1e3a8a] px-3 py-3 md:px-8 md:py-6 shrink-0 border-b-4 border-[#fbbf24] shadow-lg flex items-center justify-between relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-blue-700 via-blue-900 to-slate-900 opacity-100"></div>
          
          {/* Abstract decorative pattern */}
          <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 pointer-events-none">
             <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                 <path d="M0 0 L100 0 L100 100 Z" fill="white" />
             </svg>
          </div>
          
          <div className="relative z-10 flex flex-col gap-1">
            <div className="flex items-center gap-3">
                 <span className="bg-[#fbbf24] text-slate-900 px-2 py-0.5 text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase font-sans rounded-sm shadow-sm">Encyclopedia Entry</span>
                 <span className="text-blue-200 text-[9px] md:text-[11px] font-sans opacity-80 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-blue-300"></span> 
                    {readingTime} min read
                 </span>
            </div>
            <h1 className="text-xl md:text-4xl font-serif-encarta font-bold text-white tracking-wide drop-shadow-md leading-tight line-clamp-1 md:line-clamp-none">
                {data.articleTitle}
            </h1>
          </div>
          
          <div className="hidden md:flex flex-col items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 relative z-10 shadow-[0_0_15px_rgba(255,255,255,0.1)] group cursor-help">
              <span className="text-2xl group-hover:scale-110 transition-transform duration-300">📖</span>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar relative z-0">
            <div className="max-w-3xl mx-auto bg-white shadow-[0_4px_30px_-5px_rgba(0,0,0,0.1)] p-5 md:p-14 min-h-full border-x border-gray-200/50 relative pb-24 md:pb-16">
                
                {/* Decorative Corner */}
                <div className="absolute top-0 right-0 w-12 h-12 md:w-20 md:h-20 overflow-hidden pointer-events-none opacity-60">
                    <div className="absolute top-0 right-0 bg-[#fbbf24] w-3 h-3 md:w-5 md:h-5 z-20"></div>
                    <div className="absolute top-3 md:top-5 right-0 bg-[#1e3a8a] w-1.5 h-8 md:h-16"></div>
                    <div className="absolute top-0 right-3 md:right-5 bg-[#1e3a8a] w-8 md:w-16 h-1.5"></div>
                </div>

                <div className="flex flex-col gap-4 md:gap-10 mb-4 md:mb-10">
                     {data.base64Image && (
                         <div className="w-full md:float-right md:w-5/12 md:ml-8 mb-4 md:mb-2">
                            <div className="p-2 bg-white border border-gray-200 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.15)] -rotate-1 hover:rotate-0 transition-transform duration-700 ease-out group">
                                <div className="relative overflow-hidden w-full h-56 md:h-auto md:aspect-auto">
                                    <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.05)] pointer-events-none z-10"></div>
                                    <img 
                                        src={data.base64Image} 
                                        alt={data.articleTitle}
                                        onError={handleImageError}
                                        className="w-full h-full object-contain md:object-cover bg-slate-100 grayscale-[5%] sepia-[10%] contrast-[1.05] transition-all duration-700 group-hover:grayscale-0 group-hover:sepia-0"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-center mt-2 md:mt-3 gap-2 opacity-70">
                                <div className="h-px w-6 md:w-8 bg-gray-300"></div>
                                <p className="text-[9px] md:text-[11px] text-gray-500 font-serif-encarta italic text-center tracking-wide">
                                    Fig 1. {data.subject && data.subject.trim() !== "" ? data.subject : "Specimen"}
                                </p>
                                <div className="h-px w-6 md:w-8 bg-gray-300"></div>
                            </div>
                         </div>
                     )}

                     <div className="block">
                        {/* Summary Box */}
                        <div className="bg-[#fffbeb] border-l-4 border-[#d97706] p-4 md:p-8 mb-6 md:mb-10 rounded-r-lg shadow-sm relative overflow-hidden">
                             {/* Faint pattern in background of summary */}
                             <div className="absolute right-2 bottom-0 text-[#d97706] opacity-[0.05] text-9xl leading-none font-serif translate-y-4 translate-x-4 pointer-events-none">”</div>
                             <div className="absolute left-0 top-0 text-[#d97706] opacity-[0.05] text-9xl leading-none font-serif -translate-y-4 -translate-x-2 pointer-events-none">“</div>
                            
                            <h3 className="text-[#b45309] text-xs font-bold uppercase tracking-widest mb-2">Quick Fact</h3>
                            <p className="text-gray-800 italic text-base md:text-xl font-serif-encarta leading-relaxed relative z-10">
                                {data.explanation}
                            </p>
                        </div>
                        
                        {/* Main Body */}
                        <div className="font-serif-encarta text-base md:text-lg leading-7 md:leading-8 text-gray-700 text-justify">
                             {/* Elegant Drop Cap */}
                            <span className="float-left text-[4rem] md:text-[5rem] font-bold text-[#1e3a8a] mr-3 md:mr-4 mt-[-12px] md:mt-[-18px] font-serif leading-none opacity-90 select-none drop-shadow-sm font-serif-encarta">
                                {data.articleBody.charAt(0)}
                            </span>
                            <span dangerouslySetInnerHTML={{ __html: data.articleBody.substring(1) }} />
                        </div>
                     </div>
                </div>
                
                {/* Footer of the page */}
                <div className="mt-8 pt-6 md:mt-24 md:pt-12 border-t border-gray-100 flex flex-col items-center opacity-70">
                    <div className="text-gray-300 text-xl md:text-3xl mb-2 md:mb-4">❦</div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        <p className="text-[9px] md:text-[11px] text-gray-500 uppercase tracking-[0.2em] font-sans font-bold">
                            Verified Knowledge • Encarta MindMaze
                        </p>
                    </div>
                </div>
            </div>
       </div>

       {/* Action Bar - Fixed at bottom */}
       <div className="p-4 md:p-6 border-t border-gray-200 bg-white/90 backdrop-blur-md shrink-0 flex justify-between items-center font-sans z-50 shadow-[0_-5px_30px_rgba(0,0,0,0.05)]">
            <div className="text-slate-400 text-xs hidden md:flex items-center gap-2 uppercase tracking-widest font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Interactive Archive Access
            </div>
            <button 
                onClick={onContinue}
                className="group bg-slate-900 hover:bg-blue-900 text-white w-full md:w-auto justify-center px-8 py-3.5 md:pl-10 md:pr-8 md:py-4 rounded-full shadow-lg hover:shadow-blue-900/30 hover:-translate-y-1 active:translate-y-0 active:shadow-md transition-all duration-300 font-bold text-sm md:text-lg flex items-center gap-3 ml-auto"
            >
                Continue Journey
                <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </button>
       </div>
    </div>
  );
};
