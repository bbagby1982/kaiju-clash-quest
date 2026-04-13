import { Monster } from '@/types/game';
import { Star, Lock, Zap, Shield, Gauge, Sparkles } from 'lucide-react';
import { getMonsterImage, getMonsterFallbackEmoji } from '@/lib/monsterImages';

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

// Get silhouette style based on monster characteristics
const getSilhouetteStyle = (monster: Monster) => {
  // Base silhouette with blur and darkness
  const baseStyle = {
    filter: 'brightness(0) blur(1px)',
    opacity: 0.7,
  };
  
  // Add colored glow based on element/rarity
  let glowColor = 'hsl(220 20% 30%)';
  if (monster.terrainBonus?.includes('volcano')) glowColor = 'hsl(15 80% 30%)';
  if (monster.terrainBonus?.includes('ocean')) glowColor = 'hsl(200 70% 30%)';
  if (monster.rarity === 'legendary') glowColor = 'hsl(45 80% 30%)';
  
  return {
    ...baseStyle,
    boxShadow: `0 0 20px ${glowColor}`,
  };
};

interface EncyclopediaEntryProps {
  monster: Monster;
  isUnlocked: boolean;
  onClick: () => void;
}

export function EncyclopediaEntry({ monster, isUnlocked, onClick }: EncyclopediaEntryProps) {
  const hints = getMonsterHints(monster);
  const silhouetteStyle = getSilhouetteStyle(monster);
  const monsterImage = getMonsterImage(monster.id);
  const fallbackEmoji = getMonsterFallbackEmoji(monster.id, monster.name);
  
  const rarityConfig = {
    common: { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-muted' },
    rare: { color: 'text-electric', bg: 'bg-electric/10', border: 'border-electric/30' },
    legendary: { color: 'text-lightning', bg: 'bg-lightning/10', border: 'border-lightning/30' },
  };
  
  const config = rarityConfig[monster.rarity];

  return (
    <div 
      className={`monster-card p-4 cursor-pointer hover:scale-[1.01] transition-all duration-300 ${
        !isUnlocked ? 'bg-muted/20' : ''
      } ${config.border} border`}
      onClick={onClick}
    >
      <div className="flex gap-4 items-center">
        {/* Monster Image / Silhouette */}
        <div 
          className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative flex items-center justify-center"
          style={{ 
            background: isUnlocked 
              ? monster.imageColor 
              : 'linear-gradient(135deg, hsl(220 20% 8%), hsl(220 20% 15%))'
          }}
        >
          {monsterImage ? (
            <img 
              src={monsterImage}
              alt={isUnlocked ? monster.name : 'Mystery Monster'}
              className="w-full h-full object-cover"
              style={isUnlocked ? {} : silhouetteStyle}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {isUnlocked ? (
                <span className="text-4xl">{fallbackEmoji}</span>
              ) : (
                <Lock className="w-8 h-8 text-muted-foreground/50" />
              )}
            </div>
          )}
          
          {/* Mystery overlay for locked */}
          {!isUnlocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-background/80 flex items-center justify-center">
                <span className="text-lg">?</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Name and Rarity */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-orbitron font-bold text-base truncate">
              {isUnlocked ? monster.name : '???'}
            </h3>
            {monster.rarity !== 'common' && (
              <Star className={`w-4 h-4 flex-shrink-0 ${config.color} ${isUnlocked ? 'fill-current' : ''}`} />
            )}
          </div>
          
          {/* Era or Hints */}
          <p className="text-xs text-muted-foreground mb-2">
            {isUnlocked ? monster.era : hints.join(' • ') || 'Unknown creature...'}
          </p>
          
          {/* Stats preview or teaser */}
          {isUnlocked ? (
            <div className="flex gap-3">
              <StatMini icon={<Gauge className="w-3 h-3" />} value={monster.stats.speed} color="hsl(var(--electric-blue))" />
              <StatMini icon={<Zap className="w-3 h-3" />} value={monster.stats.strength} color="hsl(var(--monster-red))" />
              <StatMini icon={<Shield className="w-3 h-3" />} value={monster.stats.defense} color="hsl(var(--atomic-green))" />
              <StatMini icon={<Sparkles className="w-3 h-3" />} value={monster.stats.specialAttack} color="hsl(var(--lightning))" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/70 italic">
              Complete requirements to discover...
            </p>
          )}
        </div>
        
        {/* Unlock indicator */}
        <div className="flex-shrink-0">
          {isUnlocked ? (
            <div className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.color}`}>
              ✓
            </div>
          ) : (
            <Lock className="w-5 h-5 text-muted-foreground/40" />
          )}
        </div>
      </div>
    </div>
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
