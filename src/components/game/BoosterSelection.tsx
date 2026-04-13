import { useState } from 'react';
import { Booster } from '@/types/game';
import { BOOSTERS, getUnlockedBoosters } from '@/data/boosters';
import { Shuffle, Sparkles } from 'lucide-react';

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

  return (
    <div className="space-y-4 p-4 bg-card/50 rounded-xl border border-border">
      <div className="text-center">
        <h3 className="font-orbitron font-bold text-lg text-foreground flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-lightning" />
          Select Booster
        </h3>
        <p className="text-sm text-muted-foreground">Optional power-up for battle</p>
      </div>

      {/* No Booster Option */}
      <button
        onClick={() => handleSelect(null)}
        className={`w-full p-3 rounded-lg border-2 transition-all ${
          selectedBooster === null && !randomMode
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-muted-foreground'
        }`}
      >
        <span className="text-sm font-medium text-foreground">No Booster</span>
        <p className="text-xs text-muted-foreground">Fight with pure skill!</p>
      </button>

      {/* Random Booster */}
      <button
        onClick={handleRandomSelect}
        className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
          randomMode
            ? 'border-lightning bg-lightning/10'
            : 'border-border hover:border-lightning'
        }`}
      >
        <Shuffle className="w-4 h-4 text-lightning" />
        <span className="text-sm font-medium text-foreground">Random Booster</span>
      </button>

      {/* Available Boosters */}
      <div className="grid grid-cols-2 gap-2">
        {unlockedBoosters.map((booster) => (
          <button
            key={booster.id}
            onClick={() => handleSelect(booster)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              selectedBooster?.id === booster.id && !randomMode
                ? 'border-primary bg-primary/10 scale-[1.02]'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{booster.icon}</span>
              <span className="text-sm font-medium text-foreground">{booster.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">{booster.description}</p>
          </button>
        ))}

        {/* Locked Boosters */}
        {lockedBoosters.map((booster) => (
          <div
            key={booster.id}
            className="p-3 rounded-lg border-2 border-border opacity-50 cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg grayscale">🔒</span>
              <span className="text-sm font-medium text-muted-foreground">???</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Win {booster.unlockRequirement?.value} battles
            </p>
          </div>
        ))}
      </div>

      {/* Confirm Button */}
      <button
        onClick={onConfirm}
        className="w-full py-3 rounded-xl font-orbitron font-bold text-lg bg-primary text-primary-foreground hover:scale-[1.02] transition-transform glow-atomic"
      >
        {selectedBooster ? `Fight with ${selectedBooster.name}!` : 'Fight Without Booster!'}
      </button>
    </div>
  );
}
