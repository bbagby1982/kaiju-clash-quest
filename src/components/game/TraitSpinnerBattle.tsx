import { useState, useEffect, useCallback } from 'react';
import { Monster } from '@/types/game';
import { Gauge, Zap, Shield, Sparkles } from 'lucide-react';

// Monster image imports
import showaGodzilla from '@/assets/monsters/showa-godzilla.png';
import kingKong from '@/assets/monsters/king-kong.png';
import heiseiGodzilla from '@/assets/monsters/heisei-godzilla.png';
import evolvedGodzilla from '@/assets/monsters/evolved-godzilla.png';
import millenniumGodzilla from '@/assets/monsters/millennium-godzilla.png';
import monsterverseGodzilla from '@/assets/monsters/monsterverse-godzilla.png';
import burningGodzilla from '@/assets/monsters/burning-godzilla.png';
import battleKong from '@/assets/monsters/battle-kong.png';
import sharkgera from '@/assets/monsters/sharkgera.png';
import infernox from '@/assets/monsters/infernox.png';
import glacius from '@/assets/monsters/glacius.png';
import voltara from '@/assets/monsters/voltara.png';
import cyclonix from '@/assets/monsters/cyclonix.png';

const monsterImages: Record<string, string> = {
  'showa-godzilla': showaGodzilla,
  'king-kong': kingKong,
  'heisei-godzilla': heiseiGodzilla,
  'evolved-godzilla': evolvedGodzilla,
  'millennium-godzilla': millenniumGodzilla,
  'monsterverse-godzilla': monsterverseGodzilla,
  'burning-godzilla': burningGodzilla,
  'kong-armed': battleKong,
  'sharkgera': sharkgera,
  'infernox': infernox,
  'glacius': glacius,
  'voltara': voltara,
  'cyclonix': cyclonix,
};

import { Booster, GameMap } from '@/types/game';

type BattleFocus = 'speed' | 'strength' | 'defense' | 'specialAttack' | 'random';

interface TraitSpinnerBattleProps {
  playerMonster: Monster;
  opponentMonster: Monster;
  booster?: Booster | null;
  map?: GameMap;
  battleFocus?: BattleFocus | null;
  onBattleEnd: (won: boolean, opponentId?: string, trait?: string) => void;
}

type Trait = 'speed' | 'strength' | 'defense' | 'specialAttack';

const traits: { key: Trait; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'speed', label: 'SPEED', icon: <Gauge className="w-6 h-6" />, color: 'hsl(var(--electric-blue))' },
  { key: 'strength', label: 'STRENGTH', icon: <Zap className="w-6 h-6" />, color: 'hsl(var(--monster-red))' },
  { key: 'defense', label: 'DEFENSE', icon: <Shield className="w-6 h-6" />, color: 'hsl(var(--atomic-green))' },
  { key: 'specialAttack', label: 'SPECIAL', icon: <Sparkles className="w-6 h-6" />, color: 'hsl(var(--lightning))' },
];

type Phase = 'intro' | 'spinning' | 'comparing' | 'result';

