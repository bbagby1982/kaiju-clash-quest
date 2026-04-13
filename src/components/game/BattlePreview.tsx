import { Monster, GameMap, Booster } from '@/types/game';
import { Gauge, Zap, Shield, Sparkles, ChevronRight, Mountain, Flame, Waves, Building, TreePine } from 'lucide-react';
import { getMonsterImage, getMonsterFallbackEmoji } from '@/lib/monsterImages';

type BattleFocus = 'speed' | 'strength' | 'defense' | 'specialAttack' | 'fireVsIce' | 'focusVsDistraction' | 'allOut' | 'random';

interface BattlePreviewProps {
  playerMonster: Monster;
  opponentMonster: Monster;
  battleFocus: BattleFocus;
  map: GameMap;
  booster?: Booster | null;
  onStartBattle: () => void;
  onBack: () => void;
}

const focusInfo: Record<BattleFocus, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  speed: { label: 'Speed Battle', description: 'The fastest monster wins!', icon: <Gauge className="w-6 h-6" />, color: 'hsl(var(--electric-blue))' },
  strength: { label: 'Strength Battle', description: 'The strongest monster wins!', icon: <Zap className="w-6 h-6" />, color: 'hsl(var(--monster-red))' },
  defense: { label: 'Defense Battle', description: 'The toughest monster wins!', icon: <Shield className="w-6 h-6" />, color: 'hsl(var(--atomic-green))' },
  specialAttack: { label: 'Special Attack Battle', description: 'The best ability wins!', icon: <Sparkles className="w-6 h-6" />, color: 'hsl(var(--lightning))' },
  fireVsIce: { label: 'Fire vs Ice', description: 'An elemental clash of power!', icon: <Flame className="w-6 h-6" />, color: 'hsl(var(--monster-red))' },
  focusVsDistraction: { label: 'Focus vs Distraction', description: 'A battle of concentration!', icon: <Shield className="w-6 h-6" />, color: 'hsl(var(--electric-blue))' },
  allOut: { label: 'All-Out Brawl', description: 'Everything counts!', icon: <Zap className="w-6 h-6" />, color: 'hsl(var(--lightning))' },
  random: { label: 'Random Battle', description: 'The wheel of fate decides!', icon: <Sparkles className="w-6 h-6" />, color: 'hsl(var(--primary))' },
};

const terrainIcons: Record<string, React.ReactNode> = {
  volcano: <Mountain className="w-4 h-4" />,
  ocean: <Waves className="w-4 h-4" />,
  city: <Building className="w-4 h-4" />,
  island: <TreePine className="w-4 h-4" />,
  ruins: <Building className="w-4 h-4" />,
};

function getMonsterStrengths(monster: Monster, focus: BattleFocus): string[] {
  const strengths: string[] = [];
  const stats = monster.stats;
  const avgStat = (stats.speed + stats.strength + stats.defense + stats.specialAttack) / 4;

  if (stats.speed >= 80) strengths.push('⚡ Super Fast!');
  if (stats.strength >= 80) strengths.push('💪 Very Strong!');
  if (stats.defense >= 80) strengths.push('🛡️ Tough Armor!');
  if (stats.specialAttack >= 80) strengths.push('✨ Powerful Ability!');
  
  // Focus-specific advantage
  if (focus !== 'random' && focus !== 'fireVsIce' && focus !== 'focusVsDistraction' && focus !== 'allOut') {
    const focusStat = stats[focus as keyof typeof stats];
    if (focusStat >= avgStat + 10) {
      strengths.push(`🎯 Great at ${focus}!`);
    }
  }

  if (strengths.length === 0) {
    strengths.push('🌟 Well-Balanced Fighter');
  }

  return strengths.slice(0, 3);
}

function getMonsterWeaknesses(monster: Monster, focus: BattleFocus): string[] {
  const weaknesses: string[] = [];
  const stats = monster.stats;
  const avgStat = (stats.speed + stats.strength + stats.defense + stats.specialAttack) / 4;

  if (stats.speed <= 50) weaknesses.push('🐢 A bit slow');
  if (stats.strength <= 50) weaknesses.push('😅 Not super strong');
  if (stats.defense <= 50) weaknesses.push('💔 Low defense');
  if (stats.specialAttack <= 50) weaknesses.push('🔮 Weak special');

  // Focus-specific weakness
  if (focus !== 'random' && focus !== 'fireVsIce' && focus !== 'focusVsDistraction' && focus !== 'allOut') {
    const focusStat = stats[focus as keyof typeof stats];
    if (focusStat < avgStat - 10) {
      weaknesses.push(`⚠️ Weak in ${focus}`);
    }
  }

  return weaknesses.slice(0, 2);
}

