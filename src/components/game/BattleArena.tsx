import { useEffect, useState, useCallback } from 'react';
import { Monster, GameMap, BattleState } from '@/types/game';
import { QTEMiniGame } from './QTEMiniGame';
import { ButtonMashing } from './ButtonMashing';
import { AbilityTiming } from './AbilityTiming';
import { MonsterCard } from './MonsterCard';
import { Shield, Zap } from 'lucide-react';

interface BattleArenaProps {
  playerMonster: Monster;
  opponentMonster: Monster;
  map: GameMap;
  onBattleEnd: (won: boolean) => void;
}

type BattlePhase = 'intro' | 'battle' | 'qte' | 'mashing' | 'ability' | 'result';

export function BattleArena({ playerMonster, opponentMonster, map, onBattleEnd }: BattleArenaProps) {
  const [phase, setPhase] = useState<BattlePhase>('intro');
  const [playerHealth, setPlayerHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [round, setRound] = useState(1);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [currentAction, setCurrentAction] = useState<'qte' | 'mashing' | 'ability'>('qte');

  // Calculate damage based on stats
  const calculateDamage = useCallback((attacker: Monster, defender: Monster, multiplier: number = 1) => {
    const baseDamage = attacker.stats.strength * 0.3;
    const defense = defender.stats.defense * 0.2;
    const terrainBonus = attacker.terrainBonus?.includes(map.terrain) ? 1.15 : 1;
    return Math.max(5, Math.round((baseDamage - defense) * multiplier * terrainBonus));
  }, [map.terrain]);

  // Intro countdown
  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => {
        setBattleLog([`${playerMonster.name} vs ${opponentMonster.name}!`]);
        setPhase('battle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, playerMonster.name, opponentMonster.name]);

  // Battle loop
  useEffect(() => {
    if (phase === 'battle' && playerHealth > 0 && opponentHealth > 0) {
      const actions: ('qte' | 'mashing' | 'ability')[] = ['qte', 'mashing', 'ability'];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      setCurrentAction(randomAction);
      
      const timer = setTimeout(() => {
        setPhase(randomAction);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, playerHealth, opponentHealth]);

  // Check for winner
  useEffect(() => {
    if (playerHealth <= 0) {
      setWinner('opponent');
      setPhase('result');
    } else if (opponentHealth <= 0) {
      setWinner('player');
      setPhase('result');
    }
  }, [playerHealth, opponentHealth]);

  const handleQTEComplete = useCallback((success: boolean) => {
    if (success) {
      const damage = calculateDamage(playerMonster, opponentMonster, 1.5);
      setOpponentHealth(prev => Math.max(0, prev - damage));
      setBattleLog(prev => [...prev, `Perfect hit! ${playerMonster.name} deals ${damage} damage!`]);
    } else {
      const damage = calculateDamage(opponentMonster, playerMonster, 1.2);
      setPlayerHealth(prev => Math.max(0, prev - damage));
      setBattleLog(prev => [...prev, `Missed! ${opponentMonster.name} counters for ${damage} damage!`]);
    }
    setRound(prev => prev + 1);
    setPhase('battle');
  }, [playerMonster, opponentMonster, calculateDamage]);

  const handleMashingComplete = useCallback((success: boolean, percentage: number) => {
    const multiplier = percentage / 80;
    if (success) {
      const damage = calculateDamage(playerMonster, opponentMonster, multiplier);
      setOpponentHealth(prev => Math.max(0, prev - damage));
      setBattleLog(prev => [...prev, `Power attack! ${playerMonster.name} deals ${damage} damage!`]);
    } else {
      const damage = calculateDamage(opponentMonster, playerMonster, 1);
      setPlayerHealth(prev => Math.max(0, prev - damage));
      setBattleLog(prev => [...prev, `Weak attack... ${opponentMonster.name} retaliates for ${damage} damage!`]);
    }
    setRound(prev => prev + 1);
    setPhase('battle');
  }, [playerMonster, opponentMonster, calculateDamage]);

  const handleAbilityFire = useCallback((chargeLevel: number) => {
    const multiplier = chargeLevel >= 80 && chargeLevel <= 95 ? 2 : chargeLevel / 50;
    const damage = Math.round(playerMonster.stats.specialAttack * multiplier * 0.5);
    setOpponentHealth(prev => Math.max(0, prev - damage));
    
    const message = chargeLevel >= 80 && chargeLevel <= 95
      ? `PERFECT ${playerMonster.specialAbility.name}! ${damage} damage!`
      : `${playerMonster.specialAbility.name} deals ${damage} damage!`;
    
    setBattleLog(prev => [...prev, message]);
    setRound(prev => prev + 1);
    
    setTimeout(() => setPhase('battle'), 1000);
  }, [playerMonster]);

  return (
    <div 
      className="min-h-screen p-4 flex flex-col"
      style={{ 
        background: `linear-gradient(180deg, ${map.backgroundColor}, hsl(220 20% 4%))` 
      }}
    >
      {/* Map Name */}
      <div className="text-center mb-4">
        <span 
          className="px-4 py-1 rounded-full text-sm font-medium border"
          style={{ 
            borderColor: map.accentColor, 
            color: map.accentColor,
            background: `${map.accentColor}20`
          }}
        >
          {map.name}
        </span>
      </div>

      {/* Health Bars */}
      <div className="flex justify-between items-start gap-4 mb-6">
        {/* Player */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{playerMonster.name.includes('Kong') ? '🦍' : '🦎'}</span>
            <span className="font-orbitron font-bold text-sm text-foreground">{playerMonster.name}</span>
          </div>
          <div className="h-4 rounded-full overflow-hidden bg-muted">
            <div 
              className="h-full transition-all duration-500 bg-primary"
              style={{ width: `${playerHealth}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">{playerHealth}/100 HP</div>
        </div>

        {/* VS */}
        <div className="px-4 py-2">
          <span className="font-orbitron font-bold text-xl text-muted-foreground">VS</span>
        </div>

        {/* Opponent */}
        <div className="flex-1 space-y-2 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="font-orbitron font-bold text-sm text-foreground">{opponentMonster.name}</span>
            <span className="text-2xl">{opponentMonster.name.includes('Kong') ? '🦍' : '🦎'}</span>
          </div>
          <div className="h-4 rounded-full overflow-hidden bg-muted">
            <div 
              className="h-full transition-all duration-500 bg-destructive ml-auto"
              style={{ width: `${opponentHealth}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">{opponentHealth}/100 HP</div>
        </div>
      </div>

      {/* Battle Area */}
      <div className="flex-1 flex items-center justify-center">
        {phase === 'intro' && (
          <div className="text-center animate-scale-in">
            <h2 className="text-4xl font-orbitron font-bold text-primary text-glow-atomic mb-4">
              BATTLE START!
            </h2>
            <p className="text-xl text-muted-foreground">Round {round}</p>
          </div>
        )}

        {phase === 'battle' && (
          <div className="text-center animate-fade-in">
            <h3 className="text-2xl font-orbitron font-bold text-foreground mb-2">
              Round {round}
            </h3>
            <p className="text-muted-foreground">Get ready for the next action...</p>
          </div>
        )}

        {phase === 'qte' && (
          <QTEMiniGame 
            onComplete={handleQTEComplete}
            difficulty={round > 5 ? 'hard' : round > 3 ? 'medium' : 'easy'}
          />
        )}

        {phase === 'mashing' && (
          <ButtonMashing
            targetPresses={15 + round * 2}
            timeLimit={3}
            onComplete={handleMashingComplete}
          />
        )}

        {phase === 'ability' && (
          <AbilityTiming
            abilityName={playerMonster.specialAbility.name}
            onFire={handleAbilityFire}
          />
        )}

        {phase === 'result' && (
          <div className="text-center animate-scale-in space-y-6">
            <h2 className={`text-4xl font-orbitron font-bold ${
              winner === 'player' ? 'text-primary text-glow-atomic' : 'text-destructive'
            }`}>
              {winner === 'player' ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            <p className="text-xl text-foreground">
              {winner === 'player' 
                ? `${playerMonster.name} wins!` 
                : `${opponentMonster.name} wins...`}
            </p>
            <button
              onClick={() => onBattleEnd(winner === 'player')}
              className="px-8 py-4 rounded-xl font-orbitron font-bold text-lg bg-primary text-primary-foreground hover:scale-105 transition-transform glow-atomic"
            >
              Continue
            </button>
          </div>
        )}
      </div>

      {/* Battle Log */}
      {phase !== 'intro' && phase !== 'result' && (
        <div className="mt-4 p-3 rounded-lg bg-card/50 border border-border max-h-32 overflow-y-auto">
          {battleLog.slice(-3).map((log, i) => (
            <p key={i} className="text-sm text-muted-foreground animate-fade-in">
              {log}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
