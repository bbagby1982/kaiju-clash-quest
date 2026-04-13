import { useState } from 'react';
import { Monster } from '@/types/game';
import { Gauge, Zap, Shield, Sparkles, Shuffle, ChevronRight, Swords } from 'lucide-react';
import { getMonsterImage } from '@/lib/monsterImages';

import { Flame, Focus, Bomb } from 'lucide-react';

export type BattleFocus = 'speed' | 'strength' | 'defense' | 'specialAttack' | 'fireVsIce' | 'focusVsDistraction' | 'allOut' | 'random';

interface BattleFocusOption {
  key: BattleFocus;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  kidFriendlyExplanation: string;
}

const battleFocusOptions: BattleFocusOption[] = [
  {
    key: 'speed',
    label: 'Speed Battle',
    description: 'The faster monster wins!',
    icon: <Gauge className="w-6 h-6" />,
    color: 'hsl(var(--electric-blue))',
    kidFriendlyExplanation: 'This battle is about quickness. The monster who can move faster and react quicker has the advantage!',
  },
  {
    key: 'strength',
    label: 'Strength Battle',
    description: 'The stronger monster wins!',
    icon: <Zap className="w-6 h-6" />,
    color: 'hsl(var(--monster-red))',
    kidFriendlyExplanation: 'This battle is about raw power. The monster with bigger muscles and harder hits will win!',
  },
  {
    key: 'defense',
    label: 'Defense Battle',
    description: 'The toughest monster wins!',
    icon: <Shield className="w-6 h-6" />,
    color: 'hsl(var(--atomic-green))',
    kidFriendlyExplanation: 'This battle is about toughness. The monster with thicker armor and better protection wins!',
  },
  {
    key: 'specialAttack',
    label: 'Special Attack Battle',
    description: 'The most powerful ability wins!',
    icon: <Sparkles className="w-6 h-6" />,
    color: 'hsl(var(--lightning))',
    kidFriendlyExplanation: 'This battle is about special powers. The monster with the coolest and strongest ability wins!',
  },
  {
    key: 'fireVsIce',
    label: '🔥 Fire vs Ice ❄️',
    description: 'An elemental clash!',
    icon: <Flame className="w-6 h-6" />,
    color: 'hsl(var(--monster-red))',
    kidFriendlyExplanation: 'A fiery showdown! Strength AND special attack both count in this epic elemental battle!',
  },
  {
    key: 'focusVsDistraction',
    label: '🎯 Focus vs Distraction',
    description: 'A battle of concentration!',
    icon: <Focus className="w-6 h-6" />,
    color: 'hsl(var(--electric-blue))',
    kidFriendlyExplanation: 'Stay focused! Defense AND special attack combine. The most concentrated monster wins!',
  },
  {
    key: 'allOut',
    label: '💥 All-Out Brawl',
    description: 'Everything counts!',
    icon: <Bomb className="w-6 h-6" />,
    color: 'hsl(var(--lightning))',
    kidFriendlyExplanation: 'No holds barred! ALL your stats get added up. The best overall monster wins this one!',
  },
  {
    key: 'random',
    label: 'Random Battle',
    description: 'Spin the wheel of fate!',
    icon: <Shuffle className="w-6 h-6" />,
    color: 'hsl(var(--primary))',
    kidFriendlyExplanation: 'The battle type will be chosen randomly. Anything could happen!',
  },
];

// Get strength/weakness description for a monster in a focus
const getMonsterAdvice = (monster: Monster, focus: BattleFocus): { good: boolean; text: string } => {
  if (focus === 'random') {
    return { good: true, text: 'Balanced fighter' };
  }
  
  const stat = monster.stats[focus as keyof typeof monster.stats];
  const avgStat = (monster.stats.speed + monster.stats.strength + monster.stats.defense + monster.stats.specialAttack) / 4;
  
  if (stat >= 85) return { good: true, text: `Excellent ${focus}!` };
  if (stat >= 70) return { good: true, text: `Good ${focus}` };
  if (stat < avgStat - 10) return { good: false, text: `Weak in ${focus}` };
  return { good: true, text: 'Average' };
};

interface BattleFocusSelectionProps {
  playerMonster: Monster;
  opponent: Monster;
  onSelectFocus: (focus: BattleFocus) => void;
  onBack: () => void;
}

