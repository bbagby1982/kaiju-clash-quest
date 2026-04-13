import { Monster, Booster, GameMap } from '@/types/game';
import { Gauge, Zap, Shield, Sparkles, MapPin, Rocket, Trophy, XCircle, Check, X } from 'lucide-react';
import { BattleStory } from './BattleStory';

interface BattleResultsProps {
  playerMonster: Monster;
  opponentMonster: Monster;
  winner: 'player' | 'opponent' | 'tie';
  trait: { key: keyof Monster['stats']; label: string; color: string };
  map?: GameMap;
  booster?: Booster | null;
  onContinue: () => void;
}

const traitIcons: Record<string, React.ReactNode> = {
  speed: <Gauge className="w-5 h-5" />,
  strength: <Zap className="w-5 h-5" />,
  defense: <Shield className="w-5 h-5" />,
  specialAttack: <Sparkles className="w-5 h-5" />,
};

export function BattleResults({
  playerMonster,
  opponentMonster,
  winner,
  trait,
  map,
  booster,
  onContinue,
}: BattleResultsProps) {
  const playerStat = playerMonster.stats[trait.key] + (booster ? getBoosterBonus(booster, trait.key) : 0);
  const opponentStat = opponentMonster.stats[trait.key];
  const playerHasTerrainBonus = map && playerMonster.terrainBonus?.includes(map.terrain);
  const opponentHasTerrainBonus = map && opponentMonster.terrainBonus?.includes(map.terrain);
  const statDifference = playerStat - opponentStat;

  function getBoosterBonus(b: Booster, t: keyof Monster['stats']): number {
    if (b.effect === 'attack' && t === 'specialAttack') return b.power;
    if (b.effect === 'defense' && t === 'defense') return b.power;
    if (b.effect === 'speed' && t === 'speed') return b.power;
    if (b.effect === 'random') return Math.floor(Math.random() * b.power);
    return 0;
  }

  // Generate explanations for kids
  const getWinReasons = (): { positive: string[]; negative: string[] } => {
    const positive: string[] = [];
    const negative: string[] = [];

    if (winner === 'player') {
      positive.push(`✅ Your battle choices won the fight!`);
      if (playerStat > opponentStat) positive.push(`✅ Higher ${trait.label.toLowerCase()} (+${Math.abs(statDifference)}) gave you an edge`);
      if (booster) positive.push(`✅ ${booster.name} booster helped!`);
      if (playerHasTerrainBonus) positive.push(`✅ ${map?.name} terrain bonus!`);
      if (opponentStat > playerStat) positive.push(`💪 Won despite lower ${trait.label.toLowerCase()} — smart moves!`);
      if (opponentHasTerrainBonus) negative.push(`⚠️ ${opponentMonster.name} had terrain help but you overcame it!`);
    } else if (winner === 'opponent') {
      negative.push(`❌ ${opponentMonster.name} outfought you this time`);
      if (opponentStat > playerStat) negative.push(`❌ ${opponentMonster.name} had higher ${trait.label.toLowerCase()} (+${Math.abs(statDifference)})`);
      if (opponentHasTerrainBonus) negative.push(`❌ ${opponentMonster.name} had terrain advantage`);
      if (booster) positive.push(`✅ ${booster.name} helped, but not enough`);
      if (playerHasTerrainBonus) positive.push(`✅ You had terrain bonus`);
      positive.push(`💡 Try different battle choices next time!`);
    } else {
      positive.push(`⚖️ A perfectly matched fight!`);
    }

    return { positive, negative };
  };

  const reasons = getWinReasons();

  return (
    <div className="text-center animate-scale-in space-y-4 max-w-md mx-auto w-full">
      {/* Winner Badge */}
      <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${
        winner === 'player' 
          ? 'bg-primary/20 border-2 border-primary' 
          : winner === 'opponent'
          ? 'bg-destructive/20 border-2 border-destructive'
          : 'bg-muted border-2 border-muted-foreground'
      }`}>
        {winner === 'player' ? (
          <Trophy className="w-8 h-8 text-lightning" />
        ) : winner === 'opponent' ? (
          <XCircle className="w-8 h-8 text-destructive" />
        ) : null}
        <h2 className={`text-3xl font-orbitron font-bold ${
          winner === 'player' ? 'text-primary text-glow-atomic' : 
          winner === 'opponent' ? 'text-destructive' : 'text-muted-foreground'
        }`}>
          {winner === 'player' ? 'VICTORY!' : winner === 'opponent' ? 'DEFEAT' : 'TIE'}
        </h2>
      </div>

      {/* Battle Story */}
      <BattleStory
        playerMonster={playerMonster}
        opponentMonster={opponentMonster}
        trait={trait.key}
        winner={winner}
        map={map}
        booster={booster}
      />

      {/* What Was Tested */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border">
        <div className="flex items-center justify-center gap-2 text-lg font-medium" style={{ color: trait.color }}>
          {traitIcons[trait.key]}
          <span>⚔️ This Battle Tested: {trait.label}</span>
        </div>
      </div>

      {/* Stat Comparison with Bars */}
      <div className="p-4 rounded-xl bg-card/80 border border-border space-y-3">
        <h4 className="text-sm font-bold text-foreground">📊 Stat Comparison</h4>
        
        {/* Player Bar */}
        <div className={`p-3 rounded-lg ${winner === 'player' ? 'bg-primary/10 border border-primary' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-primary">{playerMonster.name}</span>
            <span className="text-xl font-orbitron font-bold" style={{ color: trait.color }}>
              {playerStat}
              {booster && <span className="text-xs text-primary ml-1">+{booster.power}</span>}
            </span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-1000 rounded-full"
              style={{ 
                width: `${Math.min(100, playerStat)}%`, 
                backgroundColor: winner === 'player' ? trait.color : 'hsl(var(--muted-foreground))'
              }}
            />
          </div>
          {winner === 'player' && (
            <p className="text-xs text-primary mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" /> Winner!
            </p>
          )}
        </div>

        {/* Opponent Bar */}
        <div className={`p-3 rounded-lg ${winner === 'opponent' ? 'bg-destructive/10 border border-destructive' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-destructive">{opponentMonster.name}</span>
            <span className="text-xl font-orbitron font-bold" style={{ color: trait.color }}>
              {opponentStat}
            </span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-1000 rounded-full"
              style={{ 
                width: `${Math.min(100, opponentStat)}%`, 
                backgroundColor: winner === 'opponent' ? trait.color : 'hsl(var(--muted-foreground))'
              }}
            />
          </div>
          {winner === 'opponent' && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <X className="w-3 h-3" /> Winner
            </p>
          )}
        </div>
      </div>

      {/* Why You Won/Lost - Kid Friendly */}
      <div className="p-4 rounded-xl bg-card/80 border border-border text-left">
        <h4 className="text-sm font-bold text-foreground mb-3">
          {winner === 'player' ? '🎉 Why You Won' : winner === 'opponent' ? '💡 What Happened' : '⚖️ The Result'}
        </h4>
        <div className="space-y-2">
          {reasons.positive.map((reason, i) => (
            <p key={`pos-${i}`} className="text-sm text-primary">{reason}</p>
          ))}
          {reasons.negative.map((reason, i) => (
            <p key={`neg-${i}`} className="text-sm text-muted-foreground">{reason}</p>
          ))}
        </div>
      </div>

      {/* Terrain & Booster Info */}
      {(map || booster) && (
        <div className="flex gap-2 justify-center flex-wrap">
          {map && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted/50 text-xs">
              <MapPin className="w-3 h-3" />
              <span>{map.name}</span>
              {playerHasTerrainBonus && <span className="text-primary ml-1">+bonus</span>}
            </div>
          )}
          {booster && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: `${booster.color}30` }}>
              <Rocket className="w-3 h-3" />
              <span>{booster.icon} {booster.name}</span>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full px-8 py-4 rounded-xl font-orbitron font-bold text-lg bg-primary text-primary-foreground hover:scale-105 transition-transform glow-atomic"
      >
        Continue
      </button>
    </div>
  );
}
