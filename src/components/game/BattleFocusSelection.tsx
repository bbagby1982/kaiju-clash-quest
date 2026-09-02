import { useState } from 'react';
import { Monster } from '@/types/game';
import { Gauge, Zap, Shield, Sparkles, Shuffle, ChevronRight, ArrowLeft, Flame, Focus, Bomb } from 'lucide-react';
import { MonsterSprite } from './MonsterSprite';

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
    color: 'hsl(var(--lightning-yellow))',
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
    color: 'hsl(var(--lightning-yellow))',
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

/** True for the combo focuses that don't map onto a single stat. */
const isStatFocus = (focus: BattleFocus): focus is 'speed' | 'strength' | 'defense' | 'specialAttack' =>
  focus === 'speed' || focus === 'strength' || focus === 'defense' || focus === 'specialAttack';

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

  // ── Preview mode ────────────────────────────────────────────────────
  if (showPreview && selectedFocus && selectedOption) {
    const playerAdvice = getMonsterAdvice(playerMonster, selectedFocus);
    const opponentAdvice = getMonsterAdvice(opponent, selectedFocus);

    return (
      <div className="min-h-screen flex flex-col bg-background kq-no-x kq-screen-in">
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-background/85 backdrop-blur-md border-b border-border kq-safe-top">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="kq-tap p-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
            aria-label="Change Focus"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-orbitron font-black text-lg text-primary">Battle Preview</h1>
        </div>

        <div className="flex-1 px-3 pt-4 kq-screen-pad max-w-2xl w-full mx-auto">
          {/* Battle Focus Banner */}
          <div
            className="p-4 rounded-2xl border-2 mb-5 text-center"
            style={{ backgroundColor: `${selectedOption.color}1f`, borderColor: selectedOption.color }}
          >
            <div className="flex items-center justify-center gap-2 mb-2" style={{ color: selectedOption.color }}>
              {selectedOption.icon}
              <span className="font-orbitron font-bold text-lg">{selectedOption.label}</span>
            </div>
            <p className="text-sm text-foreground">{selectedOption.kidFriendlyExplanation}</p>
          </div>

          {/* Monster Matchup */}
          <div className="flex items-end justify-between gap-1 mb-5">
            <div className="flex-1 min-w-0 flex flex-col items-center text-center">
              <MonsterSprite monster={playerMonster} size="md" state="idle" side="left" shadow />
              <h3 className="font-orbitron font-bold text-sm text-primary mt-2 truncate max-w-full">{playerMonster.name}</h3>

              {isStatFocus(selectedFocus) && (
                <div
                  className="mt-1.5 px-3 py-1 rounded-lg inline-block"
                  style={{ backgroundColor: `${selectedOption.color}25` }}
                >
                  <span className="font-orbitron font-bold" style={{ color: selectedOption.color }}>
                    {playerMonster.stats[selectedFocus]}
                  </span>
                </div>
              )}

              <p className={`text-xs mt-1.5 ${playerAdvice.good ? 'text-primary' : 'text-destructive'}`}>
                {playerAdvice.text}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center pb-8 shrink-0">
              <span className="kq-vs">VS</span>
            </div>

            <div className="flex-1 min-w-0 flex flex-col items-center text-center">
              <MonsterSprite monster={opponent} size="md" state="idle" side="right" shadow />
              <h3 className="font-orbitron font-bold text-sm text-destructive mt-2 truncate max-w-full">{opponent.name}</h3>

              {isStatFocus(selectedFocus) && (
                <div
                  className="mt-1.5 px-3 py-1 rounded-lg inline-block"
                  style={{ backgroundColor: `${selectedOption.color}25` }}
                >
                  <span className="font-orbitron font-bold" style={{ color: selectedOption.color }}>
                    {opponent.stats[selectedFocus]}
                  </span>
                </div>
              )}

              <p className={`text-xs mt-1.5 ${opponentAdvice.good ? 'text-destructive' : 'text-primary'}`}>
                {opponentAdvice.text}
              </p>
            </div>
          </div>

          {/* Monster Descriptions */}
          <div className="space-y-3 mb-6">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
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
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="kq-tap flex-1 px-4 py-4 rounded-xl font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              Change Focus
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="kq-tap flex-1 px-4 py-4 rounded-xl font-orbitron font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform glow-atomic flex items-center justify-center gap-2"
            >
              Battle! <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Focus selection ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background kq-no-x kq-screen-in">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-background/85 backdrop-blur-md border-b border-border kq-safe-top">
        <button
          type="button"
          onClick={onBack}
          className="kq-tap p-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
          aria-label="Back to Monster Select"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="font-orbitron font-black text-lg text-primary truncate">Choose Battle Focus</h1>
          <p className="text-xs text-muted-foreground truncate">What will this battle test?</p>
        </div>
      </div>

      <div className="flex-1 px-3 pt-4 kq-screen-pad max-w-2xl w-full mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {battleFocusOptions.map((option, i) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleSelect(option.key)}
              className="kq-tile kq-stagger"
              data-selected={selectedFocus === option.key ? 'true' : 'false'}
              style={{ '--kq-tile-color': option.color, '--i': i } as React.CSSProperties}
            >
              <span className="kq-tile-icon" aria-hidden="true">{option.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-orbitron font-bold text-sm leading-tight" style={{ color: option.color }}>
                  {option.label}
                </span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onBack}
          className="kq-tap w-full px-4 py-4 rounded-xl font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors"
        >
          Back to Monster Select
        </button>
      </div>
    </div>
  );
}