export function TraitSpinnerBattle({ playerMonster, opponentMonster, booster, map, battleFocus, onBattleEnd }: TraitSpinnerBattleProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentTraitIndex, setCurrentTraitIndex] = useState(0);
  const [selectedTrait, setSelectedTrait] = useState<typeof traits[0] | null>(null);
  const [winner, setWinner] = useState<'player' | 'opponent' | 'tie' | null>(null);
  const [showStats, setShowStats] = useState(false);

  // If battleFocus is pre-selected (not random), skip spinning
  const hasPreselectedFocus = battleFocus && battleFocus !== 'random';

  // Start spinning after intro (or skip if focus is preselected)
  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => {
        if (hasPreselectedFocus) {
          // Skip spinning, go directly to comparing
          const traitIndex = traits.findIndex(t => t.key === battleFocus);
          setCurrentTraitIndex(traitIndex >= 0 ? traitIndex : 0);
          setSelectedTrait(traits[traitIndex >= 0 ? traitIndex : 0]);
          setPhase('comparing');
        } else {
          setPhase('spinning');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, hasPreselectedFocus, battleFocus]);

  // Spinning animation (only if no preselected focus)
  useEffect(() => {
    if (phase === 'spinning') {
      const spinDuration = 3000;
      const spinInterval = 80; // Start fast
      let elapsed = 0;
      let currentInterval = spinInterval;

      const spin = () => {
        elapsed += currentInterval;
        setCurrentTraitIndex(prev => (prev + 1) % traits.length);
        
        // Slow down over time
        currentInterval = Math.min(400, spinInterval + (elapsed / spinDuration) * 300);
        
        if (elapsed < spinDuration) {
          setTimeout(spin, currentInterval);
        } else {
          // Final selection
          const finalIndex = Math.floor(Math.random() * traits.length);
          setCurrentTraitIndex(finalIndex);
          setSelectedTrait(traits[finalIndex]);
          setTimeout(() => setPhase('comparing'), 500);
        }
      };
      
      spin();
    }
  }, [phase]);

  // Compare stats after spinner stops
  useEffect(() => {
    if (phase === 'comparing' && selectedTrait) {
      setTimeout(() => setShowStats(true), 500);
      
      // Apply booster bonus
      const boosterBonus = booster && (
        (booster.effect === 'attack' && selectedTrait.key === 'specialAttack') ||
        (booster.effect === 'defense' && selectedTrait.key === 'defense') ||
        (booster.effect === 'speed' && selectedTrait.key === 'speed')
      ) ? booster.power : 0;
      
      const playerStat = playerMonster.stats[selectedTrait.key] + boosterBonus;
      const opponentStat = opponentMonster.stats[selectedTrait.key];
      
      setTimeout(() => {
        if (playerStat > opponentStat) {
          setWinner('player');
        } else if (opponentStat > playerStat) {
          setWinner('opponent');
        } else {
          setWinner('tie');
        }
        setPhase('result');
      }, 2000);
    }
  }, [phase, selectedTrait, playerMonster, opponentMonster, booster]);

  const getMonsterImage = (monsterId: string) => {
    return monsterImages[monsterId] || showaGodzilla;
  };

  const currentTrait = traits[currentTraitIndex];

  return (
    <div className="min-h-screen p-4 flex flex-col bg-gradient-to-b from-background to-card">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="font-orbitron font-bold text-2xl text-primary text-glow-atomic">
          TRAIT BATTLE
        </h1>
      </div>

      {/* Monster Face-off */}
      <div className="flex justify-between items-center gap-4 mb-8">
        {/* Player Monster */}
        <div className={`flex-1 flex flex-col items-center transition-all duration-500 ${
          winner === 'player' ? 'scale-110' : winner === 'opponent' ? 'opacity-50 scale-90' : ''
        }`}>
          <div 
            className={`w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 transition-all duration-300 ${
              winner === 'player' ? 'border-primary glow-atomic animate-pulse-glow' : 'border-border'
            }`}
          >
            <img 
              src={getMonsterImage(playerMonster.id)} 
              alt={playerMonster.name}
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="font-orbitron font-bold text-sm md:text-base mt-3 text-foreground">
            {playerMonster.name}
          </h3>
          {showStats && selectedTrait && (
            <div 
              className="mt-2 px-4 py-2 rounded-lg font-bold text-xl animate-scale-in"
              style={{ backgroundColor: `${selectedTrait.color}20`, color: selectedTrait.color }}
            >
              {playerMonster.stats[selectedTrait.key]}
            </div>
          )}
        </div>

        {/* VS Badge */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-card border-2 border-primary flex items-center justify-center glow-atomic">
            <span className="font-orbitron font-bold text-xl text-primary">VS</span>
          </div>
        </div>

        {/* Opponent Monster */}
        <div className={`flex-1 flex flex-col items-center transition-all duration-500 ${
          winner === 'opponent' ? 'scale-110' : winner === 'player' ? 'opacity-50 scale-90' : ''
        }`}>
          <div 
            className={`w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 transition-all duration-300 ${
              winner === 'opponent' ? 'border-destructive glow-battle animate-pulse-glow' : 'border-border'
            }`}
          >
            <img 
              src={getMonsterImage(opponentMonster.id)} 
              alt={opponentMonster.name}
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="font-orbitron font-bold text-sm md:text-base mt-3 text-foreground">
            {opponentMonster.name}
          </h3>
          {showStats && selectedTrait && (
            <div 
              className="mt-2 px-4 py-2 rounded-lg font-bold text-xl animate-scale-in"
              style={{ backgroundColor: `${selectedTrait.color}20`, color: selectedTrait.color }}
            >
              {opponentMonster.stats[selectedTrait.key]}
            </div>
          )}
        </div>
      </div>

      {/* Trait Spinner */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {phase === 'intro' && (
          <div className="text-center animate-scale-in">
            <h2 className="text-3xl md:text-4xl font-orbitron font-bold text-primary text-glow-atomic mb-4">
              GET READY!
            </h2>
            <p className="text-muted-foreground">Spinning for battle trait...</p>
          </div>
        )}

        {(phase === 'spinning' || phase === 'comparing') && (
          <div className="relative">
            {/* Spinner Container */}
            <div className={`relative p-8 rounded-3xl border-4 transition-all duration-300 ${
              phase === 'comparing' ? 'border-primary glow-atomic' : 'border-muted'
            }`}>
              {/* Trait Display */}
              <div 
                className={`flex flex-col items-center gap-3 p-6 rounded-2xl transition-all ${
                  phase === 'spinning' ? 'animate-shake' : ''
                }`}
                style={{ 
                  backgroundColor: `${currentTrait.color}20`,
                  boxShadow: phase === 'comparing' ? `0 0 30px ${currentTrait.color}40` : 'none'
                }}
              >
                <div style={{ color: currentTrait.color }}>
                  {currentTrait.icon}
                </div>
                <span 
                  className="font-orbitron font-bold text-2xl md:text-3xl"
                  style={{ color: currentTrait.color }}
                >
                  {currentTrait.label}
                </span>
              </div>

              {/* Spinning indicator */}
              {phase === 'spinning' && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-primary animate-bounce" />
                </div>
              )}
            </div>

            {/* Trait options preview */}
            <div className="flex justify-center gap-2 mt-6">
              {traits.map((trait, i) => (
                <div 
                  key={trait.key}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    i === currentTraitIndex ? 'scale-150' : 'opacity-40'
                  }`}
                  style={{ backgroundColor: trait.color }}
                />
              ))}
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="text-center animate-scale-in space-y-6">
            <div 
              className="px-6 py-3 rounded-full mb-4 inline-block"
              style={{ 
                backgroundColor: `${selectedTrait?.color}20`,
                color: selectedTrait?.color
              }}
            >
              <span className="font-orbitron font-bold">{selectedTrait?.label} BATTLE</span>
            </div>

            <h2 className={`text-4xl md:text-5xl font-orbitron font-bold ${
              winner === 'player' ? 'text-primary text-glow-atomic' : 
              winner === 'opponent' ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {winner === 'player' ? 'YOU WIN!' : winner === 'opponent' ? 'YOU LOSE!' : 'TIE!'}
            </h2>

            <p className="text-lg text-foreground">
              {winner === 'player' && (
                <>
                  <span className="text-primary font-bold">{playerMonster.name}</span>
                  {' '} has higher {selectedTrait?.label.toLowerCase()} than {' '}
                  <span className="text-destructive font-bold">{opponentMonster.name}</span>!
                </>
              )}
              {winner === 'opponent' && (
                <>
                  <span className="text-destructive font-bold">{opponentMonster.name}</span>
                  {' '} has higher {selectedTrait?.label.toLowerCase()} than {' '}
                  <span className="text-primary font-bold">{playerMonster.name}</span>...
                </>
              )}
              {winner === 'tie' && (
                <>Both monsters are equally matched in {selectedTrait?.label.toLowerCase()}!</>
              )}
            </p>

            <div className="flex justify-center gap-4 text-lg">
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold">{playerMonster.name}:</span>
                <span style={{ color: selectedTrait?.color }} className="font-bold">
                  {selectedTrait && playerMonster.stats[selectedTrait.key]}
                </span>
              </div>
              <span className="text-muted-foreground">vs</span>
              <div className="flex items-center gap-2">
                <span className="text-destructive font-bold">{opponentMonster.name}:</span>
                <span style={{ color: selectedTrait?.color }} className="font-bold">
                  {selectedTrait && opponentMonster.stats[selectedTrait.key]}
                </span>
              </div>
            </div>

            <button
              onClick={() => onBattleEnd(winner === 'player', opponentMonster.id, selectedTrait?.key)}
              className="px-8 py-4 rounded-xl font-orbitron font-bold text-lg bg-primary text-primary-foreground hover:scale-105 transition-transform glow-atomic"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
