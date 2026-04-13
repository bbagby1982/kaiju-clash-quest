import { Monster } from '@/types/game';
import { Zap, Shield, Gauge, Star } from 'lucide-react';
import { getMonsterImage, getMonsterFallbackEmoji } from '@/lib/monsterImages';

interface MonsterCardProps {
  monster: Monster;
  isSelected?: boolean;
  isLocked?: boolean;
  onClick?: () => void;
  showStats?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function MonsterCard({ 
  monster, 
  isSelected, 
  isLocked,
  onClick, 
  showStats = true,
  size = 'md' 
}: MonsterCardProps) {
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const imageSize = {
    sm: 'h-20 text-4xl',
    md: 'h-28 text-5xl',
    lg: 'h-40 text-7xl',
  };

  const rarityColors = {
    common: 'border-muted-foreground/30',
    rare: 'border-electric',
    legendary: 'border-lightning',
  };

  const rarityGlow = {
    common: '',
    rare: 'glow-blue',
    legendary: 'glow-battle',
  };

  const monsterImage = getMonsterImage(monster.id);
  const fallbackEmoji = getMonsterFallbackEmoji(monster.id, monster.name);

  if (isLocked) {
    return (
      <div className="monster-card opacity-60 cursor-not-allowed p-4">
        <div className="flex flex-col items-center gap-3">
          <div 
            className="w-full h-28 rounded-lg flex items-center justify-center text-5xl"
            style={{ background: 'hsl(220 20% 10%)' }}
          >
            ❓
          </div>
          <div className="text-center">
            <p className="text-muted-foreground font-medium">???</p>
            <p className="text-xs text-muted-foreground/60">Locked</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`monster-card cursor-pointer transition-all duration-300 ${sizeClasses[size]} ${
        isSelected 
          ? `ring-2 ring-primary ${rarityGlow[monster.rarity]} scale-[1.02]` 
          : `border ${rarityColors[monster.rarity]} hover:scale-[1.01]`
      }`}
      onClick={onClick}
    >
      <div className="flex flex-col gap-3">
        {/* Monster Image */}
        <div 
          className={`w-full ${imageSize[size]} rounded-lg relative overflow-hidden flex items-center justify-center`}
          style={{ background: monster.imageColor }}
        >
          {monsterImage ? (
            <img 
              src={monsterImage}
              alt={monster.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // If cloud image fails, hide it and show emoji fallback
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  const span = document.createElement('span');
                  span.className = imageSize[size].split(' ')[1];
                  span.textContent = fallbackEmoji;
                  parent.appendChild(span);
                }
              }}
            />
          ) : (
            <span className={imageSize[size].split(' ')[1]}>{fallbackEmoji}</span>
          )}
          
          {/* Rarity indicator */}
          {monster.rarity !== 'common' && (
            <div className={`absolute top-2 right-2 ${
              monster.rarity === 'legendary' ? 'text-lightning' : 'text-electric'
            }`}>
              <Star className="w-4 h-4 fill-current" />
            </div>
          )}
        </div>

        {/* Monster Info */}
        <div className="text-center">
          <h3 className="font-orbitron font-bold text-sm md:text-base text-foreground">
            {monster.name}
          </h3>
          <p className="text-xs text-muted-foreground">{monster.title}</p>
        </div>

        {/* Stats */}
        {showStats && size !== 'sm' && (
          <div className="space-y-2">
            <StatBar 
              icon={<Gauge className="w-3 h-3" />} 
              label="SPD" 
              value={monster.stats.speed} 
              color="hsl(var(--electric-blue))"
            />
            <StatBar 
              icon={<Zap className="w-3 h-3" />} 
              label="STR" 
              value={monster.stats.strength} 
              color="hsl(var(--monster-red))"
            />
            <StatBar 
              icon={<Shield className="w-3 h-3" />} 
              label="DEF" 
              value={monster.stats.defense} 
              color="hsl(var(--atomic-green))"
            />
          </div>
        )}

        {/* Special Ability */}
        {showStats && size === 'lg' && (
          <div className="mt-2 p-2 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs font-semibold text-primary">{monster.specialAbility.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{monster.specialAbility.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBar({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 w-12 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="stat-bar flex-1">
        <div 
          className="stat-bar-fill"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-xs w-6 text-right text-muted-foreground">{value}</span>
    </div>
  );
}
