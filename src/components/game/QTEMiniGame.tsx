import { useEffect, useState, useCallback } from 'react';

interface QTEMiniGameProps {
  onComplete: (success: boolean) => void;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export function QTEMiniGame({ onComplete, difficulty = 'medium' }: QTEMiniGameProps) {
  const [indicatorPosition, setIndicatorPosition] = useState(0);
  const [isMovingRight, setIsMovingRight] = useState(true);
  const [result, setResult] = useState<'pending' | 'success' | 'fail'>('pending');

  const targetConfig = {
    easy: { start: 35, end: 65 },
    medium: { start: 40, end: 60 },
    hard: { start: 45, end: 55 },
  };

  const target = targetConfig[difficulty];
  const speed = { easy: 1.5, medium: 2.5, hard: 3.5 }[difficulty];

  useEffect(() => {
    if (result !== 'pending') return;

    const interval = setInterval(() => {
      setIndicatorPosition(prev => {
        if (isMovingRight) {
          if (prev >= 100) {
            setIsMovingRight(false);
            return 100;
          }
          return prev + speed;
        } else {
          if (prev <= 0) {
            setIsMovingRight(true);
            return 0;
          }
          return prev - speed;
        }
      });
    }, 20);

    return () => clearInterval(interval);
  }, [isMovingRight, result, speed]);

  const handleClick = useCallback(() => {
    if (result !== 'pending') return;

    const success = indicatorPosition >= target.start && indicatorPosition <= target.end;
    setResult(success ? 'success' : 'fail');
    
    setTimeout(() => {
      onComplete(success);
    }, 500);
  }, [indicatorPosition, target, result, onComplete]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        handleClick();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleClick]);

  return (
    <div className="space-y-4 animate-scale-in">
      <div className="text-center">
        <h3 className="text-xl font-orbitron font-bold text-lightning text-glow-yellow">
          TIME YOUR ATTACK!
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Press SPACE or tap when the indicator is in the green zone
        </p>
      </div>

      <div className="qte-zone h-8 relative mx-auto max-w-md">
        {/* Target zone */}
        <div 
          className={`qte-target transition-colors ${
            result === 'success' ? 'bg-primary/50 border-primary' :
            result === 'fail' ? 'bg-destructive/50 border-destructive' :
            'bg-primary/30 border-primary'
          }`}
          style={{ 
            left: `${target.start}%`, 
            width: `${target.end - target.start}%` 
          }}
        />
        
        {/* Moving indicator */}
        <div 
          className={`qte-indicator w-2 transition-all ${
            result === 'success' ? 'bg-primary' :
            result === 'fail' ? 'bg-destructive' :
            'bg-lightning'
          }`}
          style={{ left: `${indicatorPosition}%` }}
        />
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleClick}
          disabled={result !== 'pending'}
          className={`px-8 py-4 rounded-xl font-orbitron font-bold text-lg transition-all ${
            result === 'success' 
              ? 'bg-primary text-primary-foreground glow-atomic' 
              : result === 'fail'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-lightning text-lightning-foreground hover:scale-105 glow-battle animate-pulse-scale'
          }`}
        >
          {result === 'pending' ? 'STRIKE!' : result === 'success' ? 'PERFECT!' : 'MISSED!'}
        </button>
      </div>
    </div>
  );
}
