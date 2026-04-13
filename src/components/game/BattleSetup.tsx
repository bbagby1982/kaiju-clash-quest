import { useState, useMemo } from 'react';
import { Monster } from '@/types/game';
import { MonsterCard } from './MonsterCard';
import { PLAYABLE_MONSTERS, getUnlockedMonsters, getRandomOpponent } from '@/data/monsters';
import { getMonsterImage as getCentralMonsterImage, getMonsterFallbackEmoji } from '@/lib/monsterImages';
import { Shuffle, ChevronRight, ArrowLeft, Swords, Target } from 'lucide-react';

type SetupStep = 'player' | 'opponent' | 'confirm';

interface BattleSetupProps {
  unlockedMonsterIds: string[];
  onSetupComplete: (playerMonster: Monster, opponent: Monster) => void;
  onBack: () => void;
}

export function BattleSetup({ unlockedMonsterIds, onSetupComplete, onBack }: BattleSetupProps) {
  const [step, setStep] = useState<SetupStep>('player');
  const [selectedPlayer, setSelectedPlayer] = useState<Monster | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<Monster | null>(null);
  const [opponentMode, setOpponentMode] = useState<'random' | 'choose' | null>(null);

  const unlockedMonsters = useMemo(() => {
    return getUnlockedMonsters(unlockedMonsterIds).sort((a, b) => a.name.localeCompare(b.name));
  }, [unlockedMonsterIds]);

  // Show ALL monsters as potential opponents (not just unlocked ones)
  const availableOpponents = useMemo(() => {
    if (!selectedPlayer) return [];
    return [...PLAYABLE_MONSTERS].filter(m => m.id !== selectedPlayer.id).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedPlayer]);

  const handlePlayerSelect = (monster: Monster) => {
    setSelectedPlayer(monster);
    setStep('opponent');
  };

  const handleRandomOpponent = () => {
    if (!selectedPlayer) return;
    const opp = getRandomOpponent(selectedPlayer.id, unlockedMonsterIds);
    setSelectedOpponent(opp);
    setOpponentMode('random');
    setStep('confirm');
  };

  const handleChooseOpponent = () => {
    setOpponentMode('choose');
  };

  const handleOpponentSelect = (monster: Monster) => {
    setSelectedOpponent(monster);
    setStep('confirm');
  };

  const handleConfirm = () => {
    if (selectedPlayer && selectedOpponent) {
      onSetupComplete(selectedPlayer, selectedOpponent);
    }
  };

  const handleBackStep = () => {
    if (step === 'confirm') {
      setStep('opponent');
      setSelectedOpponent(null);
      setOpponentMode(null);
    } else if (step === 'opponent') {
      setStep('player');
      setSelectedPlayer(null);
    } else {
      onBack();
    }
  };

  const getMonsterImage = (monsterId: string) => {
    return getCentralMonsterImage(monsterId);
  };

  // Step 1: Select Your Monster
  if (step === 'player') {
    return (
      <div className="min-h-screen p-4 flex flex-col bg-gradient-to-b from-background to-card animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-orbitron font-bold text-xl text-primary">Step 1: Your Monster</h1>
            <p className="text-sm text-muted-foreground">Choose your fighter!</p>
          </div>
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">1 of 3</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 flex-1 overflow-y-auto">
          {unlockedMonsters.map((monster) => (
            <MonsterCard
              key={monster.id}
              monster={monster}
              onClick={() => handlePlayerSelect(monster)}
              showStats={true}
              size="md"
            />
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Select Opponent
  if (step === 'opponent') {
    return (
      <div className="min-h-screen p-4 flex flex-col bg-gradient-to-b from-background to-card animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={handleBackStep} className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-orbitron font-bold text-xl text-primary">Step 2: Your Opponent</h1>
            <p className="text-sm text-muted-foreground">Who will you fight?</p>
          </div>
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">2 of 3</div>
        </div>

        {/* Selected player preview */}
        <div className="flex items-center gap-3 p-3 mb-6 rounded-xl bg-primary/10 border border-primary/30">
          <div 
            className="w-16 h-16 rounded-lg overflow-hidden border-2 border-primary"
            style={{ background: selectedPlayer?.imageColor }}
          >
            {selectedPlayer && (
              <img 
                src={getMonsterImage(selectedPlayer.id)} 
                alt={selectedPlayer.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Your Monster</p>
            <p className="font-orbitron font-bold text-primary">{selectedPlayer?.name}</p>
          </div>
        </div>

        {/* Opponent selection options */}
        {opponentMode === null && (
          <div className="space-y-4">
            <button
              onClick={handleRandomOpponent}
              className="w-full p-5 rounded-xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                <Shuffle className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-orbitron font-bold text-lg">🎲 Random Opponent</h3>
                <p className="text-sm text-muted-foreground">Let fate decide who you face!</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              onClick={handleChooseOpponent}
              className="w-full p-5 rounded-xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-xl bg-lightning/20 flex items-center justify-center">
                <Target className="w-7 h-7 text-lightning" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-orbitron font-bold text-lg">🎯 Choose Opponent</h3>
                <p className="text-sm text-muted-foreground">Pick the monster you want to battle!</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Choose opponent grid */}
        {opponentMode === 'choose' && (
          <div className="flex-1 overflow-y-auto">
            <p className="text-sm text-center text-muted-foreground mb-4">Tap a monster to select them as your opponent</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableOpponents.map((monster) => (
                <MonsterCard
                  key={monster.id}
                  monster={monster}
                  onClick={() => handleOpponentSelect(monster)}
                  showStats={true}
                  size="md"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Step 3: Confirm matchup
  if (step === 'confirm' && selectedPlayer && selectedOpponent) {
    return (
      <div className="min-h-screen p-4 flex flex-col bg-gradient-to-b from-background to-card animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={handleBackStep} className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-orbitron font-bold text-xl text-primary">Step 3: Confirm Battle</h1>
            <p className="text-sm text-muted-foreground">Ready to rumble?</p>
          </div>
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">3 of 3</div>
        </div>

        {/* Matchup Display */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-4 mb-8">
            {/* Player */}
            <div className="flex flex-col items-center">
              <div 
                className="w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden border-4 border-primary glow-atomic"
                style={{ background: selectedPlayer.imageColor }}
              >
                <img 
                  src={getMonsterImage(selectedPlayer.id)} 
                  alt={selectedPlayer.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-orbitron font-bold text-primary mt-3">{selectedPlayer.name}</h3>
              <p className="text-xs text-muted-foreground">Your Monster</p>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center px-4">
              <Swords className="w-10 h-10 text-lightning mb-2" />
              <span className="font-orbitron font-bold text-xl text-muted-foreground">VS</span>
            </div>

            {/* Opponent */}
            <div className="flex flex-col items-center">
              <div 
                className="w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden border-4 border-destructive"
                style={{ background: selectedOpponent.imageColor }}
              >
                <img 
                  src={getMonsterImage(selectedOpponent.id)} 
                  alt={selectedOpponent.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-orbitron font-bold text-destructive mt-3">{selectedOpponent.name}</h3>
              <p className="text-xs text-muted-foreground">
                {opponentMode === 'random' ? '🎲 Random' : '🎯 Chosen'}
              </p>
            </div>
          </div>

          {/* Quick stat comparison */}
          <div className="w-full max-w-md p-4 rounded-xl bg-card/50 border border-border mb-8">
            <h4 className="text-center text-sm font-medium text-muted-foreground mb-3">Quick Stats</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-xs text-muted-foreground">Total Power</span>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="font-orbitron font-bold text-primary">
                    {Object.values(selectedPlayer.stats).reduce((a, b) => a + b, 0)}
                  </span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="font-orbitron font-bold text-destructive">
                    {Object.values(selectedOpponent.stats).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Rarity</span>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-xs capitalize text-primary">{selectedPlayer.rarity}</span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="text-xs capitalize text-destructive">{selectedOpponent.rarity}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Era</span>
                <div className="flex flex-col items-center mt-1 text-xs">
                  <span className="text-primary">{selectedPlayer.era}</span>
                  <span className="text-destructive">{selectedOpponent.era}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleBackStep}
            className="flex-1 px-4 py-4 rounded-xl font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            Change Opponent
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-4 rounded-xl font-orbitron font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform glow-atomic flex items-center justify-center gap-2"
          >
            Continue <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
