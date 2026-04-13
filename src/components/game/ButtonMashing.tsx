import { useEffect, useState, useCallback } from 'react';
import { Zap } from 'lucide-react';

interface ButtonMashingProps {
  targetPresses: number;
  timeLimit: number; // seconds
  onComplete: (success: boolean, percentage: number) => void;
}

export function ButtonMashing({ targetPresses, timeLimit, onComplete }: ButtonMashingProps) {
  const [presses, setPresses] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [isComplete, setIsComplete] = useState(false);

  const percentage = Math.min(100, (presses / targetPresses) * 100);
  const success = percentage >= 80;

  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0.1) {
          setIsComplete(true);
          onComplete(success, percentage);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isComplete, success, percentage, onComplete]);

  const handlePress = useCallback(() => {
    if (isComplete) return;
    setPresses(prev => prev + 1);
  }, [isComplete]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePress();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePress]);

  return (
    <div className="space-y-4 animate-scale-in">
      <div className="text-center">
        <h3 className="text-xl font-orbitron font-bold text-monster-orange">
          POWER UP!
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Mash SPACE or tap rapidly to charge your attack!
        </p>
      </div>

      {/* Timer */}
      <div className="text-center">
        <span className="text-3xl font-orbitron font-bold text-foreground">
          {timeRemaining.toFixed(1)}s
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-8 rounded-full overflow-hidden bg-muted mx-auto max-w-md">
        <div 
          className="h-full transition-all duration-100 ease-out"
          style={{ 
            width: `${percentage}%`,
            background: percentage >= 80 
              ? 'linear-gradient(90deg, hsl(120 100% 45%), hsl(180 100% 40%))'
              : percentage >= 50
              ? 'linear-gradient(90deg, hsl(50 100% 50%), hsl(35 100% 50%))'
              : 'linear-gradient(90deg, hsl(0 85% 50%), hsl(25 100% 55%))'
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-orbitron font-bold text-sm text-foreground drop-shadow-lg">
            {presses} / {targetPresses}
          </span>
        </div>
      </div>

      {/* Mash Button */}
      <div className="flex justify-center">
        <button
          onClick={handlePress}
          disabled={isComplete}
          className={`relative w-32 h-32 rounded-full font-orbitron font-bold text-xl transition-all ${
            isComplete
              ? success 
                ? 'bg-primary text-primary-foreground glow-atomic'
                : 'bg-destructive text-destructive-foreground'
              : 'bg-monster-orange text-white hover:scale-110 active:scale-95'
          }`}
          style={{
            boxShadow: isComplete 
              ? undefined 
              : `0 0 ${20 + percentage * 0.5}px hsl(25 100% 55% / ${0.3 + percentage * 0.005})`
          }}
        >
          <Zap className={`w-12 h-12 mx-auto ${!isComplete && 'animate-pulse'}`} />
          <span className="block text-sm mt-1">
            {isComplete ? (success ? 'CHARGED!' : 'WEAK') : 'MASH!'}
          </span>
        </button>
      </div>
    </div>
  );
}
