import { useMemo, useState } from 'react';
import { Monster } from '@/types/game';
import { MonsterCard } from './MonsterCard';
import { MonsterSprite } from './MonsterSprite';
import { useRoster } from '@/lib/roster';
import { Shuffle, ChevronRight, ArrowLeft, Target, AlertTriangle } from 'lucide-react';

type SetupStep = 'player' | 'opponent' | 'confirm';

interface BattleSetupProps {
  unlockedMonsterIds: string[];
  onSetupComplete: (playerMonster: Monster, opponent: Monster) => void;
  onBack: () => void;
}

function SetupShell({
  title,
  subtitle,
  stepLabel,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  stepLabel: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-card kq-no-x kq-screen-in">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-background/85 backdrop-blur-md border-b border-border kq-safe-top">
        <button
          type="button"
          onClick={onBack}
          className="kq-tap p-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-orbitron font-black text-lg text-primary truncate">{title}</h1>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        <span className="text-[0.65rem] font-bold tracking-widest text-muted-foreground bg-muted px-2.5 py-1.5 rounded-lg shrink-0">
          {stepLabel}
        </span>
      </div>
      <div className="flex-1 flex flex-col px-3 pt-4 kq-screen-pad">{children}</div>
    </div>
  );
}

function MonsterGrid({ monsters, onPick }: { monsters: Monster[]; onPick: (m: Monster) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {monsters.map((monster, i) => (
        <div key={monster.id} className="kq-stagger" style={{ '--i': i } as React.CSSProperties}>
          <MonsterCard monster={monster} onClick={() => onPick(monster)} size="md" showStats={false} />
        </div>
      ))}
    </div>
  );
}

