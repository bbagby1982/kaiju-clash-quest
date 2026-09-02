/**
 * HPBar — one fighter's health readout in the arena HUD.
 *
 * Uses the `.hp-bar` family from src/index.css: a yellow "lag" bar sits behind
 * the coloured fill and transitions more slowly, so a big hit visibly chews
 * through the health bar instead of just snapping to a new width. Both bars
 * read the same `--hp`; the lag is pure CSS transition timing.
 *
 * The opponent's panel mirrors itself so both bars drain toward the centre.
 */
import { CSSProperties } from 'react';
import { Monster } from '@/types/game';
import { Side } from '@/lib/battleEngine';

interface HPBarProps {
  monster: Monster;
  /** 0-100. */
  hp: number;
  side: Side;
  /** Small chip beside the name — the monster's rarity by default. */
  chip?: string;
  /** True when this fighter owns the battlefield's terrain. */
  terrainBonus?: boolean;
  className?: string;
}

const RARITY_COLOR: Record<string, string> = {
  common: 'hsl(220 15% 70%)',
  rare: 'hsl(210 100% 65%)',
  legendary: 'hsl(50 100% 58%)',
};

export function HPBar({ monster, hp, side, chip, terrainBonus = false, className = '' }: HPBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(hp)));
  const level = clamped > 50 ? 'high' : clamped > 25 ? 'mid' : 'low';
  const isLow = clamped <= 25;
  const mirrored = side === 'opponent';
  const nameColor = side === 'player' ? 'hsl(120 100% 55%)' : 'hsl(0 85% 62%)';
  const chipLabel = chip ?? monster.rarity?.toUpperCase();
  const chipColor = RARITY_COLOR[monster.rarity] ?? 'hsl(220 15% 70%)';

  const barVar: CSSProperties = { ['--hp' as string]: `${clamped}%` };

  return (
    <div className={`arena-hp ${isLow ? 'arena-hp--low' : ''} ${className}`}>
      <div className={`flex items-center gap-1.5 ${mirrored ? 'flex-row-reverse' : ''}`}>
        <span className="arena-hp-name" style={{ color: nameColor, textShadow: `0 0 10px ${nameColor}66` }}>
          {monster.name}
        </span>
        {chipLabel && (
          <span className="arena-chip arena-hp-chip shrink-0" style={{ color: chipColor }}>{chipLabel}</span>
        )}
      </div>

      <div className="hp-bar mt-1" style={mirrored ? { transform: 'scaleX(-1)' } : undefined}>
        <div className="hp-bar-lag" style={barVar} />
        <div className="hp-bar-fill" data-level={level} style={barVar} />
      </div>

      <div className={`flex items-center gap-1.5 mt-0.5 ${mirrored ? 'flex-row-reverse' : ''}`}>
        <span
          className="font-orbitron font-bold text-[10px] tabular-nums"
          style={{ color: isLow ? 'hsl(0 90% 65%)' : 'hsl(180 40% 82%)' }}
        >
          {clamped}<span className="opacity-50">/100</span>
        </span>
        {terrainBonus && (
          <span className="text-[9px] font-rajdhani font-semibold text-lightning truncate" style={{ color: 'hsl(50 100% 60%)' }}>
            ★ home ground
          </span>
        )}
      </div>
    </div>
  );
}
