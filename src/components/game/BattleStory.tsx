import { Monster, GameMap, Booster } from '@/types/game';
import { generateBattleStory, getTraitEmoji } from '@/lib/battleNarratives';
import { BookOpen, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BattleStoryProps {
  playerMonster: Monster;
  opponentMonster: Monster;
  trait: keyof Monster['stats'];
  winner: 'player' | 'opponent' | 'tie';
  map?: GameMap;
  booster?: Booster | null;
}

export function BattleStory({
  playerMonster,
  opponentMonster,
  trait,
  winner,
  map,
  booster,
}: BattleStoryProps) {
  const [story, setStory] = useState('');
  const [isAnimating, setIsAnimating] = useState(true);

  const generateNewStory = () => {
    const newStory = generateBattleStory({
      playerMonster,
      opponentMonster,
      trait,
      winner,
      map,
      booster,
    });
    setStory(newStory);
  };

  useEffect(() => {
    generateNewStory();
    // Animate in
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [playerMonster, opponentMonster, trait, winner]);

  const handleRegenerate = () => {
    setIsAnimating(true);
    setTimeout(() => {
      generateNewStory();
      setIsAnimating(false);
    }, 200);
  };

  const terrainGradient = map ? {
    city: 'from-slate-600/20 to-gray-700/20',
    island: 'from-emerald-600/20 to-teal-700/20',
    ocean: 'from-blue-600/20 to-cyan-700/20',
    volcano: 'from-orange-600/20 to-red-700/20',
    ruins: 'from-amber-600/20 to-stone-700/20',
  }[map.terrain] : 'from-primary/20 to-secondary/20';

  return (
    <div 
      className={`relative p-4 rounded-xl border border-border bg-gradient-to-br ${terrainGradient} transition-all duration-300 ${
        isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="w-5 h-5" />
          <span className="font-orbitron font-bold text-sm">BATTLE STORY</span>
          <span className="text-lg">{getTraitEmoji(trait)}</span>
        </div>
        <button
          onClick={handleRegenerate}
          className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          title="Generate new story"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Story Content */}
      <div className="relative">
        <div className="text-foreground text-sm md:text-base leading-relaxed font-medium">
          "{story}"
        </div>
        
        {/* Decorative Quote Marks */}
        <div className="absolute -top-2 -left-1 text-4xl text-primary/30 font-serif">"</div>
        <div className="absolute -bottom-4 -right-1 text-4xl text-primary/30 font-serif rotate-180">"</div>
      </div>

      {/* Monster Names Footer */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/50">
        <span className={`text-xs font-orbitron ${winner === 'player' ? 'text-primary' : 'text-muted-foreground'}`}>
          {playerMonster.name}
        </span>
        <span className="text-muted-foreground">⚔️</span>
        <span className={`text-xs font-orbitron ${winner === 'opponent' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {opponentMonster.name}
        </span>
      </div>
    </div>
  );
}