export function BattleSetup({ unlockedMonsterIds, onSetupComplete, onBack }: BattleSetupProps) {
  const roster = useRoster();
  const [step, setStep] = useState<SetupStep>('player');
  const [selectedPlayer, setSelectedPlayer] = useState<Monster | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<Monster | null>(null);
  const [opponentMode, setOpponentMode] = useState<'random' | 'choose' | null>(null);

  const unlockedMonsters = useMemo(
    () => roster.unlocked(unlockedMonsterIds).sort((a, b) => a.name.localeCompare(b.name)),
    [roster, unlockedMonsterIds],
  );

  // Show ALL playable monsters as potential opponents (not just unlocked ones)
  const availableOpponents = useMemo(() => {
    if (!selectedPlayer) return [];
    return roster.playable.filter(m => m.id !== selectedPlayer.id).sort((a, b) => a.name.localeCompare(b.name));
  }, [roster, selectedPlayer]);

  const handlePlayerSelect = (monster: Monster) => {
    setSelectedPlayer(monster);
    setStep('opponent');
  };

  const handleRandomOpponent = () => {
    if (!selectedPlayer) return;
    setSelectedOpponent(roster.randomOpponent(selectedPlayer.id));
    setOpponentMode('random');
    setStep('confirm');
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

  // ── Step 1: Your monster ─────────────────────────────────────────────
  if (step === 'player') {
    const stillLoading = !roster.ready && roster.playable.length === 0;
    return (
      <SetupShell title="Step 1: Your Monster" subtitle="Choose your fighter!" stepLabel="1 OF 3" onBack={onBack}>
        {roster.error && (
          <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg border border-lightning/40 bg-lightning/10 text-[0.7rem] text-lightning">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{roster.error}</span>
          </div>
        )}
        {stillLoading ? (
          <div className="kq-summon">
            <div className="kq-summon-ring" />
            <p className="font-orbitron text-sm text-primary">Summoning monsters…</p>
          </div>
        ) : unlockedMonsters.length === 0 ? (
          <div className="kq-summon">
            <span className="text-5xl" aria-hidden="true">🥚</span>
            <p className="font-orbitron text-sm text-foreground">No monsters yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Win a battle or a race prediction to add a kaiju to your roster.
            </p>
          </div>
        ) : (
          <MonsterGrid monsters={unlockedMonsters} onPick={handlePlayerSelect} />
        )}
      </SetupShell>
    );
  }

  // ── Step 2: Opponent ─────────────────────────────────────────────────
  if (step === 'opponent' && selectedPlayer) {
    return (
      <SetupShell title="Step 2: Your Opponent" subtitle="Who will you fight?" stepLabel="2 OF 3" onBack={handleBackStep}>
        {/* Selected player preview */}
        <div className="flex items-center gap-3 p-2.5 mb-5 rounded-xl bg-primary/10 border border-primary/30">
          <MonsterSprite monster={selectedPlayer} size="sm" state="idle" side="left" shadow={false} />
          <div className="min-w-0">
            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">Your Monster</p>
            <p className="font-orbitron font-bold text-primary truncate">{selectedPlayer.name}</p>
            <p className="text-xs text-muted-foreground truncate">{selectedPlayer.title}</p>
          </div>
        </div>

        {opponentMode === null && (
          <div className="space-y-3">
            <button type="button" onClick={handleRandomOpponent} className="kq-mode-btn" data-accent="atomic">
              <span className="kq-mode-emoji" aria-hidden="true">🎲</span>
              <span className="flex-1 min-w-0">
                <span className="block text-base">Random 🎲</span>
                <span className="block font-rajdhani font-medium text-xs tracking-normal text-muted-foreground">
                  Let fate decide who you face!
                </span>
              </span>
              <Shuffle className="w-5 h-5 text-primary shrink-0" />
            </button>

            <button type="button" onClick={() => setOpponentMode('choose')} className="kq-mode-btn" data-accent="lightning">
              <span className="kq-mode-emoji" aria-hidden="true">🎯</span>
              <span className="flex-1 min-w-0">
                <span className="block text-base">Choose 🎯</span>
                <span className="block font-rajdhani font-medium text-xs tracking-normal text-muted-foreground">
                  Pick the monster you want to battle!
                </span>
              </span>
              <Target className="w-5 h-5 text-lightning shrink-0" />
            </button>
          </div>
        )}

        {opponentMode === 'choose' && (
          <div>
            <p className="text-sm text-center text-muted-foreground mb-3">Tap a monster to select them as your opponent</p>
            <MonsterGrid monsters={availableOpponents} onPick={handleOpponentSelect} />
          </div>
        )}
      </SetupShell>
    );
  }

  // ── Step 3: Confirm matchup ──────────────────────────────────────────
  if (step === 'confirm' && selectedPlayer && selectedOpponent) {
    const playerPower = Object.values(selectedPlayer.stats).reduce((a, b) => a + b, 0);
    const opponentPower = Object.values(selectedOpponent.stats).reduce((a, b) => a + b, 0);

    return (
      <SetupShell title="Step 3: Confirm Battle" subtitle="Ready to rumble?" stepLabel="3 OF 3" onBack={handleBackStep}>
        <div className="flex-1 flex flex-col items-center w-full">
          {/* Face-off */}
          <div className="relative w-full max-w-xl kq-stage rounded-2xl border border-border px-2 py-4 mb-5">
            <div className="relative z-10 flex items-end justify-between gap-1">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <MonsterSprite monster={selectedPlayer} size="lg" state="enter" side="left" shadow />
                <h3 className="font-orbitron font-bold text-primary mt-2 text-sm text-center truncate max-w-full px-1">
                  {selectedPlayer.name}
                </h3>
                <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">Your Monster</p>
              </div>

              <div className="flex flex-col items-center justify-center pb-10 shrink-0">
                <span className="kq-vs">VS</span>
              </div>

              <div className="flex flex-col items-center flex-1 min-w-0">
                <MonsterSprite monster={selectedOpponent} size="lg" state="enter" side="right" shadow />
                <h3 className="font-orbitron font-bold text-destructive mt-2 text-sm text-center truncate max-w-full px-1">
                  {selectedOpponent.name}
                </h3>
                <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                  {opponentMode === 'random' ? '🎲 Random' : '🎯 Chosen'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick stat comparison */}
          <div className="w-full max-w-xl p-4 kq-panel mb-6">
            <h4 className="kq-section-title text-center mb-3">Quick Stats</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[0.62rem] uppercase tracking-widest text-muted-foreground">Total Power</span>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="font-orbitron font-bold text-primary">{playerPower}</span>
                  <span className="text-muted-foreground text-xs">vs</span>
                  <span className="font-orbitron font-bold text-destructive">{opponentPower}</span>
                </div>
              </div>
              <div>
                <span className="text-[0.62rem] uppercase tracking-widest text-muted-foreground">Rarity</span>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="text-xs capitalize text-primary">{selectedPlayer.rarity}</span>
                  <span className="text-muted-foreground text-xs">vs</span>
                  <span className="text-xs capitalize text-destructive">{selectedOpponent.rarity}</span>
                </div>
              </div>
              <div>
                <span className="text-[0.62rem] uppercase tracking-widest text-muted-foreground">Era</span>
                <div className="flex flex-col items-center mt-1 text-[0.7rem] leading-tight">
                  <span className="text-primary">{selectedPlayer.era}</span>
                  <span className="text-destructive">{selectedOpponent.era}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full max-w-xl flex gap-3 mt-auto pt-2">
            <button
              type="button"
              onClick={handleBackStep}
              className="kq-tap flex-1 px-4 py-4 rounded-xl font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              Change Opponent
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="kq-tap flex-1 px-4 py-4 rounded-xl font-orbitron font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform glow-atomic flex items-center justify-center gap-2"
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </SetupShell>
    );
  }

  return null;
}
