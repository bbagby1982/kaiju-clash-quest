import { useState } from 'react';
import { Booster } from '@/types/game';
import { BOOSTERS, getUnlockedBoosters } from '@/data/boosters';
import { Shuffle, Sparkles, Lock, Check } from 'lucide-react';

interface BoosterSelectionProps {
  progress: { wins: number; unlockedBoosters: string[] };
  onSelect: (booster: Booster | null) => void;
  onConfirm: () => void;
}

export function BoosterSelection({ progress, onSelect, onConfirm }: BoosterSelectionProps) {
  const [selectedBooster, setSelectedBooster] = useState<Booster | null>(null);
  const [randomMode, setRandomMode] = useState(false);

  const unlockedBoosters = getUnlockedBoosters(progress);
  const lockedBoosters = BOOSTERS.filter(b => !unlockedBoosters.includes(b));

  const handleSelect = (booster: Booster | null) => {
    setSelectedBooster(booster);
    setRandomMode(false);
    onSelect(booster);
  };

  const handleRandomSelect = () => {
    const random = unlockedBoosters[Math.floor(Math.random() * unlockedBoosters.length)];
    setSelectedBooster(random);
    setRandomMode(true);
    onSelect(random);
  };

  const noBoosterSelected = selectedBooster === null && !randomMode;

  return (
    <div className="space-y-3 p-3 sm:p-4 kq-panel">
      <div className="text-center">
        <h3 className="font-orbitron font-bold text-lg text-foreground flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-lightning" />
          Select Booster
        </h3>
        <p className="text-sm text-muted-foreground">Optional power-up for battle</p>
      </div>

      <div className="kq-booster-grid">
        {/* No Booster */}
        <button
          type="button"
          onClick={() => handleSelect(null)}
          className="kq-tile kq-tap"
          data-selected={noBoosterSelected ? 'true' : 'false'}
          style={{ '--kq-tile-color': 'hsl(var(--primary))' } as React.CSSProperties}
        >
          <span className="kq-tile-icon" aria-hidden="true">🚫</span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-foreground">No Booster</span>
            <span className="block text-xs text-muted-foreground">Fight with pure skill!</span>
          </span>
          {noBoosterSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
        </button>

        {/* Random Booster */}
        <button
          type="button"
          onClick={handleRandomSelect}
          className="kq-tile kq-tap"
          data-selected={randomMode ? 'true' : 'false'}
          style={{ '--kq-tile-color': 'hsl(var(--lightning-yellow))' } as React.CSSProperties}
        >
          <span className="kq-tile-icon" aria-hidden="true">
            <Shuffle className="w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-foreground">Random Booster</span>
            <span className="block text-xs text-muted-foreground">
              {randomMode && selectedBooster ? selectedBooster.name : 'Surprise me!'}
            </span>
          </span>
          {randomMode && <Check className="w-4 h-4 text-lightning shrink-0" />}
        </button>

        {/* Available Boosters */}
        {unlockedBoosters.map((booster) => {
          const isPicked = selectedBooster?.id === booster.id && !randomMode;
          return (
            <button
              key={booster.id}
              type="button"
              onClick={() => handleSelect(booster)}
              className="kq-tile kq-tap"
              data-selected={isPicked ? 'true' : 'false'}
              style={{ '--kq-tile-color': booster.color } as React.CSSProperties}
            >
              <span className="kq-tile-icon" aria-hidden="true">{booster.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-foreground">{booster.name}</span>
                <span className="block text-xs text-muted-foreground">{booster.description}</span>
              </span>
              {isPicked && <Check className="w-4 h-4 shrink-0" style={{ color: booster.color }} />}
            </button>
          );
        })}

        {/* Locked Boosters */}
        {lockedBoosters.map((booster) => (
          <div key={booster.id} className="kq-tile" data-locked="true">
            <span className="kq-tile-icon" aria-hidden="true">
              <Lock className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-muted-foreground">???</span>
              <span className="block text-xs text-muted-foreground">
                Win {booster.unlockRequirement?.value} battles
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Confirm */}
      <button
        type="button"
        onClick={onConfirm}
        className="kq-tap w-full py-4 rounded-xl font-orbitron font-bold text-base sm:text-lg bg-primary text-primary-foreground hover:scale-[1.02] transition-transform glow-atomic"
      >
        {selectedBooster ? `Fight with ${selectedBooster.name}!` : 'Fight Without Booster!'}
      </button>
    </div>
  );
}
