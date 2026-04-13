import { useState, useEffect, useCallback, useRef } from 'react';
import { Monster, GameMap, Booster } from '@/types/game';
import { BattleResults } from './BattleResults';
import { Swords, Sparkles, Shield, Mountain, Loader2 } from 'lucide-react';
import { getMonsterImage, getMonsterFallbackEmoji } from '@/lib/monsterImages';

type BattleFocus = 'speed' | 'strength' | 'defense' | 'specialAttack' | 'fireVsIce' | 'focusVsDistraction' | 'allOut' | 'random';
type Phase = 'intro' | 'choosing' | 'narrating' | 'result';
type Trait = 'speed' | 'strength' | 'defense' | 'specialAttack';

interface BattleSimulationProps {
  playerMonster: Monster;
  opponentMonster: Monster;
  battleFocus: BattleFocus;
  map: GameMap;
  booster?: Booster | null;
  onBattleEnd: (won: boolean, opponentId: string, trait: string) => void;
}

const choiceIcons: Record<string, React.ReactNode> = {
  attack: <Swords className="w-5 h-5" />,
  special: <Sparkles className="w-5 h-5" />,
  defend: <Shield className="w-5 h-5" />,
  terrain: <Mountain className="w-5 h-5" />,
};

const choiceColors: Record<string, string> = {
  attack: '#ef4444',
  special: '#eab308',
  defend: '#22c55e',
  terrain: '#3b82f6',
};

function getActualTrait(focus: BattleFocus): Trait {
  if (focus === 'random') {
    const t: Trait[] = ['speed', 'strength', 'defense', 'specialAttack'];
    return t[Math.floor(Math.random() * t.length)];
  }
  if (focus === 'fireVsIce') return 'specialAttack';
  if (focus === 'focusVsDistraction') return 'defense';
  if (focus === 'allOut') return 'strength';
  return focus as Trait;
}

const traitsList: { key: Trait; label: string; color: string }[] = [
  { key: 'speed', label: 'SPEED', color: '#3b82f6' },
  { key: 'strength', label: 'STRENGTH', color: '#ef4444' },
  { key: 'defense', label: 'DEFENSE', color: '#22c55e' },
  { key: 'specialAttack', label: 'SPECIAL', color: '#eab308' },
];

// Fallback narrations when AI API is unavailable
function fallbackIntro(p: Monster, o: Monster, map: GameMap) {
  return `The ground shakes as ${p.name} faces ${o.name} in the ${map.name}! Two titans lock eyes — only one will walk away victorious. ROOOAAR!`;
}
function fallbackRound(p: Monster, o: Monster, choice: string, round: number) {
  const moves: Record<string, string> = {
    attack: `${p.name} charges forward with a devastating strike! BOOM! ${o.name} staggers back but retaliates with a powerful counterattack! CRASH!`,
    special: `${p.name} unleashes ${p.specialAbility.name}! The blast tears across the battlefield! ${o.name} braces for impact — WHOOSH!`,
    defend: `${p.name} takes a defensive stance, reading ${o.name}'s movements. When ${o.name} strikes, ${p.name} counters perfectly! SMASH!`,
    terrain: `${p.name} uses the terrain as a weapon! The environment itself turns against ${o.name}! CRASH! A clever tactical move!`,
  };
  return moves[choice] || moves.attack;
}
function fallbackCalcDamage(p: Monster, o: Monster, choice: string, trait: Trait, booster?: Booster | null) {
  const pStat = p.stats[trait] + (booster ? booster.power : 0);
  const oStat = o.stats[trait];
  const base = Math.floor(Math.random() * 15) + 10;
  const pDmg = choice === 'defend' ? Math.max(5, base - 8) : base + Math.floor((oStat - pStat) / 10);
  const oDmg = choice === 'special' ? base + 8 : choice === 'attack' ? base + 3 : base;
  return { playerDamage: Math.max(3, Math.min(30, pDmg)), opponentDamage: Math.max(3, Math.min(30, oDmg)) };
}

