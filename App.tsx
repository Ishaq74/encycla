import React, { useState } from 'react';
import { GameState, GameMode, Category, Difficulty } from './types';
import { EncyclopediaHome } from './components/EncyclopediaHome';
import { MindMazeGame } from './components/MindMazeGame';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [mode, setMode] = useState<GameMode>(GameMode.CLASSIC);
  const [category, setCategory] = useState<Category | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NOVICE);

  const handleStartGame = (selectedMode: GameMode, selectedCat: Category | null, selectedDiff: Difficulty) => {
    setMode(selectedMode);
    setCategory(selectedCat);
    setDifficulty(selectedDiff);
    setGameState(GameState.PLAYING);
  };

  const handleExit = () => {
    setGameState(GameState.MENU);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden font-sans select-none touch-none">
        {gameState === GameState.MENU ? (
            <EncyclopediaHome onStart={handleStartGame} />
        ) : (
            <MindMazeGame 
                mode={mode}
                initialCategory={category}
                initialDifficulty={difficulty}
                onExit={handleExit} 
            />
        )}
    </div>
  );
};

export default App;