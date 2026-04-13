import { useEffect, useState, useCallback } from 'react';
import { Flame } from 'lucide-react';

interface AbilityTimingProps {
  abilityName: string;
  onFire: (chargeLevel: number) => void;
  maxChargeTime?: number;
}

export function AbilityTiming({ abilityName, onFire, maxChargeTime = 3 }: AbilityTimingProps) {
  const [isCharging, setIsCharging] = useState(false);
  const [chargeLevel, setChargeLevel] = useState(0);
  const [isReady, setIsReady] = useState(true);
  const [hasFired, setHasFired] = useState(false);

  useEffect(() => {
    if (!isCharging || hasFired) return;

    const interval = setInterval(() => {
      setChargeLevel(prev => {
        const newLevel = Math.min(100, prev + (100 / (maxChargeTime * 20)));
        return newLevel;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isCharging, maxChargeTime, hasFired]);

  const startCharging = useCallback(() => {
    if (!isReady || hasFired) return;
    setIsCharging(true);
    setChargeLevel(0);
  }, [isReady, hasFired]);

  const releaseAttack = useCallback(() => {
    if (!isCharging || hasFired) return;
    setIsCharging(false);
    setHasFired(true);
    
    // Bonus for perfect timing (80-95% charge)
    const bonusMultiplier = chargeLevel >= 80 && chargeLevel <= 95 ? 1.2 : 1;
    const finalCharge = Math.min(100, chargeLevel * bonusMultiplier);
    
    onFire(finalCharge);
  }, [isCharging, chargeLevel, onFire, hasFired]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        startCharging();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        releaseAttack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startCharging, releaseAttack]);

  const getChargeColor = () => {
    if (chargeLevel >= 80 && chargeLevel <= 95) return 'hsl(120 100% 45%)'; // Perfect zone - green
    if (chargeLevel > 95) return 'hsl(0 85% 50%)'; // Overcharge - red
    if (chargeLevel >= 50) return 'hsl(50 100% 50%)'; // Good - yellow
    return 'hsl(210 100% 50%)'; // Charging - blue
  };

  return (
    <div className="space-y-4 animate-scale-in">
      <div className="text-center">
        <h3 className="text-xl font-orbitron font-bold text-primary text-glow-atomic">
          {abilityName.toUpperCase()}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Hold SPACE to charge, release at the perfect moment!
        </p>
      </div>

      {/* Charge indicator */}
      <div className="relative h-12 rounded-xl overflow-hidden bg-muted mx-auto max-w-md border-2 border-border">
        {/* Perfect zone marker */}
        <div 
          className="absolute h-full bg-primary/20 border-x-2 border-primary"
          style={{ left: '80%', width: '15%' }}
        />
        
        {/* Charge fill */}
        <div 
          className="h-full transition-all duration-100"
          style={{ 
            width: `${chargeLevel}%`,
            background: `linear-gradient(90deg, hsl(210 100% 50%), ${getChargeColor()})`
          }}
        />
        
        {/* Labels */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <span className="text-xs text-muted-foreground font-medium">CHARGE</span>
          <span className="font-orbitron font-bold text-lg text-foreground drop-shadow-lg">
            {Math.round(chargeLevel)}%
          </span>
          <span className="text-xs text-primary font-medium">PERFECT</span>
        </div>
      </div>

      {/* Fire button */}
      <div className="flex justify-center">
        <button
          onMouseDown={startCharging}
          onMouseUp={releaseAttack}
          onTouchStart={startCharging}
          onTouchEnd={releaseAttack}
          disabled={hasFired}
          className={`relative px-12 py-6 rounded-xl font-orbitron font-bold text-xl transition-all ${
            hasFired
              ? 'bg-primary text-primary-foreground glow-atomic'
              : isCharging
              ? 'bg-monster-orange text-white scale-110'
              : 'bg-primary text-primary-foreground hover:scale-105'
          }`}
          style={{
            boxShadow: isCharging 
              ? `0 0 ${20 + chargeLevel}px ${getChargeColor()}`
              : undefined
          }}
        >
          <Flame className={`w-8 h-8 mx-auto ${isCharging && 'animate-pulse'}`} />
          <span className="block mt-1">
            {hasFired ? 'FIRED!' : isCharging ? 'CHARGING...' : 'HOLD TO CHARGE'}
          </span>
        </button>
      </div>
    </div>
  );
}