function MonsterPortrait({ monster, shake, winner, side }: { monster: Monster; shake: boolean; winner: string | null; side: 'player' | 'opponent' }) {
  const img = getMonsterImage(monster.id);
  const emoji = getMonsterFallbackEmoji(monster.id, monster.name);
  const isWinner = winner === side;
  const isLoser = winner && winner !== side;
  const borderColor = side === 'player' ? 'border-primary/50' : 'border-red-500/50';
  const winBorder = side === 'player' ? 'border-primary glow-atomic' : 'border-red-500';

  return (
    <div className={`flex-1 flex flex-col items-center transition-all duration-300 ${shake ? 'animate-shake' : ''}`}>
      <div className={`w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden border-2 transition-all ${
        isWinner ? `${winBorder} scale-105` : isLoser ? 'opacity-60 scale-90 border-border' : borderColor
      }`} style={{ background: monster.imageColor }}>
        {img ? (
          <img src={img} alt={monster.name} className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : null}
        {!img && <div className="w-full h-full flex items-center justify-center text-4xl">{emoji}</div>}
      </div>
      <h3 className={`font-orbitron font-bold text-xs mt-1 truncate max-w-[100px] ${
        side === 'player' ? 'text-primary' : 'text-red-400'
      }`}>{monster.name}</h3>
    </div>
  );
}

export function BattleSimulation({ playerMonster, opponentMonster, battleFocus, map, booster, onBattleEnd }: BattleSimulationProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0);
  const [narration, setNarration] = useState('');
  const [playerHP, setPlayerHP] = useState(100);
  const [opponentHP, setOpponentHP] = useState(100);
  const [battleHistory, setBattleHistory] = useState<string[]>([]);
  const [choices] = useState(['attack', 'special', 'defend', 'terrain']);
  const [choiceDescs, setChoiceDescs] = useState<Record<string, string>>({
    attack: `Strike with brute force`,
    special: `Use ${playerMonster.specialAbility.name}`,
    defend: `Brace and counter`,
    terrain: `Use the ${map.terrain} environment`,
  });
  const [winner, setWinner] = useState<'player' | 'opponent' | 'tie' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [playerShake, setPlayerShake] = useState(false);
  const [opponentShake, setOpponentShake] = useState(false);
  const [criticalHit, setCriticalHit] = useState(false);
  const [actualTrait] = useState(() => getActualTrait(battleFocus));
  const [useAI, setUseAI] = useState(true);
  const mounted = useRef(true);

  useEffect(() => { return () => { mounted.current = false; }; }, []);

  const callBattleAPI = useCallback(async (roundNum: number, playerChoice?: string, hp?: number, ohp?: number, history?: string[]) => {
    try {
      const response = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerMonster: { name: playerMonster.name, title: playerMonster.title, era: playerMonster.era, stats: playerMonster.stats, specialAbility: playerMonster.specialAbility, terrainBonus: playerMonster.terrainBonus, strengths: playerMonster.strengths, weaknesses: playerMonster.weaknesses },
          opponentMonster: { name: opponentMonster.name, title: opponentMonster.title, era: opponentMonster.era, stats: opponentMonster.stats, specialAbility: opponentMonster.specialAbility, terrainBonus: opponentMonster.terrainBonus, strengths: opponentMonster.strengths, weaknesses: opponentMonster.weaknesses },
          battleFocus, map: { name: map.name, terrain: map.terrain, description: map.description },
          booster: booster ? { name: booster.name, description: booster.description, effect: booster.effect, power: booster.power } : null,
          round: roundNum, playerChoice, battleHistory: history || battleHistory, playerHP: hp ?? playerHP, opponentHP: ohp ?? opponentHP,
        }),
      });
      if (!response.ok) throw new Error('API error');
      return await response.json();
    } catch {
      return null; // Will trigger fallback
    }
  }, [playerMonster, opponentMonster, battleFocus, map, booster, battleHistory, playerHP, opponentHP]);

  // Start intro
  useEffect(() => {
    let cancelled = false;
    const loadIntro = async () => {
      setIsLoading(true);
      const result = await callBattleAPI(0);
      if (cancelled) return;
      setIsLoading(false);

      if (result?.narration) {
        setNarration(result.narration);
        if (result.choiceDescriptions) setChoiceDescs(result.choiceDescriptions);
      } else {
        setUseAI(false);
        setNarration(fallbackIntro(playerMonster, opponentMonster, map));
      }
      setTimeout(() => { if (!cancelled) { setRound(1); setPhase('choosing'); } }, 3000);
    };
    loadIntro();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChoice = async (choice: string) => {
    setPhase('narrating');
    setIsLoading(true);

    let newPHP = playerHP;
    let newOHP = opponentHP;
    let narr = '';

    if (useAI) {
      const result = await callBattleAPI(round, choice, playerHP, opponentHP, battleHistory);
      if (result?.narration) {
        narr = result.narration;
        newPHP = Math.max(0, result.playerHP ?? playerHP);
        newOHP = Math.max(0, result.opponentHP ?? opponentHP);
        if (result.choiceDescriptions) setChoiceDescs(result.choiceDescriptions);
        if (result.criticalHit) { setCriticalHit(true); setTimeout(() => setCriticalHit(false), 1000); }
      } else {
        setUseAI(false);
        const dmg = fallbackCalcDamage(playerMonster, opponentMonster, choice, actualTrait, booster);
        narr = fallbackRound(playerMonster, opponentMonster, choice, round);
        newPHP = Math.max(0, playerHP - dmg.playerDamage);
        newOHP = Math.max(0, opponentHP - dmg.opponentDamage);
      }
    } else {
      const dmg = fallbackCalcDamage(playerMonster, opponentMonster, choice, actualTrait, booster);
      narr = fallbackRound(playerMonster, opponentMonster, choice, round);
      newPHP = Math.max(0, playerHP - dmg.playerDamage);
      newOHP = Math.max(0, opponentHP - dmg.opponentDamage);
    }

    if (newOHP < newPHP) { setOpponentShake(true); setTimeout(() => setOpponentShake(false), 600); }
    else { setPlayerShake(true); setTimeout(() => setPlayerShake(false), 600); }

    setNarration(narr);
    setPlayerHP(newPHP);
    setOpponentHP(newOHP);
    setBattleHistory(prev => [...prev, narr]);
    setIsLoading(false);

    if (newPHP <= 0 || newOHP <= 0 || round >= 3) {
      const w = newPHP >= newOHP ? 'player' : 'opponent';
      setTimeout(() => {
        setWinner(w);
        setNarration(w === 'player'
          ? `${playerMonster.name} stands victorious! A triumphant ROAR echoes across the ${map.name}! The King has spoken!`
          : `${opponentMonster.name} lands the final blow! ${playerMonster.name} falls — but every defeat makes a titan stronger!`);
        setTimeout(() => setPhase('result'), 3000);
      }, 2500);
    } else {
      setTimeout(() => { setRound(r => r + 1); setPhase('choosing'); }, 2500);
    }
  };

  const traitInfo = traitsList.find(t => t.key === actualTrait) || traitsList[0];

  if (phase === 'result' && winner) {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center bg-gradient-to-b from-background to-card">
        <BattleResults playerMonster={playerMonster} opponentMonster={opponentMonster}
          winner={winner} trait={{ key: actualTrait, label: traitInfo.label, color: traitInfo.color }}
          map={map} booster={booster}
          onContinue={() => onBattleEnd(winner === 'player', opponentMonster.id, actualTrait)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex flex-col relative overflow-hidden"
      style={{ background: `linear-gradient(to bottom, ${map.backgroundColor}, hsl(var(--card)))` }}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundColor: map.accentColor }} />
      {criticalHit && <div className="absolute inset-0 z-50 bg-yellow-400/30 animate-pulse pointer-events-none" />}

      <div className="relative z-10 text-center mb-3">
        <h1 className="font-orbitron font-bold text-xl text-primary text-glow-atomic">⚔️ AI BATTLE ⚔️</h1>
        <p className="text-xs text-muted-foreground">{map.name} • Round {Math.min(round, 3)}/3</p>
        {booster && <p className="text-xs mt-1" style={{ color: booster.color }}>{booster.icon} {booster.name} Active</p>}
      </div>

      <div className="relative z-10 flex justify-between items-start gap-2 w-full max-w-lg mx-auto mb-4">
        <MonsterPortrait monster={playerMonster} shake={playerShake} winner={winner} side="player" />
        <div className="flex items-center justify-center pt-6">
          <div className="w-10 h-10 rounded-full bg-card border-2 border-primary/40 flex items-center justify-center">
            <span className="font-orbitron font-bold text-xs text-primary">VS</span>
          </div>
        </div>
        <MonsterPortrait monster={opponentMonster} shake={opponentShake} winner={winner} side="opponent" />
      </div>

      {/* HP Bars */}
      <div className="relative z-10 flex gap-4 max-w-lg mx-auto w-full mb-4 px-2">
        <div className="flex-1">
          <div className="flex justify-between text-[10px] mb-0.5"><span className="text-muted-foreground">HP</span><span className={playerHP < 30 ? 'text-red-400' : 'text-green-400'}>{playerHP}</span></div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${playerHP}%`, background: playerHP > 50 ? '#22c55e' : playerHP > 25 ? '#f59e0b' : '#ef4444' }} />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-[10px] mb-0.5"><span className="text-muted-foreground">HP</span><span className={opponentHP < 30 ? 'text-red-400' : 'text-green-400'}>{opponentHP}</span></div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${opponentHP}%`, background: opponentHP > 50 ? '#22c55e' : opponentHP > 25 ? '#f59e0b' : '#ef4444' }} />
          </div>
        </div>
      </div>

      {/* Narration */}
      <div className="relative z-10 max-w-lg mx-auto w-full mb-4">
        <div className="w-full bg-card/90 border border-border rounded-xl p-4 min-h-[80px] flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-orbitron">{round === 0 ? 'Setting the stage...' : 'The monsters clash...'}</p>
            </div>
          ) : (
            <p className="text-sm text-center leading-relaxed">{narration}</p>
          )}
        </div>
      </div>

      {/* Choices */}
      {phase === 'choosing' && !isLoading && (
        <div className="relative z-10 max-w-lg mx-auto w-full animate-fade-in">
          <p className="text-center text-xs text-muted-foreground font-orbitron mb-2">CHOOSE YOUR MOVE</p>
          <div className="grid grid-cols-2 gap-2">
            {choices.map((c) => (
              <button key={c} onClick={() => handleChoice(c)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 bg-card/80 hover:bg-card active:scale-95 transition-all"
                style={{ borderColor: `${choiceColors[c]}40` }}>
                <div className="flex items-center gap-1.5" style={{ color: choiceColors[c] }}>
                  {choiceIcons[c]}
                  <span className="font-orbitron font-bold text-xs uppercase">{c}</span>
                </div>
                <p className="text-[10px] text-muted-foreground text-center leading-tight">{choiceDescs[c]}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative z-10 flex justify-center gap-2 mt-4 pb-4">
        {[1, 2, 3].map((r) => (
          <div key={r} className={`w-3 h-3 rounded-full transition-all ${round >= r ? 'bg-primary scale-110' : 'bg-muted'}`} />
        ))}
      </div>
    </div>
  );
}
