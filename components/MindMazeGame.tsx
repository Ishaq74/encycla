
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameMode, Difficulty, Category, QuestionData, PlayerStats } from '../types';
import { fetchFullQuestion } from '../services/geminiService';
import { ArticleViewer } from './ArticleViewer';
import { LOADING_MESSAGES, CATEGORIES, QUESTIONS_PER_LEVEL, TOTAL_LEVELS_CLASSIC, MAX_LIVES } from '../constants';

interface MindMazeGameProps {
  mode: GameMode;
  initialDifficulty: Difficulty;
  initialCategory: Category | null;
  onExit: () => void;
}

interface ContestAnswer {
    choiceIndex: number;
    timestamp: number;
    responseTime: number;
}

export const MindMazeGame: React.FC<MindMazeGameProps> = ({ mode, initialDifficulty, initialCategory, onExit }) => {
  const [status, setStatus] = useState<GameState>(GameState.LOADING);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  
  const [stats, setStats] = useState<PlayerStats>({ score: 0, level: 1, questionsAnswered: 0, lives: MAX_LIVES });
  const [streak, setStreak] = useState(0); // Streak State
  const [addedScore, setAddedScore] = useState<{val: number, key: number} | null>(null); // Floating score
  
  const [p2Score, setP2Score] = useState(0);
  const [contestRounds, setContestRounds] = useState(0);
  const TOTAL_CONTEST_ROUNDS = 10;

  const [isLobby, setIsLobby] = useState(mode === GameMode.CONTEST);
  const [p1Ready, setP1Ready] = useState(false);
  const [p2Ready, setP2Ready] = useState(false);
  const [lobbyCountdown, setLobbyCountdown] = useState<number | null>(null);

  const [timer, setTimer] = useState(20);
  const [p1Answer, setP1Answer] = useState<ContestAnswer | null>(null);
  const [p2Answer, setP2Answer] = useState<ContestAnswer | null>(null);
  const [roundRevealed, setRoundRevealed] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const getLevelConfig = useCallback(() => {
     if (mode === GameMode.SUBJECT) {
         return { difficulty: initialDifficulty, category: initialCategory! };
     }
     let diff = Difficulty.NOVICE;
     if (stats.level >= 4 || contestRounds > 4) diff = Difficulty.ADVENTURER;
     if (stats.level >= 8 || contestRounds > 8) diff = Difficulty.WIZARD;
     const randomCat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
     return { difficulty: diff, category: randomCat };
  }, [mode, initialDifficulty, initialCategory, stats.level, contestRounds]);

  const loadQuestion = useCallback(async () => {
    if (!isLobby) {
        setStatus(GameState.LOADING);
    }
    
    setError(null);
    setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    setSelectedOption(null);
    setAddedScore(null);
    
    setP1Answer(null);
    setP2Answer(null);
    setRoundRevealed(false);
    setTimer(20); 

    try {
      const config = getLevelConfig();
      const data = await fetchFullQuestion(config.category, config.difficulty);
      setCurrentQuestion(data);
      
      if (!isLobby) {
        setStatus(GameState.PLAYING);
        // Start timer for both modes to track response time
        startTimeRef.current = Date.now();
      }
    } catch (e) {
      console.error("Failed to load question", e);
      setError("Connection interrupted. Unable to retrieve question.");
    }
  }, [getLevelConfig, mode, isLobby]);

  useEffect(() => {
    loadQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
      if (!isLobby) return;

      const handleLobbyKeys = (e: KeyboardEvent) => {
          if (['1', '&'].includes(e.key)) setP1Ready(true);
          if (['0', 'à', '@'].includes(e.key)) setP2Ready(true);
      };

      window.addEventListener('keydown', handleLobbyKeys);
      return () => window.removeEventListener('keydown', handleLobbyKeys);
  }, [isLobby]);

  useEffect(() => {
      if (isLobby && p1Ready && p2Ready && lobbyCountdown === null) {
          setLobbyCountdown(3);
      }
  }, [isLobby, p1Ready, p2Ready, lobbyCountdown]);

  useEffect(() => {
      if (lobbyCountdown === null) return;

      if (lobbyCountdown > 0) {
          const timeout = setTimeout(() => setLobbyCountdown(prev => (prev !== null ? prev - 1 : null)), 1000);
          return () => clearTimeout(timeout);
      } else if (lobbyCountdown === 0) {
          setIsLobby(false);
          setStatus(GameState.PLAYING);
          startTimeRef.current = Date.now();
      }
  }, [lobbyCountdown]);

  useEffect(() => {
      if (status !== GameState.PLAYING || roundRevealed || isLobby) return;

      // Timer logic for both modes (Classic uses it for bonus calc, Contest for timeout)
      timerRef.current = window.setInterval(() => {
          setTimer((prev) => {
              if (prev <= 0) {
                  if (mode === GameMode.CONTEST) {
                      handleRoundEnd();
                  } else {
                      // Classic Timeout - treat as wrong answer or just no bonus? 
                      // For now, let's just let it sit at 0, no auto-fail in Classic yet, just 0 bonus
                  }
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);

      return () => {
          if (timerRef.current) clearInterval(timerRef.current);
      };
  }, [mode, status, roundRevealed, isLobby]);

  useEffect(() => {
      if (mode !== GameMode.CONTEST || roundRevealed || isLobby) return;

      const p1Done = !!p1Answer;
      const p2Done = !!p2Answer;

      if (p1Done && p2Done) {
          handleRoundEnd();
          return;
      }
      if ((p1Done || p2Done) && timer > 7) {
          setTimer(7);
      }
  }, [p1Answer, p2Answer, mode, roundRevealed, isLobby, timer]);

  useEffect(() => {
      if (mode !== GameMode.CONTEST || status !== GameState.PLAYING || roundRevealed || isLobby) return;

      const handleKeyDown = (e: KeyboardEvent) => {
          const now = Date.now();
          const responseTime = (now - startTimeRef.current) / 1000;
          const k = e.key.toLowerCase();

          if (!p1Answer) {
              const p1Map: Record<string, number> = {
                  '1': 0, '&': 0,
                  '2': 1, 'é': 1,
                  '3': 2, '"': 2,
                  '4': 3, "'": 3, '(': 4
              };
              if (p1Map.hasOwnProperty(e.key) || p1Map.hasOwnProperty(k)) {
                  const idx = p1Map[e.key] !== undefined ? p1Map[e.key] : p1Map[k];
                  if (idx >= 0 && idx <= 3) {
                    setP1Answer({ choiceIndex: idx, timestamp: timer, responseTime });
                  }
              }
          }

          if (!p2Answer) {
            const p2Map: Record<string, number> = {
                '7': 0, 'è': 0,
                '8': 1, '_': 1, '!': 1,
                '9': 2, 'ç': 2,
                '0': 3, 'à': 3, '@': 3
            };
            if (p2Map.hasOwnProperty(e.key) || p2Map.hasOwnProperty(k)) {
                const idx = p2Map[e.key] !== undefined ? p2Map[e.key] : p2Map[k];
                if (idx >= 0 && idx <= 3) {
                    setP2Answer({ choiceIndex: idx, timestamp: timer, responseTime });
                }
            }
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, status, roundRevealed, p1Answer, p2Answer, timer, isLobby]);


  const handleRoundEnd = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setRoundRevealed(true);

      if (!currentQuestion) return;

      setTimeout(() => {
        let p1Points = 0;
        let p2Points = 0;

        const p1Idx = p1Answer?.choiceIndex ?? -1;
        const p2Idx = p2Answer?.choiceIndex ?? -1;
        const correct = currentQuestion.correctAnswerIndex;

        const p1Correct = p1Idx === correct;
        const p2Correct = p2Idx === correct;

        if (p1Correct) p1Points += 1000;
        if (p2Correct) p2Points += 1000;

        if (p1Correct && p2Correct) {
            if (p1Answer!.responseTime < p2Answer!.responseTime) {
                p1Points += 200;
            } else {
                p2Points += 200;
            }
        }

        setStats(prev => ({ ...prev, score: prev.score + p1Points }));
        setP2Score(prev => prev + p2Points);

        setTimeout(() => {
            setStatus(GameState.ARTICLE);
        }, 3500); 
      }, 100);
  };

  const handleClassicAnswer = (index: number) => {
    if (!currentQuestion) return;
    
    // Stop the timer visual
    if (timerRef.current) clearInterval(timerRef.current);
    
    setSelectedOption(index);
    const isCorrect = index === currentQuestion.correctAnswerIndex;
    
    const now = Date.now();
    const responseTime = (now - startTimeRef.current) / 1000;

    if (isCorrect) {
        // Scoring Algorithm
        const baseScore = 100 * stats.level;
        const streakBonus = streak * 20; // +20 per streak level
        // Speed bonus: Max 50 if <3s, drops to 0 after 13s
        const speedBonus = Math.max(0, Math.round(50 - Math.max(0, responseTime - 3) * 5)); 
        
        const totalPoints = baseScore + streakBonus + speedBonus;
        
        setStats(prev => ({ 
            ...prev, 
            score: prev.score + totalPoints,
            questionsAnswered: prev.questionsAnswered + 1
        }));
        setStreak(prev => prev + 1);
        setAddedScore({ val: totalPoints, key: Date.now() }); // Trigger animation
        setTimeout(() => setStatus(GameState.ARTICLE), 1500);
    } else {
        setStreak(0);
        setStats(prev => ({ ...prev, lives: prev.lives - 1 }));
        if (stats.lives - 1 <= 0) {
            setTimeout(() => setStatus(GameState.GAME_OVER), 1500);
        } else {
            setTimeout(() => setStatus(GameState.ARTICLE), 1500);
        }
    }
  };

  const handleContinue = () => {
    if (mode === GameMode.CONTEST) {
        if (contestRounds + 1 >= TOTAL_CONTEST_ROUNDS) {
             setStatus(GameState.VICTORY);
        } else {
             setContestRounds(prev => prev + 1);
             loadQuestion();
        }
    } else {
        if (stats.questionsAnswered >= QUESTIONS_PER_LEVEL) {
            if (mode === GameMode.SUBJECT || stats.level >= TOTAL_LEVELS_CLASSIC) {
                setStatus(GameState.VICTORY);
            } else {
                setStatus(GameState.LEVEL_COMPLETE);
            }
        } else {
            loadQuestion();
        }
    }
  };

  const handleNextLevel = () => {
      setStats(prev => ({
          ...prev,
          level: prev.level + 1,
          questionsAnswered: 0,
          lives: MAX_LIVES
      }));
      setStreak(0);
      loadQuestion();
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    if (target.dataset.errorHandled) return;
    target.dataset.errorHandled = "true";

    const bgColors = ["1e3a8a", "065f46", "7f1d1d", "581c87", "0f172a", "431407"];
    const randomColor = bgColors[Math.floor(Math.random() * bgColors.length)];
    const displayText = currentQuestion?.subject || "Subject Unavailable";
    target.src = `https://placehold.co/800x600/${randomColor}/FFFFFF?text=${encodeURIComponent(displayText)}`;
  };

  if (isLobby) {
      return (
        <div className="h-full w-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black"></div>
            <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
            
            <div className="z-10 text-center mb-12">
                <h1 className="text-4xl md:text-7xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-red-400 drop-shadow-lg">
                    VS MODE
                </h1>
                <p className="text-blue-200/70 text-xl tracking-[0.5em] uppercase mt-3 font-light">Simultaneous Battle</p>
            </div>

            <div className="flex w-full max-w-4xl h-[350px] gap-6 z-10 px-8">
                <div className={`flex-1 rounded-3xl border-2 flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden backdrop-blur-sm ${p1Ready ? 'bg-blue-900/30 border-blue-400 shadow-[0_0_60px_-10px_rgba(59,130,246,0.5)] scale-105' : 'bg-slate-800/30 border-slate-700/50'}`}>
                    <div className="text-7xl mb-6 transition-transform duration-300 transform hover:scale-110 filter drop-shadow-lg">{p1Ready ? '👨‍🚀' : '👤'}</div>
                    <h2 className="text-2xl font-bold text-blue-400 mb-3 tracking-widest">PLAYER 1</h2>
                    
                    {p1Ready ? (
                        <div className="bg-blue-500 text-white px-8 py-2 rounded-full font-bold shadow-lg animate-bounce tracking-wide text-sm">READY</div>
                    ) : (
                        <div className="animate-pulse text-slate-400 text-sm">Press <span className="border border-slate-600 px-2 py-1 rounded-md bg-slate-900 mx-1 font-mono text-white shadow-inner">1</span></div>
                    )}
                </div>

                <div className="flex flex-col items-center justify-center w-20 shrink-0">
                    {lobbyCountdown !== null ? (
                        <span className="text-7xl font-black text-yellow-400 animate-ping drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">{lobbyCountdown === 0 ? 'GO' : lobbyCountdown}</span>
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                            <span className="text-xl font-black text-slate-500 italic">VS</span>
                        </div>
                    )}
                </div>

                <div className={`flex-1 rounded-3xl border-2 flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden backdrop-blur-sm ${p2Ready ? 'bg-red-900/30 border-red-400 shadow-[0_0_60px_-10px_rgba(239,68,68,0.5)] scale-105' : 'bg-slate-800/30 border-slate-700/50'}`}>
                    <div className="text-7xl mb-6 transition-transform duration-300 transform hover:scale-110 filter drop-shadow-lg">{p2Ready ? '🧛‍♀️' : '👤'}</div>
                    <h2 className="text-2xl font-bold text-red-400 mb-3 tracking-widest">PLAYER 2</h2>
                    
                    {p2Ready ? (
                        <div className="bg-red-500 text-white px-8 py-2 rounded-full font-bold shadow-lg animate-bounce tracking-wide text-sm">READY</div>
                    ) : (
                        <div className="animate-pulse text-slate-400 text-sm">Press <span className="border border-slate-600 px-2 py-1 rounded-md bg-slate-900 mx-1 font-mono text-white shadow-inner">0</span></div>
                    )}
                </div>
            </div>

             <button onClick={onExit} className="absolute top-8 right-8 text-slate-500 hover:text-white z-20 font-bold tracking-wider uppercase text-xs transition-colors">
                Exit Lobby
            </button>
        </div>
      );
  }

  if (error) {
      return (
          <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-white p-8">
              <div className="text-red-400 text-6xl mb-6 opacity-80 animate-pulse">⚠️</div>
              <h2 className="text-3xl font-bold mb-3">Signal Lost</h2>
              <p className="text-slate-400 mb-8 text-center max-w-md text-lg leading-relaxed">{error}</p>
              <div className="flex gap-4">
                <button onClick={loadQuestion} className="bg-blue-700 px-8 py-3 rounded-full font-bold hover:bg-blue-600 transition-all shadow-lg">Retry Connection</button>
                <button onClick={onExit} className="bg-slate-800 px-8 py-3 rounded-full font-bold hover:bg-slate-700 transition-all">Abort</button>
              </div>
          </div>
      );
  }

  if (status === GameState.LOADING) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="relative w-24 h-24 mb-10">
            <div className="absolute inset-0 border-[6px] border-slate-800/50 rounded-full"></div>
            <div className="absolute inset-0 border-[6px] border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-4 bg-slate-900 rounded-full flex items-center justify-center text-2xl">🧠</div>
        </div>
        <p className="text-lg font-medium tracking-[0.3em] uppercase text-blue-200/80 animate-pulse">{loadingMsg}</p>
      </div>
    );
  }

  if (status === GameState.LEVEL_COMPLETE) {
      return (
          <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-white p-8 animate-in fade-in zoom-in duration-500 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 to-slate-950"></div>
              <div className="relative z-10">
                <div className="w-24 h-1.5 bg-gradient-to-r from-green-400 to-emerald-600 mb-8 rounded-full mx-auto shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                <h1 className="text-5xl md:text-6xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-white to-emerald-400 drop-shadow-sm">Level {stats.level} Complete</h1>
                <p className="text-2xl mb-12 text-emerald-100/60 font-serif-encarta italic">Knowledge index updated.</p>
                <button 
                    onClick={handleNextLevel} 
                    className="group relative px-12 py-4 bg-emerald-600 text-white rounded-full text-xl font-bold shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-105 transition-all hover:bg-emerald-500"
                >
                    Proceed to Level {stats.level + 1}
                    <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-hover:opacity-100"></span>
                </button>
              </div>
          </div>
      );
  }

  if (status === GameState.GAME_OVER) {
     return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-white p-8 text-center animate-in fade-in duration-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 to-slate-950"></div>
            <div className="relative z-10">
                <h1 className="text-6xl md:text-8xl font-black mb-8 text-red-600 tracking-tighter opacity-90 drop-shadow-2xl">GAME OVER</h1>
                <div className="bg-slate-900/80 backdrop-blur-md p-10 rounded-3xl border border-slate-800 shadow-2xl mb-12 w-full max-w-md mx-auto">
                    <p className="text-slate-400 uppercase tracking-[0.3em] text-xs font-bold mb-4">Final Score</p>
                    <p className="text-6xl font-mono text-white font-bold tracking-tight">{stats.score}</p>
                </div>
                <button 
                    onClick={onExit} 
                    className="px-10 py-3 border border-slate-700 bg-transparent hover:bg-slate-800 hover:border-slate-500 rounded-full text-lg transition-all text-slate-300 font-medium"
                >
                    Return to Main Menu
                </button>
            </div>
        </div>
     )
  }

  if (status === GameState.VICTORY) {
    if (mode === GameMode.CONTEST) {
        const p1Wins = stats.score > p2Score;
        const draw = stats.score === p2Score;
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-white p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-black"></div>
                <div className="relative z-10">
                    <h1 className="text-6xl md:text-9xl font-black mb-8 tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 drop-shadow-2xl">
                        {draw ? "DRAW" : (p1Wins ? "P1 WINS" : "P2 WINS")}
                    </h1>
                    <div className="flex gap-16 md:gap-32 my-16 items-end justify-center">
                        <div className={`text-center transition-all duration-700 ${p1Wins ? 'scale-125 translate-y-[-20px]' : 'opacity-50 scale-90'}`}>
                            <div className="text-blue-400 text-xl font-bold mb-4 tracking-widest uppercase">Player 1</div>
                            <div className="text-6xl md:text-8xl font-black bg-slate-900/50 p-4 rounded-2xl border border-blue-500/30">{stats.score}</div>
                        </div>
                        <div className={`text-center transition-all duration-700 ${!p1Wins && !draw ? 'scale-125 translate-y-[-20px]' : 'opacity-50 scale-90'}`}>
                            <div className="text-red-400 text-xl font-bold mb-4 tracking-widest uppercase">Player 2</div>
                            <div className="text-6xl md:text-8xl font-black bg-slate-900/50 p-4 rounded-2xl border border-red-500/30">{p2Score}</div>
                        </div>
                    </div>
                    <button 
                        onClick={onExit} 
                        className="px-12 py-4 bg-white text-slate-900 font-black text-xl rounded-full hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-transform"
                    >
                        Finish Contest
                    </button>
                </div>
            </div>
        )
    }

    return (
       <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-white p-8 text-center relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 to-slate-950"></div>
           <div className="relative z-10">
               <div className="text-7xl mb-6 animate-bounce">🏆</div>
               <h1 className="text-6xl md:text-8xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 tracking-tight drop-shadow-lg">Victory!</h1>
               <p className="text-2xl mb-12 text-yellow-100/60 font-serif-encarta italic max-w-2xl mx-auto">You have successfully navigated the labyrinth of knowledge.</p>
               <div className="bg-slate-900/50 px-12 py-8 rounded-3xl border border-yellow-500/30 mb-12 backdrop-blur-sm shadow-2xl">
                 <p className="text-sm text-yellow-500/80 uppercase tracking-[0.3em] mb-2 font-bold">Total Score</p>
                 <p className="text-6xl font-bold font-mono text-yellow-50">{stats.score}</p>
               </div>
               <button 
                    onClick={onExit} 
                    className="px-12 py-4 bg-yellow-500 text-slate-900 font-bold text-xl rounded-full hover:bg-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all hover:-translate-y-1"
                >
                    Play Again
                </button>
           </div>
       </div>
    )
 }

  if (!currentQuestion) return null;

  return (
    <div className={`flex flex-col h-full bg-[#0f172a] text-white overflow-hidden font-sans transition-colors duration-1000`}>
      
      {mode === GameMode.CONTEST ? (
        // Hide header on mobile if in ARTICLE mode to maximize reading space
        <div className={`${status === GameState.ARTICLE ? 'hidden md:flex' : 'flex'} h-24 bg-[#1e293b] border-b border-slate-800 justify-between items-center px-4 md:px-8 shadow-xl z-20 shrink-0 relative`}>
             <div className={`flex flex-col items-start w-48 transition-all duration-300 bg-slate-900/50 p-2 rounded-xl border border-transparent ${p1Answer && !roundRevealed ? 'border-blue-500/50 bg-blue-900/20' : ''}`}>
                 <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                    <span className="text-blue-400 font-bold text-[10px] tracking-[0.2em] uppercase">PLAYER 1</span>
                 </div>
                 <span className="text-3xl font-black font-mono tracking-tight text-slate-100">{stats.score}</span>
                 {p1Answer && !roundRevealed && (
                     <span className="absolute top-full left-4 mt-2 text-[10px] font-bold bg-blue-600 text-white px-3 py-1 rounded-full shadow-lg animate-in fade-in slide-in-from-top-2">LOCKED IN</span>
                 )}
             </div>

             <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
                <div className="bg-slate-900 rounded-2xl px-6 py-2 border border-slate-700 shadow-inner relative overflow-hidden">
                    <div className={`text-5xl font-black font-mono tabular-nums leading-none ${timer <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-200'}`}>
                        {timer}
                    </div>
                    {/* Progress bar inside timer */}
                    <div className="absolute bottom-0 left-0 h-1 bg-slate-700 w-full">
                        <div 
                            className={`h-full transition-all duration-1000 linear ${timer <= 5 ? 'bg-red-500' : 'bg-blue-500'}`} 
                            style={{ width: `${(timer / 20) * 100}%` }}
                        ></div>
                    </div>
                </div>
             </div>

             <div className={`flex flex-col items-end w-48 transition-all duration-300 bg-slate-900/50 p-2 rounded-xl border border-transparent ${p2Answer && !roundRevealed ? 'border-red-500/50 bg-red-900/20' : ''}`}>
                 <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-400 font-bold text-[10px] tracking-[0.2em] uppercase">PLAYER 2</span>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                 </div>
                 <span className="text-3xl font-black font-mono tracking-tight text-slate-100">{p2Score}</span>
                 {p2Answer && !roundRevealed && (
                     <span className="absolute top-full right-4 mt-2 text-[10px] font-bold bg-red-600 text-white px-3 py-1 rounded-full shadow-lg animate-in fade-in slide-in-from-top-2">LOCKED IN</span>
                 )}
             </div>
        </div>
      ) : (
         // CLASSIC / SUBJECT MODE HEADER
        <div className={`${status === GameState.ARTICLE ? 'hidden md:flex' : 'flex'} h-16 md:h-20 bg-[#1e293b]/95 backdrop-blur-lg border-b border-slate-700/50 justify-between items-center px-4 md:px-6 shadow-lg z-20 shrink-0 relative overflow-hidden`}>
            {/* Visual Timer Bar at the very top */}
             <div className="absolute top-0 left-0 w-full h-0.5 bg-slate-800">
                <div 
                    className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${(timer / 20) * 100}%`, opacity: timer < 10 ? 1 : 0.5 }}
                ></div>
            </div>

            <div className="flex gap-4 md:gap-8 font-medium text-slate-300 items-center">
                <div className="flex flex-col">
                    <span className="text-slate-500 uppercase text-[8px] md:text-[10px] font-bold tracking-wider mb-0.5">Level</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg md:text-xl leading-none font-bold text-white">{stats.level}</span>
                        <span className="text-[10px] md:text-xs text-slate-600">/ {TOTAL_LEVELS_CLASSIC}</span>
                    </div>
                </div>
                <div className="w-px h-6 md:h-8 bg-slate-700/50"></div>
                <div className="flex flex-col relative">
                    <span className="text-slate-500 uppercase text-[8px] md:text-[10px] font-bold tracking-wider mb-0.5">Score</span>
                    <span className="text-lg md:text-xl leading-none font-bold text-emerald-400 drop-shadow-sm">{stats.score}</span>
                    
                    {/* Floating Score Animation */}
                    {addedScore && (
                        <div key={addedScore.key} className="absolute -right-24 -top-6 text-emerald-300 font-black text-2xl animate-out fade-out slide-out-to-top-8 duration-1000 pointer-events-none drop-shadow-lg z-50 whitespace-nowrap">
                            +{addedScore.val}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Streak Indicator */}
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
                {streak > 1 ? (
                    <div className="bg-gradient-to-r from-orange-900/40 to-red-900/40 border border-orange-500/50 px-4 py-1.5 rounded-full flex items-center gap-2 animate-in zoom-in bounce-in duration-300 shadow-[0_0_15px_rgba(234,88,12,0.3)]">
                        <span className="text-xl animate-pulse filter drop-shadow-lg">🔥</span>
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[8px] text-orange-300 font-bold uppercase tracking-wider">Combo</span>
                            <span className="text-orange-400 font-black font-mono text-lg tracking-widest">
                                x{streak}
                            </span>
                        </div>
                    </div>
                ) : (
                     <div className="bg-slate-800/80 px-4 py-1.5 md:px-6 md:py-2 rounded-full border border-slate-700 shadow-sm backdrop-blur-sm hidden md:block opacity-60">
                        <span className="text-slate-300 text-[10px] md:text-xs font-bold uppercase tracking-[0.15em]">
                            {initialCategory ? initialCategory : "Classic Mode"}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-end">
                <span className="text-slate-500 uppercase text-[8px] md:text-[10px] font-bold tracking-wider mb-1.5">Lives</span>
                <div className="flex gap-1.5 md:gap-2">
                    {Array.from({length: MAX_LIVES}).map((_, i) => (
                        <div key={i} className={`w-6 h-1.5 md:w-8 md:h-2 rounded-full transition-all duration-500 ${i < stats.lives ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)] scale-100' : 'bg-slate-800 scale-90 opacity-50'}`}></div>
                    ))}
                </div>
            </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
         
         {/* Image Area - Responsive Height
             Mobile: 40vh (as requested 40/60 split)
             Tablet: 50vh (50/50 split vertical)
             Desktop: Flex-1 (Side by Side) 
             Fixed aspect ratio handling to prevent distortion
         */}
         <div className={`w-full lg:w-1/2 relative bg-[#020617] flex items-center justify-center p-4 md:p-8 shrink-0
            ${status === GameState.ARTICLE ? 'hidden lg:flex' : 'flex'}
            h-[40vh] md:h-[50vh] lg:h-auto border-b lg:border-b-0 lg:border-r border-slate-800
         `}>
             {/* Textured Background */}
             <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%231e293b\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}></div>
             
             {/* Vignette Effect */}
             <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_10%,#020617_95%)] z-10"></div>
             
             {currentQuestion.base64Image && (
                <div className="relative z-0 w-full h-full flex items-center justify-center transition-all duration-1000 animate-in fade-in zoom-in-90 slide-in-from-bottom-4">
                    {/* Slide Frame / Projector Look */}
                    <div className="group relative bg-white p-2 md:p-3 md:pb-8 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] rotate-0 lg:rotate-1 hover:rotate-0 transition-transform duration-500 ease-out rounded-sm flex flex-col items-center justify-center max-h-full max-w-full">
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-200 opacity-50 pointer-events-none"></div>
                        <div className="relative overflow-hidden bg-black flex items-center justify-center w-auto h-auto">
                             <img 
                                src={currentQuestion.base64Image} 
                                alt={currentQuestion.subject}
                                onError={handleImageError}
                                className={`max-w-full max-h-[35vh] md:max-h-[42vh] lg:max-h-[60vh] w-auto h-auto object-contain transition-opacity duration-500`}
                            />
                            {/* Subtle scanlines */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 pointer-events-none bg-[length:100%_4px,6px_100%] opacity-20"></div>
                        </div>
                        <div className="hidden md:block absolute bottom-2 right-4 font-mono text-[10px] text-slate-400 opacity-60 tracking-widest">
                            FIG.{currentQuestion.base64Image.length % 999}
                        </div>
                    </div>
                </div>
             )}
         </div>

         {/* Right Panel - Controls */}
         <div className="flex-1 lg:w-1/2 bg-[#1e293b] flex flex-col z-20 shadow-2xl relative min-h-0">
            
            {status === GameState.ARTICLE ? (
                <ArticleViewer data={currentQuestion} onContinue={handleContinue} />
            ) : (
                <div className="w-full h-full flex flex-col justify-center p-4 md:p-10 overflow-y-auto custom-scrollbar">
                    <div className="max-w-2xl mx-auto w-full">
                        <div className="mb-4 md:mb-10 text-center">
                            <div className="inline-flex items-center gap-2 mb-2 md:mb-4 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-slate-800/80 border border-slate-700 shadow-sm">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-400 animate-pulse"></span>
                                <h3 className="text-slate-300 font-bold tracking-widest uppercase text-[10px] md:text-xs">
                                    {mode === GameMode.CONTEST ? `ROUND ${contestRounds + 1} OF ${TOTAL_CONTEST_ROUNDS}` : `QUESTION ${stats.questionsAnswered + 1} / ${QUESTIONS_PER_LEVEL}`}
                                </h3>
                            </div>
                            <h2 className="text-lg md:text-3xl font-serif-encarta font-medium text-slate-100 leading-snug drop-shadow-md">
                                {currentQuestion.questionText}
                            </h2>
                        </div>

                        {/* 
                           Responsive Grid:
                           - Mobile (grid-cols-1): Stacked
                           - Tablet (md:grid-cols-2): 2 Columns side by side
                           - Desktop (lg:grid-cols-1): Back to 1 column because width is 50%
                        */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
                            {Array.isArray(currentQuestion.options) ? currentQuestion.options.map((opt, idx) => {
                                let btnClass = "bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700 hover:border-slate-500 hover:text-white";
                                let textClass = "";
                                const isCorrect = idx === currentQuestion.correctAnswerIndex;
                                
                                const p1Key = idx + 1;
                                const p2Key = idx === 3 ? 0 : idx + 7;

                                // Winner / Loser calculation for Contest Mode
                                const p1Correct = p1Answer?.choiceIndex === currentQuestion.correctAnswerIndex;
                                const p2Correct = p2Answer?.choiceIndex === currentQuestion.correctAnswerIndex;
                                
                                const p1Faster = p1Correct && p2Correct && (p1Answer!.responseTime < p2Answer!.responseTime);
                                const p2Faster = p1Correct && p2Correct && (p2Answer!.responseTime < p1Answer!.responseTime);
                                
                                const showP1Win = roundRevealed && isCorrect && p1Correct && (p1Faster || !p2Correct);
                                const showP2Win = roundRevealed && isCorrect && p2Correct && (p2Faster || !p1Correct);

                                if (mode === GameMode.CONTEST) {
                                    if (roundRevealed) {
                                        if (isCorrect) {
                                            btnClass = "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] z-20";
                                        } else {
                                            btnClass = "bg-slate-900/30 text-slate-600 border-transparent opacity-30 grayscale";
                                        }
                                        
                                        // Strike through if wrong choice selected
                                        if (p1Answer?.choiceIndex === idx && !isCorrect) {
                                            btnClass = "bg-blue-900/20 border-blue-800/50 text-slate-500";
                                            textClass = "line-through decoration-blue-500 decoration-2";
                                        }
                                        if (p2Answer?.choiceIndex === idx && !isCorrect) {
                                            btnClass = "bg-red-900/20 border-red-800/50 text-slate-500";
                                            textClass = "line-through decoration-red-500 decoration-2";
                                        }
                                    }
                                } else {
                                    // Classic Mode
                                    const isSelected = selectedOption === idx;
                                    if (selectedOption !== null) {
                                        if (isSelected) {
                                            btnClass = isCorrect 
                                                ? "bg-emerald-600 text-white border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-[1.02] z-10" 
                                                : "bg-rose-600 text-white border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] shake-animation z-10";
                                        } else if (isCorrect) {
                                            btnClass = "bg-emerald-900/20 text-emerald-400 border-emerald-500/30";
                                        } else {
                                            btnClass = "bg-slate-900/30 text-slate-600 border-transparent opacity-30 grayscale";
                                        }
                                    }
                                }

                                return (
                                    <button 
                                        key={idx}
                                        onClick={() => mode !== GameMode.CONTEST && !selectedOption && handleClassicAnswer(idx)}
                                        disabled={mode === GameMode.CONTEST ? true : selectedOption !== null}
                                        className={`group relative py-3 md:py-4 px-4 md:px-6 rounded-xl md:rounded-2xl text-left text-sm md:text-lg font-medium flex items-center justify-between transition-all duration-200 border ${btnClass} shadow-md active:scale-[0.99] h-full`}
                                    >
                                        {/* P1 Key Hint */}
                                        {mode === GameMode.CONTEST && (
                                            <div className={`w-8 shrink-0 mr-3 transition-opacity duration-300 ${roundRevealed ? 'opacity-0' : 'opacity-100'}`}>
                                                <span className="text-[10px] font-mono font-bold bg-slate-900/80 px-2 py-1 rounded-md text-blue-400 border border-slate-700 shadow-sm">
                                                    {p1Key}
                                                </span>
                                            </div>
                                        )}

                                        <div className={`flex-1 flex items-center pr-16 ${textClass}`}>
                                            <span className={`inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full text-xs mr-3 md:mr-4 font-bold border transition-colors duration-200 shrink-0 ${selectedOption === idx || (mode === GameMode.CONTEST && roundRevealed && isCorrect) ? 'bg-white text-black border-white' : 'bg-slate-900/50 text-slate-400 border-slate-600 group-hover:border-slate-400 group-hover:text-slate-200'}`}>
                                                {String.fromCharCode(65 + idx)}
                                            </span> 
                                            {opt}
                                        </div>

                                        {/* P2 Key Hint */}
                                        {mode === GameMode.CONTEST && (
                                            <div className={`w-8 shrink-0 ml-3 flex justify-end transition-opacity duration-300 ${roundRevealed ? 'opacity-0' : 'opacity-100'}`}>
                                                <span className="text-[10px] font-mono font-bold bg-slate-900/80 px-2 py-1 rounded-md text-red-400 border border-slate-700 shadow-sm">
                                                    {p2Key}
                                                </span>
                                            </div>
                                        )}

                                        {/* Contest Results Avatars - ALWAYS SHOW TIME IF SELECTED */}
                                        {mode === GameMode.CONTEST && roundRevealed && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3 z-30 pointer-events-none">
                                                {/* P1 Result on this button */}
                                                {p1Answer?.choiceIndex === idx && (
                                                    <div className="flex items-center gap-2 animate-in zoom-in duration-300">
                                                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap border ${p1Answer.choiceIndex === currentQuestion.correctAnswerIndex ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-900 text-blue-400 border-blue-900'}`}>
                                                            {p1Answer.responseTime.toFixed(3)}s
                                                        </div>
                                                        <div className="relative">
                                                            <div className="w-9 h-9 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-base shadow-blue-600/50 z-10">
                                                                👨‍🚀
                                                            </div>
                                                            {showP1Win && <div className="absolute -bottom-2 -right-2 text-xl drop-shadow-md animate-bounce">👍</div>}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* P2 Result on this button */}
                                                {p2Answer?.choiceIndex === idx && (
                                                    <div className="flex items-center gap-2 animate-in zoom-in duration-300 delay-75">
                                                        <div className="relative">
                                                            <div className="w-9 h-9 bg-red-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-base shadow-red-600/50 z-10">
                                                                🧛‍♀️
                                                            </div>
                                                            {showP2Win && <div className="absolute -bottom-2 -right-2 text-xl drop-shadow-md animate-bounce">👍</div>}
                                                        </div>
                                                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap border ${p2Answer.choiceIndex === currentQuestion.correctAnswerIndex ? 'bg-red-600 text-white border-red-400' : 'bg-slate-900 text-red-400 border-red-900'}`}>
                                                            {p2Answer.responseTime.toFixed(3)}s
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                )
                            }) : (
                                <div className="text-red-400 text-center">Error: Invalid options</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
         </div>

      </div>
    </div>
  );
};
