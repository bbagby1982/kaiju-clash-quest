import { useState } from 'react';
import { Monster, GameProgress } from '@/types/game';
import { X, Gauge, Zap, Shield, Sparkles, MapPin, Star, Lightbulb, ThumbsUp, ThumbsDown, Lock, Palette } from 'lucide-react';
import { UnlockRequirements } from './UnlockRequirements';
import { useRoster } from '@/lib/roster';

interface MonsterProfileProps {
  monster: Monster;
  isUnlocked: boolean;
  progress: GameProgress;
  onClose: () => void;
}

const RARITY_TEXT: Record<Monster['rarity'], string> = {
  common: 'text-muted-foreground',
  rare: 'text-electric',
  legendary: 'text-lightning',
};

const RARITY_FRAME: Record<Monster['rarity'], string> = {
  common: 'border-muted-foreground/50 bg-muted',
  rare: 'border-electric bg-electric/10',
  legendary: 'border-lightning bg-lightning/10',
};

export function MonsterProfile({ monster, isUnlocked, progress, onClose }: MonsterProfileProps) {
  const roster = useRoster();
  const [failed, setFailed] = useState(false);
  const url = roster.imageUrl(monster.id);
  const emoji = roster.fallbackEmoji(monster.id);
  const showArt = !!url && !failed;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto kq-no-x kq-screen-in">
      <div className="max-w-2xl mx-auto px-4 pt-3 kq-screen-pad">
        {/* Sticky close + rarity badge */}
        <div className="kq-sticky-close flex items-center justify-between mb-4 py-1">
          <button
            onClick={onClose}
            type="button"
            className="kq-tap p-3 rounded-full bg-card/90 backdrop-blur border border-border hover:border-primary/60 transition-colors"
            aria-label="Close monster profile"
          >
            <X className="w-5 h-5" />
          </button>
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full border backdrop-blur ${RARITY_FRAME[monster.rarity]}`}>
            {monster.rarity !== 'common' && <Star className={`w-4 h-4 fill-current ${RARITY_TEXT[monster.rarity]}`} />}
            <span className={`text-xs font-bold uppercase tracking-wider ${RARITY_TEXT[monster.rarity]}`}>
              {monster.rarity}
            </span>
          </div>
        </div>

        {/* ── Hero art ─────────────────────────────────────────────────── */}
        <div
          className={`kq-hero h-64 sm:h-80 mb-5 flex items-center justify-center ${monster.rarity === 'legendary' && isUnlocked ? 'holo-shine' : ''}`}
          style={{ background: isUnlocked ? `linear-gradient(160deg, ${monster.imageColor}, hsl(220 25% 6%))` : 'hsl(220 20% 8%)' }}
        >
          {isUnlocked ? (
            showArt ? (
              <img
                src={url}
                alt={monster.name}
                draggable={false}
                onError={() => setFailed(true)}
                className="w-full h-full object-cover animate-float"
              />
            ) : (
              <span className="text-8xl animate-float" aria-hidden="true">{emoji}</span>
            )
          ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-center gap-2">
              {showArt && (
                <img src={url} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover kq-locked-art" />
              )}
              <Lock className="relative w-10 h-10 text-muted-foreground" />
              <span className="relative text-xl font-orbitron font-black text-muted-foreground tracking-widest">LOCKED</span>
            </div>
          )}
        </div>

        {/* ── Name / title / era ───────────────────────────────────────── */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-orbitron font-black text-foreground text-title-glow">
            {isUnlocked ? monster.name : '???'}
          </h1>
          <p className="text-lg text-primary font-semibold">
            {isUnlocked ? monster.title : 'Unknown Monster'}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {isUnlocked ? monster.era : 'Mystery Era'}
          </p>
          {monster.custom && isUnlocked && (
            <span className="kq-badge text-lightning mt-3">
              <Palette className="w-3 h-3" />
              Designed by Alfred
            </span>
          )}
        </div>

        {/* Unlock Requirements (if locked) */}
        {!isUnlocked && monster.unlockRequirements && (
          <div className="mb-6">
            <UnlockRequirements monster={monster} progress={progress} />
          </div>
        )}

        {/* Description */}
        {isUnlocked && (
          <div className="mb-5 p-4 kq-panel">
            <h3 className="kq-section-title mb-2">Origin Story</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{monster.description}</p>
          </div>
        )}

        {/* Stats */}
        {isUnlocked && (
          <div className="mb-5 p-4 kq-panel">
            <h3 className="kq-section-title mb-3">Battle Stats</h3>
            <div className="space-y-3">
              <StatBar icon={<Gauge className="w-4 h-4" />} label="Speed" value={monster.stats.speed} color="hsl(var(--electric-blue))" />
              <StatBar icon={<Zap className="w-4 h-4" />} label="Strength" value={monster.stats.strength} color="hsl(var(--monster-red))" />
              <StatBar icon={<Shield className="w-4 h-4" />} label="Defense" value={monster.stats.defense} color="hsl(var(--atomic-green))" />
              <StatBar icon={<Sparkles className="w-4 h-4" />} label="Special Attack" value={monster.stats.specialAttack} color="hsl(var(--lightning-yellow))" />
            </div>
          </div>
        )}

        {/* Special Ability */}
        {isUnlocked && (
          <div className="mb-5 p-4 rounded-2xl bg-primary/10 border border-primary/30">
            <h3 className="font-orbitron font-bold text-primary mb-2 text-base">
              Special Ability: {monster.specialAbility.name}
            </h3>
            <p className="text-sm text-foreground">{monster.specialAbility.description}</p>
          </div>
        )}

        {/* Terrain Bonus */}
        {isUnlocked && monster.terrainBonus && (
          <div className="mb-5 p-4 kq-panel">
            <h3 className="kq-section-title mb-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Preferred Terrain
            </h3>
            <div className="flex gap-2 flex-wrap">
              {monster.terrainBonus.map(terrain => (
                <span key={terrain} className="px-3 py-1.5 rounded-full bg-muted text-sm capitalize border border-border">
                  {terrain}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        {isUnlocked && (monster.strengths || monster.weaknesses) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {monster.strengths && (
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30">
                <h3 className="font-orbitron font-bold text-primary mb-2 flex items-center gap-2 text-sm">
                  <ThumbsUp className="w-4 h-4" />
                  Strengths
                </h3>
                <ul className="text-sm text-foreground space-y-1">
                  {monster.strengths.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {monster.weaknesses && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30">
                <h3 className="font-orbitron font-bold text-destructive mb-2 flex items-center gap-2 text-sm">
                  <ThumbsDown className="w-4 h-4" />
                  Weaknesses
                </h3>
                <ul className="text-sm text-foreground space-y-1">
                  {monster.weaknesses.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Fun Facts */}
        {isUnlocked && monster.funFacts && (
          <div className="p-4 rounded-2xl bg-lightning/10 border border-lightning/30">
            <h3 className="font-orbitron font-bold text-lightning mb-3 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4" />
              Fun Facts
            </h3>
            <ul className="space-y-2">
              {monster.funFacts.map((fact, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-lightning">•</span>
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Teaser for locked monsters */}
        {!isUnlocked && (
          <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center">
            <p className="text-muted-foreground italic">
              "A mysterious creature awaits... Complete the requirements above to discover its secrets!"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBar({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-28 text-muted-foreground shrink-0">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-sm font-bold w-8 text-right" style={{ color }}>{value}</span>
    </div>
  );
}