export function BattlePreview({ playerMonster, opponentMonster, battleFocus, map, booster, onStartBattle, onBack }: BattlePreviewProps) {
  const focus = focusInfo[battleFocus] || focusInfo.random;
  const playerStrengths = getMonsterStrengths(playerMonster, battleFocus);
  const playerWeaknesses = getMonsterWeaknesses(playerMonster, battleFocus);
  const opponentStrengths = getMonsterStrengths(opponentMonster, battleFocus);
  const opponentWeaknesses = getMonsterWeaknesses(opponentMonster, battleFocus);

  const playerHasTerrainBonus = playerMonster.terrainBonus?.includes(map.terrain);
  const opponentHasTerrainBonus = opponentMonster.terrainBonus?.includes(map.terrain);

  const renderMonsterImage = (monster: Monster) => {
    const image = getMonsterImage(monster.id);
    if (image) {
      return (
        <img 
          src={image} 
          alt={monster.name}
          className="w-full h-full object-cover"
        />
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center text-2xl">
        {getMonsterFallbackEmoji(monster.id, monster.name)}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 flex flex-col bg-gradient-to-b from-background to-card animate-fade-in">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="font-orbitron font-bold text-2xl text-primary">⚔️ Battle Preview</h1>
        <p className="text-sm text-muted-foreground">Here's what to expect!</p>
      </div>

      {/* Battle Focus Banner */}
      <div 
        className="p-3 rounded-xl mb-4 text-center"
        style={{ backgroundColor: `${focus.color}20`, borderColor: focus.color, border: '2px solid' }}
      >
        <div className="flex items-center justify-center gap-2" style={{ color: focus.color }}>
          {focus.icon}
          <span className="font-orbitron font-bold">{focus.label}</span>
        </div>
        <p className="text-xs text-foreground mt-1">{focus.description}</p>
      </div>

      {/* Monster Matchup */}
      <div className="flex gap-3 mb-4">
        {/* Player Side */}
        <div className="flex-1 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-14 h-14 rounded-lg overflow-hidden border-2 border-primary"
              style={{ background: playerMonster.imageColor }}
            >
              {renderMonsterImage(playerMonster)}
            </div>
            <div className="flex-1">
              <h3 className="font-orbitron font-bold text-sm text-primary">{playerMonster.name}</h3>
              <p className="text-xs text-muted-foreground">Your Monster</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-medium text-primary">Why they might win:</p>
            {playerStrengths.map((s, i) => (
              <p key={i} className="text-xs text-foreground">{s}</p>
            ))}
            {playerHasTerrainBonus && (
              <p className="text-xs text-primary">🏔️ Home turf bonus!</p>
            )}
            {booster && (
              <p className="text-xs text-lightning">🚀 {booster.name} active!</p>
            )}
          </div>
          
          {playerWeaknesses.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Watch out for:</p>
              {playerWeaknesses.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground">{w}</p>
              ))}
            </div>
          )}
        </div>

        {/* Opponent Side */}
        <div className="flex-1 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-14 h-14 rounded-lg overflow-hidden border-2 border-destructive"
              style={{ background: opponentMonster.imageColor }}
            >
              {renderMonsterImage(opponentMonster)}
            </div>
            <div className="flex-1">
              <h3 className="font-orbitron font-bold text-sm text-destructive">{opponentMonster.name}</h3>
              <p className="text-xs text-muted-foreground">Opponent</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-medium text-destructive">Why they might win:</p>
            {opponentStrengths.map((s, i) => (
              <p key={i} className="text-xs text-foreground">{s}</p>
            ))}
            {opponentHasTerrainBonus && (
              <p className="text-xs text-destructive">🏔️ Home turf bonus!</p>
            )}
          </div>
          
          {opponentWeaknesses.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Their weakness:</p>
              {opponentWeaknesses.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground">{w}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Terrain Info */}
      <div className="p-3 rounded-xl bg-card/50 border border-border mb-4">
        <div className="flex items-center gap-2 mb-2">
          {terrainIcons[map.terrain]}
          <span className="font-medium text-sm">Battle Location: {map.name}</span>
        </div>
        <p className="text-xs text-muted-foreground">{map.description}</p>
        {(playerHasTerrainBonus || opponentHasTerrainBonus) && (
          <div className="mt-2 text-xs">
            {playerHasTerrainBonus && (
              <span className="text-primary mr-2">✅ {playerMonster.name} gets a bonus here!</span>
            )}
            {opponentHasTerrainBonus && (
              <span className="text-destructive">⚠️ {opponentMonster.name} gets a bonus here!</span>
            )}
          </div>
        )}
      </div>

      {/* Battle Type Explanation */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border mb-6 text-center">
        <p className="text-lg font-bold text-foreground mb-1">📖 What This Battle Tests</p>
        <p className="text-sm text-muted-foreground">
          {battleFocus === 'speed' && "This battle is about QUICKNESS! The monster who can move and react faster will win!"}
          {battleFocus === 'strength' && "This battle is about POWER! The monster who can hit harder will win!"}
          {battleFocus === 'defense' && "This battle is about TOUGHNESS! The monster with better armor will win!"}
          {battleFocus === 'specialAttack' && "This battle is about SPECIAL POWERS! The monster with the best ability wins!"}
          {battleFocus === 'fireVsIce' && "An epic elemental clash! Strength and special attack both matter!"}
          {battleFocus === 'focusVsDistraction' && "A mental battle! Defense and focus under pressure decide the winner!"}
          {battleFocus === 'allOut' && "EVERYTHING counts! All stats will be added up to find the strongest!"}
          {battleFocus === 'random' && "The wheel of fate will decide what this battle tests! Anything can happen!"}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-4 rounded-xl font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors"
        >
          Change Focus
        </button>
        <button
          onClick={onStartBattle}
          className="flex-1 px-4 py-4 rounded-xl font-orbitron font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform glow-atomic flex items-center justify-center gap-2"
        >
          🚀 Start Battle! <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
