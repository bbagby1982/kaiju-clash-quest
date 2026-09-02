import { Monster } from '@/types/game';
import { MonsterSprite } from './MonsterSprite';

interface RaceMonsterProps {
  monster: Monster;
  position: number;
  lane: number;
  /** How many lanes the track has; the sprite is centred in lane `lane` of `laneCount`. */
  laneCount?: number;
  isPlayer: boolean;
  isBoosting: boolean;
  isHit: boolean;
  terrain: string;
  /** The race is over and this monster crossed the line first — plays the victory pose. */
  isWinner?: boolean;
}

export function RaceMonster({
  monster,
  position,
  lane,
  laneCount = 4,
  isPlayer,
  isBoosting,
  isHit,
  terrain,
  isWinner = false,
}: RaceMonsterProps) {
  const hasTerrainBonus = monster.terrainBonus?.includes(terrain);
  const spriteState = isWinner ? 'victory' : isHit ? 'hit' : 'run';

  return (
    <div
      className="race-monster absolute transition-[left] duration-100 ease-linear"
      style={{
        left: `${position}%`,
        top: `${(lane + 0.5) * (100 / laneCount)}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isPlayer ? 20 : 10,
      }}
    >
      {/* Terrain bonus aura */}
      {hasTerrainBonus && (
        <div className="absolute inset-0 -m-3 rounded-full bg-primary/30 animate-pulse blur-md" aria-hidden="true" />
      )}

      {/* Speed boost effect */}
      {isBoosting && (
        <>
          <div className="absolute right-full top-1/2 -translate-y-1/2 w-16 h-1 bg-gradient-to-l from-lightning to-transparent animate-pulse" aria-hidden="true" />
          <div className="absolute right-full top-1/3 -translate-y-1/2 w-12 h-0.5 bg-gradient-to-l from-lightning/70 to-transparent animate-pulse" style={{ animationDelay: '0.1s' }} aria-hidden="true" />
          <div className="absolute right-full top-2/3 -translate-y-1/2 w-12 h-0.5 bg-gradient-to-l from-lightning/70 to-transparent animate-pulse" style={{ animationDelay: '0.2s' }} aria-hidden="true" />
          <div className="absolute inset-0 -m-2 rounded-full bg-lightning/40 blur-lg animate-pulse" aria-hidden="true" />
        </>
      )}

      <div className={`relative ${isPlayer ? 'race-monster--you' : ''}`}>
        <MonsterSprite monster={monster} side="left" state={spriteState} size="sm" shadow dim={isHit} />

        {isPlayer && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full z-10 shadow">
            YOU
          </div>
        )}
      </div>

      {/* Name label */}
      <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium ${
        isPlayer ? 'text-primary' : 'text-muted-foreground'
      }`}>
        {monster.name.split(' ')[0]}
      </div>
    </div>
  );
}
