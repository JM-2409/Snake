'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play, RotateCcw, Trophy, Pause } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const GAME_SPEED = 120; // ms per tick

type Point = { x: number; y: number };

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game state in refs for performance and avoiding stale closures
  const snakeRef = useRef<Point[]>([...INITIAL_SNAKE]);
  const directionRef = useRef<Point>({ ...INITIAL_DIRECTION });
  const nextDirectionRef = useRef<Point>({ ...INITIAL_DIRECTION });
  const foodRef = useRef<Point>({ x: 5, y: 5 });
  const isGameOverRef = useRef(false);
  const isPausedRef = useRef(true);
  const scoreRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastRenderTimeRef = useRef<number>(0);

  // React state for UI
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [canvasSize, setCanvasSize] = useState(300);

  // Resize canvas based on container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        // Keep it square, max 400px
        const size = Math.min(width - 32, 400); 
        setCanvasSize(size);
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const spawnFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    let isOccupied = true;
    while (isOccupied) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      isOccupied = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
    }
    foodRef.current = newFood!;
  }, []);

  const handleGameOver = useCallback(() => {
    isGameOverRef.current = true;
    setGameOver(true);
    setIsPaused(true);
    isPausedRef.current = true;
    
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('snakeHighScore', scoreRef.current.toString());
    }
  }, [highScore]);

  const resetGame = useCallback(() => {
    snakeRef.current = [...INITIAL_SNAKE];
    directionRef.current = { ...INITIAL_DIRECTION };
    nextDirectionRef.current = { ...INITIAL_DIRECTION };
    scoreRef.current = 0;
    isGameOverRef.current = false;
    
    setScore(0);
    setGameOver(false);
    spawnFood(snakeRef.current);
    
    if (hasStarted) {
      isPausedRef.current = false;
      setIsPaused(false);
    }
  }, [hasStarted, spawnFood]);

  const togglePause = useCallback(() => {
    if (isGameOverRef.current) {
      resetGame();
      setHasStarted(true);
      isPausedRef.current = false;
      setIsPaused(false);
      return;
    }
    
    if (!hasStarted) {
      setHasStarted(true);
    }
    
    const newPausedState = !isPausedRef.current;
    isPausedRef.current = newPausedState;
    setIsPaused(newPausedState);
  }, [hasStarted, resetGame]);

  const changeDirection = useCallback((newDir: Point) => {
    const currentDir = directionRef.current;
    // Prevent 180 degree turns
    if (newDir.x !== 0 && currentDir.x !== 0) return;
    if (newDir.y !== 0 && currentDir.y !== 0) return;
    
    nextDirectionRef.current = newDir;
    
    // If game is paused but started, unpause on direction input
    if (isPausedRef.current && hasStarted && !isGameOverRef.current) {
      isPausedRef.current = false;
      setIsPaused(false);
    }
  }, [hasStarted]);

  const update = useCallback(() => {
    if (isPausedRef.current || isGameOverRef.current) return;

    const currentSnake = snakeRef.current;
    const head = currentSnake[0];
    const direction = nextDirectionRef.current;
    directionRef.current = direction;

    const newHead = {
      x: head.x + direction.x,
      y: head.y + direction.y,
    };

    // Wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE
    ) {
      handleGameOver();
      return;
    }

    // Self collision
    if (currentSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
      handleGameOver();
      return;
    }

    const newSnake = [newHead, ...currentSnake];

    // Food collision
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      spawnFood(newSnake);
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
  }, [handleGameOver, spawnFood]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellSize = width / GRID_SIZE;

    // Clear canvas
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(width, i * cellSize);
      ctx.stroke();
    }

    // Draw Food (Neon Pink)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff007f';
    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.arc(
      foodRef.current.x * cellSize + cellSize / 2,
      foodRef.current.y * cellSize + cellSize / 2,
      cellSize / 2 - 2,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // Draw Snake (Neon Green)
    ctx.shadowBlur = 10;
    
    snakeRef.current.forEach((segment, index) => {
      if (index === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
      } else {
        ctx.fillStyle = '#39ff14';
        ctx.shadowColor = '#39ff14';
      }
      
      // Slightly smaller rects for gaps between segments
      ctx.fillRect(
        segment.x * cellSize + 1,
        segment.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
    });

    // Reset shadow
    ctx.shadowBlur = 0;
  }, []);

  const loop = useCallback(function gameLoop(currentTime: number) {
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);

    const secondsSinceLastRender = (currentTime - lastRenderTimeRef.current) / 1000;
    if (secondsSinceLastRender < GAME_SPEED / 1000) return;

    lastRenderTimeRef.current = currentTime;

    update();
    draw();
  }, [update, draw]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          changeDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          changeDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          changeDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          changeDirection({ x: 1, y: 0 });
          break;
        case ' ':
          togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, togglePause]);

  // Swipe controls for mobile
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    
    const dx = touchEndX - touchStartRef.current.x;
    const dy = touchEndY - touchStartRef.current.y;
    
    // Require a minimum swipe distance
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (dx > 0) changeDirection({ x: 1, y: 0 });
      else changeDirection({ x: -1, y: 0 });
    } else {
      // Vertical swipe
      if (dy > 0) changeDirection({ x: 0, y: 1 });
      else changeDirection({ x: 0, y: -1 });
    }
    
    touchStartRef.current = null; // Reset to prevent multiple triggers
  };

  // Initialize game
  useEffect(() => {
    const savedScore = localStorage.getItem('snakeHighScore');
    if (savedScore) {
      setHighScore(parseInt(savedScore, 10));
    }
    
    spawnFood(snakeRef.current);
    animationFrameIdRef.current = requestAnimationFrame(loop);
    
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [loop, spawnFood]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-4 select-none">
      {/* Header / Scoreboard */}
      <div className="w-full flex justify-between items-center mb-6 px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-lg backdrop-blur-sm">
        <div className="flex flex-col">
          <span className="text-zinc-500 text-xs uppercase tracking-wider font-bold">Score</span>
          <span className="text-3xl font-mono text-[#39ff14] drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]">
            {score}
          </span>
        </div>
        
        <button 
          onClick={togglePause}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors border border-zinc-700"
        >
          {gameOver ? <RotateCcw size={24} /> : isPaused ? <Play size={24} /> : <Pause size={24} />}
        </button>

        <div className="flex flex-col items-end">
          <span className="text-zinc-500 text-xs uppercase tracking-wider font-bold flex items-center gap-1">
            <Trophy size={12} /> Best
          </span>
          <span className="text-xl font-mono text-[#ff007f] drop-shadow-[0_0_8px_rgba(255,0,127,0.5)]">
            {highScore}
          </span>
        </div>
      </div>

      {/* Game Canvas Container */}
      <div 
        ref={containerRef}
        className="relative w-full flex justify-center items-center bg-[#050505] rounded-xl overflow-hidden border-2 border-zinc-800 shadow-[0_0_30px_rgba(57,255,20,0.1)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={{ touchAction: 'none' }} // Prevent scrolling while swiping
      >
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="block"
        />
        
        {/* Overlays */}
        {(!hasStarted || gameOver || (isPaused && hasStarted && !gameOver)) && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            {gameOver ? (
              <div className="text-center animate-in fade-in zoom-in duration-300">
                <h2 className="text-4xl font-black text-[#ff007f] uppercase tracking-widest drop-shadow-[0_0_15px_rgba(255,0,127,0.8)] mb-2">
                  Game Over
                </h2>
                <p className="text-zinc-300 mb-6 font-mono">Final Score: {score}</p>
                <button 
                  onClick={resetGame}
                  className="px-8 py-3 bg-transparent border-2 border-[#39ff14] text-[#39ff14] font-bold rounded-full uppercase tracking-wider hover:bg-[#39ff14]/10 transition-colors shadow-[0_0_15px_rgba(57,255,20,0.3)]"
                >
                  Play Again
                </button>
              </div>
            ) : !hasStarted ? (
              <div className="text-center">
                <h1 className="text-5xl font-black text-[#39ff14] uppercase tracking-widest drop-shadow-[0_0_15px_rgba(57,255,20,0.8)] mb-8">
                  Snake
                </h1>
                <button 
                  onClick={togglePause}
                  className="px-8 py-3 bg-[#39ff14] text-black font-black rounded-full uppercase tracking-wider hover:bg-[#32e012] transition-colors shadow-[0_0_20px_rgba(57,255,20,0.6)]"
                >
                  Start Game
                </button>
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white tracking-widest mb-6">
                  PAUSED
                </h2>
                <button 
                  onClick={togglePause}
                  className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-full uppercase tracking-wider hover:bg-white/10 transition-colors"
                >
                  Resume
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile D-Pad Controls */}
      <div className="mt-8 grid grid-cols-3 gap-2 w-48 sm:hidden">
        <div />
        <button 
          onClick={() => changeDirection({ x: 0, y: -1 })}
          className="w-14 h-14 bg-zinc-800/80 rounded-xl flex items-center justify-center text-white active:bg-zinc-700 active:scale-95 transition-all border border-zinc-700 shadow-lg"
        >
          <ArrowUp size={28} />
        </button>
        <div />
        <button 
          onClick={() => changeDirection({ x: -1, y: 0 })}
          className="w-14 h-14 bg-zinc-800/80 rounded-xl flex items-center justify-center text-white active:bg-zinc-700 active:scale-95 transition-all border border-zinc-700 shadow-lg"
        >
          <ArrowLeft size={28} />
        </button>
        <button 
          onClick={() => changeDirection({ x: 0, y: 1 })}
          className="w-14 h-14 bg-zinc-800/80 rounded-xl flex items-center justify-center text-white active:bg-zinc-700 active:scale-95 transition-all border border-zinc-700 shadow-lg"
        >
          <ArrowDown size={28} />
        </button>
        <button 
          onClick={() => changeDirection({ x: 1, y: 0 })}
          className="w-14 h-14 bg-zinc-800/80 rounded-xl flex items-center justify-center text-white active:bg-zinc-700 active:scale-95 transition-all border border-zinc-700 shadow-lg"
        >
          <ArrowRight size={28} />
        </button>
      </div>
      
      <p className="mt-8 text-zinc-500 text-sm hidden sm:block text-center">
        Use <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300">WASD</kbd> or <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300">Arrow Keys</kbd> to move.<br/>
        Press <kbd className="bg-zinc-800 px-2 py-1 rounded text-zinc-300">Space</kbd> to pause.
      </p>
    </div>
  );
}
