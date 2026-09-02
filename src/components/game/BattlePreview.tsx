import { Monster, GameMap, Booster } from '@/types/game';
import { Gauge, Zap, Shield, Sparkles, Mountain, Flame, Waves, Building, TreePine, ArrowLeft } from 'lucide-react';
import { MonsterSprite } from './MonsterSprite';
import { BattleReadyButton } from './BattleReadyButton';

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
  specialAttack: { label: 'Special Attack Battle', description: 'The best ability wins!', icon: <Sparkles className="w-6 h-6" />, color: 'hsl(var(--lightning-yellow))' },
  fireVsIce: { label: 'Fire vs Ice', description: 'An elemental clash of power!', icon: <Flame className="w-6 h-6" />, color: 'hsl(var(--monster-red))' },
  focusVsDistraction: { label: 'Focus vs Distraction', description: 'A battle of concentration!', icon: <Shield className="w-6 h-6" />, color: 'hsl(var(--electric-blue))' },
  allOut: { label: 'All-Out Brawl', description: 'Everything counts!', icon: <Zap className="w-6 h-6" />, color: 'hsl(var(--lightning-yellow))' },
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

  return (
    <div className="min-h-screen flex flex-col bg-background kq-no-x kq-screen-in">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-background/85 backdrop-blur-md border-b border-border kq-safe-top">
        <button
          type="button"
          onClick={onBack}
          className="kq-tap p-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
          aria-label="Change Focus"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-orbitron font-black text-lg text-primary truncate">⚔️ Battle Preview</h1>
          <p className="text-xs text-muted-foreground truncate">Here's what to expect!</p>
        </div>
      </div>

      <div className="flex-1 px-3 pt-4 kq-screen-pad max-w-3xl w-full mx-auto space-y-4">
        {/* ── The pre-fight card: map colour behind the two fighters ─────── */}
        <div
          className="relative overflow-hidden rounded-2xl border-2"
          style={{
            borderColor: map.accentColor,
            background: `radial-gradient(ellipse 90% 70% at 50% 100%, ${map.accentColor}44 0%, transparent 65%), linear-gradient(180deg, ${map.backgroundColor}, hsl(220 25% 5%))`,
          }}
        >
          {/* Location plate */}
          <div className="flex items-center justify-center gap-2 px-3 py-2 border-b border-white/10 bg-black/25">
            <span style={{ color: map.accentColor }}>{terrainIcons[map.terrain]}</span>
            <span className="font-orbitron font-bold text-xs tracking-wider uppercase" style={{ color: map.accentColor }}>
              {map.name}
            </span>
          </div>

          {/* Fighters facing each other */}
          <div className="relative flex items-end justify-between gap-1 px-2 pt-4 pb-3">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <MonsterSprite monster={playerMonster} size="lg" state="idle" side="left" shadow />
              <h3 className="font-orbitron font-bold text-sm text-primary mt-2 text-center truncate max-w-full">
                {playerMonster.name}
              </h3>
              <p className="text-[0.62rem] uppercase tracking-widest text-muted-foreground">Your Monster</p>
              {playerHasTerrainBonus && (
                <span className="kq-badge text-primary mt-1.5 bg-primary/10">🏔️ Home turf bonus!</span>
              )}
            </div>

            <div className="flex flex-col items-center justify-center pb-10 shrink-0">
              <span className="kq-vs">VS</span>
            </div>

            <div className="flex flex-col items-center flex-1 min-w-0">
              <MonsterSprite monster={opponentMonster} size="lg" state="idle" side="right" shadow />
              <h3 className="font-orbitron font-bold text-sm text-destructive mt-2 text-center truncate max-w-full">
                {opponentMonster.name}
              </h3>
              <p className="text-[0.62rem] uppercase tracking-widest text-muted-foreground">Opponent</p>
              {opponentHasTerrainBonus && (
                <span className="kq-badge text-destructive mt-1.5 bg-destructive/10">🏔️ Home turf bonus!</span>
              )}
            </div>
          </div>

          {/* Battle Focus banner sits on the card */}
          <div
            className="flex flex-col items-center gap-0.5 px-3 py-2.5 border-t"
            style={{ backgroundColor: `${focus.color}1f`, borderColor: `${focus.color}66` }}
          >
            <div className="flex items-center gap-2" style={{ color: focus.color }}>
              {focus.icon}
              <span className="font-orbitron font-bold">{focus.label}</span>
            </div>
            <p className="text-xs text-foreground">{focus.description}</p>
          </div>
        </div>

        {/* ── Scouting report ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/25">
            <p className="text-xs font-bold text-primary mb-1.5">Why they might win:</p>
            <div className="space-y-1">
              {playerStrengths.map((s, i) => (
                <p key={i} className="text-xs text-foreground">{s}</p>
              ))}
              {booster && <p className="text-xs text-lightning">🚀 {booster.name} active!</p>}
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

          <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/25">
            <p className="text-xs font-bold text-destructive mb-1.5">Why they might win:</p>
            <div className="space-y-1">
              {opponentStrengths.map((s, i) => (
                <p key={i} className="text-xs text-foreground">{s}</p>
              ))}
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

        {/* ── Terrain info ───────────────────────────────────────────────── */}
        <div className="p-3 kq-panel">
          <div className="flex items-center gap-2 mb-1">
            {terrainIcons[map.terrain]}
            <span className="font-medium text-sm">Battle Location: {map.name}</span>
          </div>
          <p className="text-xs text-muted-foreground">{map.description}</p>
          {(playerHasTerrainBonus || opponentHasTerrainBonus) && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {playerHasTerrainBonus && (
                <span className="text-primary">✅ {playerMonster.name} gets a bonus here!</span>
              )}
              {opponentHasTerrainBonus && (
                <span className="text-destructive">⚠️ {opponentMonster.name} gets a bonus here!</span>
              )}
            </div>
          )}
        </div>

        {/* ── What this battle tests ─────────────────────────────────────── */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border text-center">
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

        {/* ── Action ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 pt-1">
          <BattleReadyButton onClick={onStartBattle} label="FIGHT!" />
          <button
            type="button"
            onClick={onBack}
            className="kq-tap px-6 py-3 rounded-xl font-bold text-sm bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            Change Focus
          </button>
        </div>
      </div>
    </div>
  );
}
