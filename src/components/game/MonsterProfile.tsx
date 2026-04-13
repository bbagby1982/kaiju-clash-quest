import { Monster, GameProgress } from '@/types/game';
import { X, Gauge, Zap, Shield, Sparkles, MapPin, Star, Lightbulb, ThumbsUp, ThumbsDown } from 'lucide-react';
import { UnlockRequirements } from './UnlockRequirements';
import { getMonsterImage, getMonsterFallbackEmoji } from '@/lib/monsterImages';

interface MonsterProfileProps {
  monster: Monster;
  isUnlocked: boolean;
  progress: GameProgress;
  onClose: () => void;
}

export function MonsterProfile({ monster, isUnlocked, progress, onClose }: MonsterProfileProps) {
  const rarityColors = {
    common: 'text-muted-foreground',
    rare: 'text-electric',
    legendary: 'text-lightning',
  };

  const monsterImage = getMonsterImage(monster.id);
  const fallbackEmoji = getMonsterFallbackEmoji(monster.id, monster.name);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 overflow-y-auto animate-fade-in">
      <div className="max-w-2xl mx-auto p-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${
            monster.rarity === 'legendary' ? 'border-lightning bg-lightning/10' :
            monster.rarity === 'rare' ? 'border-electric bg-electric/10' :
            'border-muted-foreground bg-muted'
          }`}>
            {monster.rarity !== 'common' && <Star className="w-4 h-4 fill-current" />}
            <span className={`text-sm font-medium capitalize ${rarityColors[monster.rarity]}`}>
              {monster.rarity}
            </span>
          </div>
        </div>

        {/* Monster Image */}
        <div 
          className={`relative w-full h-64 rounded-2xl overflow-hidden mb-6 flex items-center justify-center ${
            !isUnlocked ? 'grayscale' : ''
          }`}
          style={{ background: isUnlocked ? monster.imageColor : 'hsl(220 20% 10%)' }}
        >
          {isUnlocked ? (
            monsterImage ? (
              <img 
                src={monsterImage}
                alt={monster.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-8xl">{fallbackEmoji}</span>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl">❓</span>
            </div>
          )}
          {!isUnlocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <span className="text-xl font-orbitron font-bold text-muted-foreground">LOCKED</span>
            </div>
          )}
        </div>

        {/* Name & Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-orbitron font-bold text-foreground">
            {isUnlocked ? monster.name : '???'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {isUnlocked ? monster.title : 'Unknown Monster'}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {isUnlocked ? monster.era : 'Mystery Era'}
          </p>
        </div>

        {/* Unlock Requirements (if locked) */}
        {!isUnlocked && monster.unlockRequirements && (
          <div className="mb-6">
            <UnlockRequirements monster={monster} progress={progress} />
          </div>
        )}

        {/* Description */}
        {isUnlocked && (
          <div className="mb-6 p-4 rounded-xl bg-card border border-border">
            <h3 className="font-bold text-foreground mb-2">Origin Story</h3>
            <p className="text-sm text-muted-foreground">{monster.description}</p>
          </div>
        )}

        {/* Stats */}
        {isUnlocked && (
          <div className="mb-6 p-4 rounded-xl bg-card border border-border">
            <h3 className="font-bold text-foreground mb-3">Battle Stats</h3>
            <div className="space-y-3">
              <StatBar icon={<Gauge className="w-4 h-4" />} label="Speed" value={monster.stats.speed} color="hsl(var(--electric-blue))" />
              <StatBar icon={<Zap className="w-4 h-4" />} label="Strength" value={monster.stats.strength} color="hsl(var(--monster-red))" />
              <StatBar icon={<Shield className="w-4 h-4" />} label="Defense" value={monster.stats.defense} color="hsl(var(--atomic-green))" />
              <StatBar icon={<Sparkles className="w-4 h-4" />} label="Special Attack" value={monster.stats.specialAttack} color="hsl(var(--lightning))" />
            </div>
          </div>
        )}

        {/* Special Ability */}
        {isUnlocked && (
          <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/30">
            <h3 className="font-bold text-primary mb-2">Special Ability: {monster.specialAbility.name}</h3>
            <p className="text-sm text-foreground">{monster.specialAbility.description}</p>
          </div>
        )}

        {/* Terrain Bonus */}
        {isUnlocked && monster.terrainBonus && (
          <div className="mb-6 p-4 rounded-xl bg-card border border-border">
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Preferred Terrain
            </h3>
            <div className="flex gap-2 flex-wrap">
              {monster.terrainBonus.map(terrain => (
                <span key={terrain} className="px-3 py-1 rounded-full bg-muted text-sm capitalize">
                  {terrain}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        {isUnlocked && (monster.strengths || monster.weaknesses) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {monster.strengths && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                <h3 className="font-bold text-primary mb-2 flex items-center gap-2">
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
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <h3 className="font-bold text-destructive mb-2 flex items-center gap-2">
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
          <div className="p-4 rounded-xl bg-lightning/10 border border-lightning/30">
            <h3 className="font-bold text-lightning mb-3 flex items-center gap-2">
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
          <div className="p-4 rounded-xl bg-muted/30 border border-border text-center">
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
      <div className="flex items-center gap-2 w-28 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-500"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-sm font-bold w-8 text-right" style={{ color }}>{value}</span>
    </div>
  );
}
