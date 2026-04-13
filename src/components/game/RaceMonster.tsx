import { Monster } from '@/types/game';
import { useMemo } from 'react';
import { getMonsterImage, getMonsterFallbackEmoji } from '@/lib/monsterImages';

interface RaceMonsterProps {
  monster: Monster;
  position: number;
  lane: number;
  isPlayer: boolean;
  isBoosting: boolean;
  isHit: boolean;
  terrain: string;
}

export function RaceMonster({
  monster,
  position,
  lane,
  isPlayer,
  isBoosting,
  isHit,
  terrain,
}: RaceMonsterProps) {
  const hasTerrainBonus = monster.terrainBonus?.includes(terrain);
  
  const monsterImage = useMemo(() => getMonsterImage(monster.id), [monster.id]);
  const fallbackEmoji = useMemo(() => getMonsterFallbackEmoji(monster.id, monster.name), [monster.id, monster.name]);

  return (
    <div
      className={`absolute transition-all duration-100 ${isHit ? 'animate-shake' : ''}`}
      style={{
        left: `${position}%`,
        top: `${lane * 25 + 15}%`,
        transform: 'translateX(-50%)',
        zIndex: isPlayer ? 20 : 10,
      }}
    >
      {/* Terrain bonus aura */}
      {hasTerrainBonus && (
        <div className="absolute inset-0 -m-3 rounded-full bg-primary/30 animate-pulse blur-md" />
      )}
      
      {/* Speed boost effect */}
      {isBoosting && (
        <>
          {/* Speed lines */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 w-20 h-1 bg-gradient-to-l from-lightning to-transparent animate-pulse" />
          <div className="absolute right-full top-1/3 -translate-y-1/2 w-16 h-0.5 bg-gradient-to-l from-lightning/70 to-transparent animate-pulse" style={{ animationDelay: '0.1s' }} />
          <div className="absolute right-full top-2/3 -translate-y-1/2 w-16 h-0.5 bg-gradient-to-l from-lightning/70 to-transparent animate-pulse" style={{ animationDelay: '0.2s' }} />
          
          {/* Glow effect */}
          <div className="absolute inset-0 -m-2 rounded-full bg-lightning/40 blur-lg animate-pulse" />
        </>
      )}
      
      {/* Monster container */}
      <div
        className={`relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex items-center justify-center ${
          isPlayer ? 'ring-2 ring-primary glow-atomic' : ''
        } ${isBoosting ? 'animate-pulse-scale' : ''}`}
        style={{ background: monster.imageColor }}
      >
        {/* Monster image or fallback emoji */}
        {monsterImage ? (
          <img
            src={monsterImage}
            alt={monster.name}
            className={`w-full h-full object-cover ${
              isHit ? 'opacity-50' : ''
            } ${isBoosting ? 'brightness-125' : ''}`}
          />
        ) : (
          <span className={`text-3xl md:text-4xl ${isHit ? 'opacity-50' : ''}`}>
            {fallbackEmoji}
          </span>
        )}
        
        {/* Player indicator */}
        {isPlayer && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
            YOU
          </div>
        )}
        
        {/* Hit flash overlay */}
        {isHit && (
          <div className="absolute inset-0 bg-destructive/50 animate-pulse" />
        )}
      </div>
      
      {/* Name label */}
      <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium ${
        isPlayer ? 'text-primary' : 'text-muted-foreground'
      }`}>
        {monster.name.split(' ')[0]}
      </div>
    </div>
  );
}