export function BattleFocusSelection({ playerMonster, opponent, onSelectFocus, onBack }: BattleFocusSelectionProps) {
  const [selectedFocus, setSelectedFocus] = useState<BattleFocus | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleSelect = (focus: BattleFocus) => {
    setSelectedFocus(focus);
    setShowPreview(true);
  };

  const handleConfirm = () => {
    if (selectedFocus) {
      onSelectFocus(selectedFocus);
    }
  };

  const selectedOption = battleFocusOptions.find(o => o.key === selectedFocus);

  // Preview mode - show battle preview
  if (showPreview && selectedFocus && selectedOption) {
    const playerAdvice = getMonsterAdvice(playerMonster, selectedFocus);
    const opponentAdvice = getMonsterAdvice(opponent, selectedFocus);
    
    return (
      <div className="min-h-screen p-4 flex flex-col bg-gradient-to-b from-background to-card animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="font-orbitron font-bold text-2xl text-primary">Battle Preview</h1>
        </div>

        {/* Battle Focus Banner */}
        <div 
          className="p-4 rounded-xl mb-6 text-center"
          style={{ backgroundColor: `${selectedOption.color}20`, borderColor: selectedOption.color }}
        >
          <div className="flex items-center justify-center gap-2 mb-2" style={{ color: selectedOption.color }}>
            {selectedOption.icon}
            <span className="font-orbitron font-bold text-lg">{selectedOption.label}</span>
          </div>
          <p className="text-sm text-foreground">{selectedOption.kidFriendlyExplanation}</p>
        </div>

        {/* Monster Matchup */}
        <div className="flex items-start gap-4 mb-6">
          {/* Player */}
          <div className="flex-1 text-center">
            <div 
              className="w-24 h-24 mx-auto rounded-xl overflow-hidden border-2 border-primary mb-3"
              style={{ background: playerMonster.imageColor }}
            >
              <img 
                src={getMonsterImage(playerMonster.id)}
                alt={playerMonster.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-orbitron font-bold text-sm text-primary">{playerMonster.name}</h3>
            
            {/* Stat for this focus */}
            {selectedFocus !== 'random' && (
              <div 
                className="mt-2 px-3 py-1 rounded-lg inline-block"
                style={{ backgroundColor: `${selectedOption.color}20` }}
              >
                <span className="font-bold" style={{ color: selectedOption.color }}>
                  {playerMonster.stats[selectedFocus as keyof typeof playerMonster.stats]}
                </span>
              </div>
            )}
            
            {/* Advice */}
            <p className={`text-xs mt-2 ${playerAdvice.good ? 'text-primary' : 'text-destructive'}`}>
              {playerAdvice.text}
            </p>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center justify-center pt-8">
            <Swords className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground">VS</span>
          </div>

          {/* Opponent */}
          <div className="flex-1 text-center">
            <div 
              className="w-24 h-24 mx-auto rounded-xl overflow-hidden border-2 border-destructive mb-3"
              style={{ background: opponent.imageColor }}
            >
              <img 
                src={getMonsterImage(opponent.id)}
                alt={opponent.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-orbitron font-bold text-sm text-destructive">{opponent.name}</h3>
            
            {/* Stat for this focus */}
            {selectedFocus !== 'random' && (
              <div 
                className="mt-2 px-3 py-1 rounded-lg inline-block"
                style={{ backgroundColor: `${selectedOption.color}20` }}
              >
                <span className="font-bold" style={{ color: selectedOption.color }}>
                  {opponent.stats[selectedFocus as keyof typeof opponent.stats]}
                </span>
              </div>
            )}
            
            {/* Advice */}
            <p className={`text-xs mt-2 ${opponentAdvice.good ? 'text-destructive' : 'text-primary'}`}>
              {opponentAdvice.text}
            </p>
          </div>
        </div>

        {/* Monster Descriptions */}
        <div className="space-y-3 mb-6">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm">
              <span className="font-bold text-primary">{playerMonster.name}</span>
              {' is '}
              {playerMonster.stats.strength >= 80 ? 'strong and heavy' : 
               playerMonster.stats.speed >= 80 ? 'fast and agile' :
               playerMonster.stats.defense >= 80 ? 'tough and armored' :
               'well-balanced'}
              {'.'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm">
              <span className="font-bold text-destructive">{opponent.name}</span>
              {' is '}
              {opponent.stats.strength >= 80 ? 'powerful but maybe slow' : 
               opponent.stats.speed >= 80 ? 'quick but might lack power' :
               opponent.stats.defense >= 80 ? 'hard to hurt' :
               'a tricky fighter'}
              {'.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto flex gap-3">
          <button
            onClick={() => setShowPreview(false)}
            className="flex-1 px-4 py-3 rounded-xl font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            Change Focus
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 rounded-xl font-orbitron font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform glow-atomic flex items-center justify-center gap-2"
          >
            Battle! <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Focus selection mode
  return (
    <div className="min-h-screen p-4 flex flex-col bg-gradient-to-b from-background to-card animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="font-orbitron font-bold text-2xl text-primary mb-2">Choose Battle Focus</h1>
        <p className="text-sm text-muted-foreground">What will this battle test?</p>
      </div>

      {/* Battle Focus Options */}
      <div className="space-y-3 mb-6">
        {battleFocusOptions.map((option) => (
          <button
            key={option.key}
            onClick={() => handleSelect(option.key)}
            className={`w-full p-4 rounded-xl border-2 transition-all hover:scale-[1.02] text-left ${
              selectedFocus === option.key 
                ? 'border-primary bg-primary/10' 
                : 'border-border bg-card hover:border-muted-foreground'
            }`}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${option.color}20`, color: option.color }}
              >
                {option.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-orbitron font-bold text-base" style={{ color: option.color }}>
                  {option.label}
                </h3>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      {/* Back Button */}
      <div className="mt-auto">
        <button
          onClick={onBack}
          className="w-full px-4 py-3 rounded-xl font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors"
        >
          Back to Monster Select
        </button>
      </div>
    </div>
  );
}