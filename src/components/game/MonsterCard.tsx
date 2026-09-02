import { useState } from 'react';
import { Monster } from '@/types/game';
import { Zap, Shield, Gauge, Star, Lock } from 'lucide-react';
import { useRoster } from '@/lib/roster';

interface MonsterCardProps {
  monster: Monster;
  isSelected?: boolean;
  isLocked?: boolean;
  onClick?: () => void;
  showStats?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/** Height of the full-bleed art window per card size. */
const ART_HEIGHT: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-24 sm:h-28',
  md: 'h-32 sm:h-36',
  lg: 'h-40 sm:h-48',
};

const NAME_SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-[0.72rem]',
  md: 'text-sm',
  lg: 'text-base',
};

const RARITY_TEXT: Record<Monster['rarity'], string> = {
  common: 'text-muted-foreground',
  rare: 'text-electric',
  legendary: 'text-lightning',
};

export function MonsterCard({
  monster,
  isSelected,
  isLocked,
  onClick,
  showStats = true,
  size = 'md',
}: MonsterCardProps) {
  const roster = useRoster();
  const [failed, setFailed] = useState(false);
  const url = roster.imageUrl(monster.id);
  const emoji = roster.fallbackEmoji(monster.id);
  const showArt = !!url && !failed;

  // Stat bars are a "big card" affordance only — small tiles stay art-forward.
  const withStats = showStats && size === 'lg' && !isLocked;

  const body = (
    <>
      {/* ── Art ─────────────────────────────────────────────────────────── */}
      <div
        className={`kq-card-art ${ART_HEIGHT[size]} ${monster.rarity === 'legendary' && !isLocked ? 'holo-shine' : ''}`}
        style={{
          background: `linear-gradient(160deg, ${monster.imageColor}, hsl(220 25% 6%))`,
        }}
      >
        {showArt ? (
          <img
            src={url}
            alt={isLocked ? 'Locked monster' : monster.name}
            loading="lazy"
            draggable={false}
            className={isLocked ? 'kq-locked-art' : ''}
            onError={() => setFailed(true)}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center ${isLocked ? 'opacity-20 grayscale' : ''}`}
          >
            <span className={size === 'lg' ? 'text-6xl' : size === 'md' ? 'text-5xl' : 'text-4xl'} aria-hidden="true">
              {emoji}
            </span>
          </div>
        )}

        {/* Rarity pip */}
        {!isLocked && monster.rarity !== 'common' && (
          <span className={`kq-rarity-pip ${RARITY_TEXT[monster.rarity]}`}>
            <Star className="w-3 h-3 fill-current" />
            {monster.rarity === 'legendary' ? 'LEGEND' : 'RARE'}
          </span>
        )}

        {/* Locked veil */}
        {isLocked && (
          <div className="kq-locked-veil">
            <Lock className="w-7 h-7 text-muted-foreground" />
          </div>
        )}

        {/* Name plate rides on top of the art */}
        <div className="kq-plate">
          <h3 className={`kq-plate-name ${NAME_SIZE[size]} ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
            {isLocked ? '???' : monster.name}
          </h3>
          <p className="text-[0.65rem] text-muted-foreground truncate">
            {isLocked ? 'Locked' : monster.title}
          </p>
        </div>
      </div>

      {/* ── Stats (large cards only) ────────────────────────────────────── */}
      {withStats && (
        <div className="p-3 space-y-2">
          <StatBar icon={<Gauge className="w-3 h-3" />} label="SPD" value={monster.stats.speed} color="hsl(var(--electric-blue))" />
          <StatBar icon={<Zap className="w-3 h-3" />} label="STR" value={monster.stats.strength} color="hsl(var(--monster-red))" />
          <StatBar icon={<Shield className="w-3 h-3" />} label="DEF" value={monster.stats.defense} color="hsl(var(--atomic-green))" />

          <div className="mt-2 p-2 rounded-lg bg-primary/10 border border-primary/25">
            <p className="text-xs font-semibold text-primary">{monster.specialAbility.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{monster.specialAbility.description}</p>
          </div>
        </div>
      )}
    </>
  );

  const className = `kq-card ${onClick ? 'kq-tap cursor-pointer' : ''} ${isLocked ? 'opacity-90' : ''}`;

  // A card with its own handler is a real button; otherwise the parent owns the tap
  // (RaceSetup / the roster grid wrap the card), so it stays a plain div.
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-rarity={monster.rarity}
        data-selected={isSelected ? 'true' : 'false'}
        className={className}
        aria-label={isLocked ? 'Locked monster' : monster.name}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      data-rarity={monster.rarity}
      data-selected={isSelected ? 'true' : 'false'}
      className={className}
    >
      {body}
    </div>
  );
}

function StatBar({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 w-11 text-muted-foreground shrink-0">
        {icon}
        <span className="text-[0.65rem]">{label}</span>
      </div>
      <div className="stat-bar flex-1">
        <div className="stat-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[0.65rem] w-6 text-right text-muted-foreground">{value}</span>
    </div>
  );
}
