import { Zap, Shield, Gauge, Sparkles } from 'lucide-react';
import { CustomMonsterInput } from '@/types/game';

const STAT_ICON = { speed: Gauge, strength: Zap, defense: Shield, specialAttack: Sparkles } as const;

interface StatCardPreviewProps {
  draft: CustomMonsterInput;
}

/** A lightweight, always-live preview of the stat card the game renders — reflects the form's draft state, not what's saved. */
export function StatCardPreview({ draft }: StatCardPreviewProps) {
  return (
    <div className="admin-statcard" style={{ ['--admin-accent' as string]: draft.imageColor }}>
      <div className="admin-statcard-header">
        <div>
          <p className="admin-statcard-name">{draft.name || 'Unnamed Monster'}</p>
          <p className="admin-statcard-title">{draft.title || 'Custom Kaiju'}</p>
        </div>
        <span className={`admin-rarity-pill admin-rarity-${draft.rarity}`}>{draft.rarity}</span>
      </div>

      <div className="admin-statcard-stats">
        {(Object.keys(STAT_ICON) as (keyof typeof STAT_ICON)[]).map((stat) => {
          const Icon = STAT_ICON[stat];
          const value = draft.stats[stat];
          return (
            <div key={stat} className="admin-statcard-stat">
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <div className="admin-statcard-bar"><div className="admin-statcard-bar-fill" style={{ width: `${value}%` }} /></div>
              <span>{value}</span>
            </div>
          );
        })}
      </div>

      <p className="admin-statcard-ability">
        <strong>{draft.specialAbility.name || 'Signature Move'}</strong> · {draft.specialAbility.type}
      </p>

      {!!(draft.terrainBonus || []).length && (
        <div className="admin-statcard-terrain">
          {draft.terrainBonus!.map((t) => <span key={t}>{t}</span>)}
        </div>
      )}
    </div>
  );
}
