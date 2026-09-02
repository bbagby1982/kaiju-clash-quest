import { useState } from 'react';
import { Monster } from '@/types/game';
import { Star, Lock, Zap, Shield, Gauge, Sparkles, ChevronRight } from 'lucide-react';
import { useRoster } from '@/lib/roster';

// Get hint about monster type based on stats and traits
const getMonsterHints = (monster: Monster): string[] => {
  const hints: string[] = [];

  // Size/power hints based on stats
  if (monster.stats.strength >= 90) hints.push('Massive');
  else if (monster.stats.strength >= 70) hints.push('Powerful');

  if (monster.stats.speed >= 80) hints.push('Swift');
  if (monster.stats.defense >= 85) hints.push('Armored');
  if (monster.stats.specialAttack >= 90) hints.push('Devastating');

  // Terrain hints
  if (monster.terrainBonus?.includes('ocean')) hints.push('Aquatic');
  if (monster.terrainBonus?.includes('volcano')) hints.push('Fire-touched');
  if (monster.terrainBonus?.includes('city')) hints.push('Urban terror');
  if (monster.terrainBonus?.includes('island')) hints.push('Jungle dweller');

  // Rarity hint
  if (monster.rarity === 'legendary') hints.push('Ancient');

  return hints.slice(0, 3);
};

interface EncyclopediaEntryProps {
  monster: Monster;
  isUnlocked: boolean;
  onClick: () => void;
}

const RARITY_TEXT: Record<Monster['rarity'], string> = {
  common: 'text-muted-foreground',
  rare: 'text-electric',
  legendary: 'text-lightning',
};

export function EncyclopediaEntry({ monster, isUnlocked, onClick }: EncyclopediaEntryProps) {
  const roster = useRoster();
  const [failed, setFailed] = useState(false);
  const hints = getMonsterHints(monster);
  const url = roster.imageUrl(monster.id);
  const emoji = roster.fallbackEmoji(monster.id);
  const showArt = !!url && !failed;

  return (
    <button
      type="button"
      onClick={onClick}
      data-rarity={monster.rarity}
      className="kq-card kq-tap w-full p-2.5 flex items-center gap-3"
      aria-label={isUnlocked ? monster.name : 'Undiscovered monster'}
    >
      {/* Art thumbnail / silhouette */}
      <div
        className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center ${monster.rarity === 'legendary' && isUnlocked ? 'holo-shine' : ''}`}
        style={{
          background: isUnlocked
            ? `linear-gradient(160deg, ${monster.imageColor}, hsl(220 25% 6%))`
            : 'linear-gradient(135deg, hsl(220 20% 8%), hsl(220 20% 15%))',
        }}
      >
        {showArt ? (
          <img
            src={url}
            alt={isUnlocked ? monster.name : 'Mystery Monster'}
            loading="lazy"
            draggable={false}
            onError={() => setFailed(true)}
            className={`w-full h-full object-cover ${isUnlocked ? '' : 'kq-locked-art'}`}
          />
        ) : (
          <span className={`text-4xl ${isUnlocked ? '' : 'opacity-20 grayscale'}`} aria-hidden="true">
            {isUnlocked ? emoji : '❓'}
          </span>
        )}

        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-background/80 flex items-center justify-center">
              <span className="text-lg">?</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        {/* Name and Rarity */}
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-orbitron font-bold text-base truncate">
            {isUnlocked ? monster.name : '???'}
          </h3>
          {monster.rarity !== 'common' && (
            <Star className={`w-4 h-4 shrink-0 ${RARITY_TEXT[monster.rarity]} ${isUnlocked ? 'fill-current' : ''}`} />
          )}
        </div>

        {/* Era or Hints */}
        <p className="text-xs text-muted-foreground mb-2 truncate">
          {isUnlocked ? monster.era : hints.join(' • ') || 'Unknown creature...'}
        </p>

        {/* Stats preview or teaser */}
        {isUnlocked ? (
          <div className="flex gap-3">
            <StatMini icon={<Gauge className="w-3 h-3" />} value={monster.stats.speed} color="hsl(var(--electric-blue))" />
            <StatMini icon={<Zap className="w-3 h-3" />} value={monster.stats.strength} color="hsl(var(--monster-red))" />
            <StatMini icon={<Shield className="w-3 h-3" />} value={monster.stats.defense} color="hsl(var(--atomic-green))" />
            <StatMini icon={<Sparkles className="w-3 h-3" />} value={monster.stats.specialAttack} color="hsl(var(--lightning-yellow))" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/70 italic">
            Complete requirements to discover...
          </p>
        )}
      </div>

      {/* Unlock indicator */}
      <div className="shrink-0 pr-1">
        {isUnlocked ? (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Lock className="w-5 h-5 text-muted-foreground/40" />
        )}
      </div>
    </button>
  );
}

function StatMini({ icon, value, color }: { icon: React.ReactNode; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1" style={{ color }}>
      {icon}
      <span className="text-xs font-bold">{value}</span>
    </div>
  );
}
