import { RaceObstacle as RaceObstacleType } from '@/data/maps';
import { AlertTriangle, Waves, CircleDot, TreeDeciduous, Gauge } from 'lucide-react';

interface RaceObstacleProps {
  obstacle: RaceObstacleType;
  position: number;
  isActive: boolean;
  playerPosition: number;
}

export function RaceObstacleVisual({ obstacle, position, isActive, playerPosition }: RaceObstacleProps) {
  const distanceToPlayer = position - playerPosition;
  const isApproaching = distanceToPlayer > 0 && distanceToPlayer < 15;
  const opacity = isApproaching ? 1 : 0.5;
  
  return (
    <div
      className={`absolute transition-all duration-300 ${isActive ? 'animate-shake z-30' : 'z-10'}`}
      style={{
        left: `${position}%`,
        top: '45%',
        transform: 'translate(-50%, -50%)',
        opacity,
      }}
    >
      {/* Warning indicator when approaching */}
      {isApproaching && !isActive && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce">
          <AlertTriangle className="w-6 h-6 text-lightning" />
        </div>
      )}
      
      {/* Obstacle visual based on type */}
      <ObstacleIcon type={obstacle.type} isActive={isActive} />
      
      {/* Danger zone indicator */}
      {isActive && (
        <div className="absolute inset-0 -m-4 rounded-full border-2 border-destructive animate-pulse" />
      )}
    </div>
  );
}

function ObstacleIcon({ type, isActive }: { type: string; isActive: boolean }) {
  const baseClasses = `w-12 h-12 md:w-16 md:h-16 rounded-lg flex items-center justify-center ${
    isActive ? 'bg-destructive/80' : 'bg-muted/60'
  } backdrop-blur-sm border ${isActive ? 'border-destructive' : 'border-border'}`;
  
  const iconClasses = `w-8 h-8 ${isActive ? 'text-destructive-foreground animate-pulse' : 'text-muted-foreground'}`;

  switch (type) {
    case 'wave':
      return (
        <div className={baseClasses}>
          <div className="relative">
            <Waves className={iconClasses} />
            {isActive && (
              <div className="absolute inset-0 -m-2">
                {/* Wave animation */}
                <div className="absolute inset-0 border-2 border-[hsl(200_80%_60%)] rounded-full animate-ping opacity-50" />
              </div>
            )}
          </div>
        </div>
      );
      
    case 'whirlpool':
      return (
        <div className={`${baseClasses} ${isActive ? 'animate-spin-slow' : ''}`}>
          <CircleDot className={iconClasses} />
          {isActive && (
            <>
              <div className="absolute inset-0 -m-2 border-2 border-[hsl(210_80%_50%)] rounded-full animate-whirlpool-spin opacity-60" />
              <div className="absolute inset-0 -m-4 border border-[hsl(210_60%_40%)] rounded-full animate-whirlpool-spin opacity-30" style={{ animationDirection: 'reverse' }} />
            </>
          )}
        </div>
      );
      
    case 'debris':
      return (
        <div className={baseClasses}>
          <div className="relative">
            <div className="w-8 h-8 bg-[hsl(30_30%_40%)] rounded-sm transform rotate-12" />
            <div className="absolute top-1 left-1 w-4 h-4 bg-[hsl(30_25%_35%)] rounded-sm transform -rotate-6" />
            {isActive && (
              <div className="absolute inset-0 -m-1 bg-destructive/30 rounded animate-pulse" />
            )}
          </div>
        </div>
      );
      
    case 'kelp':
      return (
        <div className={baseClasses}>
          <TreeDeciduous className={`${iconClasses} text-[hsl(120_40%_40%)]`} />
          {isActive && (
            <div className="absolute inset-0 -m-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-8 bg-[hsl(120_50%_35%)] rounded-full animate-wave-sway"
                  style={{
                    left: `${20 + i * 20}%`,
                    top: '50%',
                    transformOrigin: 'bottom',
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      );
      
    case 'pressure':
      return (
        <div className={baseClasses}>
          <Gauge className={iconClasses} />
          {isActive && (
            <>
              <div className="absolute inset-0 -m-3 bg-gradient-radial from-transparent to-destructive/30 rounded-full animate-pulse" />
              <div className="absolute inset-0 -m-6 border border-destructive/50 rounded-full animate-ping" />
            </>
          )}
        </div>
      );
      
    default:
      return (
        <div className={baseClasses}>
          <AlertTriangle className={iconClasses} />
        </div>
      );
  }
}

export function ObstacleQTE({
  obstacle,
  onSuccess,
  onFail,
  timeRemaining,
}: {
  obstacle: RaceObstacleType;
  onSuccess: () => void;
  onFail: () => void;
  timeRemaining: number;
}) {
  const getQTEInstruction = () => {
    switch (obstacle.qteType) {
      case 'jump':
        return { key: 'SPACE', instruction: 'Jump over it!' };
      case 'dodge':
        return { key: '← or →', instruction: 'Dodge left or right!' };
      case 'smash':
        return { key: 'SPACE x5', instruction: 'Smash through!' };
      default:
        return { key: 'SPACE', instruction: 'React!' };
    }
  };

  const { key, instruction } = getQTEInstruction();

  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 bg-background/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border-2 border-destructive rounded-xl p-6 text-center animate-scale-in max-w-sm mx-4">
        <h3 className="text-2xl font-orbitron font-bold text-destructive mb-2">
          {obstacle.description}
        </h3>
        
        <p className="text-foreground mb-4">{instruction}</p>
        
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="px-4 py-2 bg-muted rounded-lg font-mono font-bold text-xl text-foreground">
            {key}
          </span>
        </div>
        
        {/* Timer bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-destructive transition-all duration-100"
            style={{ width: `${(timeRemaining / 1.5) * 100}%` }}
          />
        </div>
        
        <p className="text-sm text-muted-foreground mt-2">
          {timeRemaining.toFixed(1)}s
        </p>
      </div>
    </div>
  );
}
