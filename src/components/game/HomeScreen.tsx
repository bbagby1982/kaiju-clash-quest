import { ReactNode, useCallback, useMemo, useState } from 'react';
import { GameProgress, GameTab, Monster } from '@/types/game';
import { useRoster } from '@/lib/roster';
import { MonsterSprite } from './MonsterSprite';
import { AlertTriangle, Dices } from 'lucide-react';

interface HomeScreenProps {
  progress: GameProgress;
  /** Jump to another tab (the big mode buttons). */
  onNavigate: (tab: GameTab) => void;
  /** Rendered where the daily challenge belongs — Index owns the card + its props. */
  challengeSlot?: ReactNode;
  /** Rendered where cloud save belongs — Index owns the panel + its props. */
  cloudSlot?: ReactNode;
}

interface ModeButton {
  tab: GameTab;
  emoji: string;
  label: string;
  blurb: string;
  accent: 'atomic' | 'lightning' | 'electric' | 'violet';
}

const MODES: ModeButton[] = [
  { tab: 'battle', emoji: '⚔️', label: 'BATTLE', blurb: 'Pick a fighter and clash', accent: 'atomic' },
  { tab: 'race', emoji: '🏁', label: 'RACE', blurb: 'Predict who crosses first', accent: 'lightning' },
  { tab: 'monsters', emoji: '🦖', label: 'MY MONSTERS', blurb: 'Your roster and stats', accent: 'electric' },
  { tab: 'encyclopedia', emoji: '📖', label: 'ENCYCLOPEDIA', blurb: 'Every kaiju, every fact', accent: 'violet' },
];

/** Fixed set of drifting background motes — positions are stable for the session. */
function useMotes(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.round(Math.random() * 96)}%`,
        size: `${3 + Math.round(Math.random() * 5)}px`,
        dur: `${7 + Math.random() * 9}s`,
        delay: `${-Math.random() * 12}s`,
        sway: `${Math.round(Math.random() * 70 - 35)}px`,
      })),
    [count],
  );
}

export function HomeScreen({ progress, onNavigate, challengeSlot, cloudSlot }: HomeScreenProps) {
  const roster = useRoster();
  const motes = useMotes(16);
  const [reroll, setReroll] = useState(0);

  // The star of the title screen: a random monster Alfred has actually unlocked.
  const featured: Monster | null = useMemo(() => {
    const owned = roster.unlocked(progress.unlockedMonsters);
    const pool = owned.length > 0 ? owned : roster.playable;
    if (pool.length === 0) return null;
    // `reroll` re-picks on tap; the modulo keeps the pick stable between renders.
    const idx = (Math.floor(Math.random() * pool.length) + reroll) % pool.length;
    return pool[idx];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster.playable, progress.unlockedMonsters, reroll]);

  const rerollFeatured = useCallback(() => setReroll((n) => n + 1), []);

  const funFact = featured?.funFacts?.[0];
  const raceRecord = `${progress.racesWon}-${progress.racesLost}`;
  const summoning = !roster.ready && roster.playable.length === 0;

  return (
    <div className="kq-screen-in">
      {/* ══ Title stage ══════════════════════════════════════════════════ */}
      <section className="kq-stage relative px-4 pt-6 pb-8">
        {/* Drifting particles */}
        <div className="kq-motes" aria-hidden="true">
          {motes.map((m) => (
            <span
              key={m.id}
              className="kq-mote"
              style={
                {
                  left: m.left,
                  '--size': m.size,
                  '--dur': m.dur,
                  '--delay': m.delay,
                  '--sway': m.sway,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          {/* Logotype — the game's name, word for word */}
          <div className="kq-logo-wrap inline-block px-2">
            <h2 className="kq-logo text-[2rem] sm:text-5xl">
              KAIJU <span className="kq-logo-alt">CLASH</span>
              <br className="sm:hidden" /> QUEST
            </h2>
          </div>
          <p className="kq-byline text-[0.62rem] sm:text-xs mt-2">by Alfred</p>

          {/* Featured monster on a glowing platform */}
          <div className="mt-5 flex flex-col items-center">
            {summoning ? (
              <div className="kq-summon">
                <div className="kq-summon-ring" />
                <p className="font-orbitron text-sm text-primary">Summoning monsters…</p>
                <p className="text-xs text-muted-foreground">Waking up the roster</p>
              </div>
            ) : featured ? (
              <>
                <div className="relative flex items-end justify-center min-h-[14rem] sm:min-h-[19rem]">
                  <div className="kq-platform bottom-1" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={rerollFeatured}
                    className="relative kq-tap"
                    aria-label={`Show a different monster (currently ${featured.name})`}
                  >
                    <MonsterSprite monster={featured} size="xl" state="idle" side="left" shadow />
                  </button>
                </div>

                <div className="mt-3 space-y-1 px-2">
                  <h3 className="font-orbitron font-black text-xl sm:text-2xl text-foreground text-title-glow">
                    {featured.name}
                  </h3>
                  <p className="text-sm text-primary font-semibold">{featured.title}</p>
                  <p className="text-[0.7rem] text-muted-foreground">{featured.era}</p>
                  {funFact && (
                    <p className="text-xs text-lightning/90 max-w-sm mx-auto pt-1.5">
                      💡 {funFact}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={rerollFeatured}
                    className="kq-tap inline-flex items-center gap-1.5 mt-2 px-3 py-2 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/60 transition-colors"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    Another monster
                  </button>
                </div>
              </>
            ) : (
              <div className="kq-summon">
                <span className="text-5xl" aria-hidden="true">🥚</span>
                <p className="font-orbitron text-sm text-foreground">No monster art yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Upload art in the admin page and your kaiju will appear right here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="px-4 pb-4 kq-screen-pad max-w-2xl mx-auto space-y-5">
        {/* Non-blocking roster notice */}
        {roster.error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-lightning/40 bg-lightning/10 text-[0.7rem] text-lightning">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{roster.error}</span>
          </div>
        )}

        {/* ══ Mode buttons ═══════════════════════════════════════════════ */}
        <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Game modes">
          {MODES.map((mode, i) => (
            <button
              key={mode.tab}
              type="button"
              onClick={() => onNavigate(mode.tab)}
              className="kq-mode-btn kq-stagger"
              data-accent={mode.accent}
              style={{ '--i': i } as React.CSSProperties}
            >
              <span className="kq-mode-emoji" aria-hidden="true">{mode.emoji}</span>
              <span className="min-w-0">
                <span className="block text-base leading-tight">{mode.label}</span>
                <span className="block font-rajdhani font-medium text-xs tracking-normal text-muted-foreground">
                  {mode.blurb}
                </span>
              </span>
            </button>
          ))}
        </nav>

        {/* ══ Daily challenge ════════════════════════════════════════════ */}
        {challengeSlot && <div>{challengeSlot}</div>}

        {/* ══ Player record ══════════════════════════════════════════════ */}
        <section>
          <h3 className="kq-section-title mb-2">Your Record</h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="kq-chip">
              <span className="kq-chip-value text-lightning">{progress.playerLevel}</span>
              <span className="kq-chip-label">Level</span>
            </div>
            <div className="kq-chip">
              <span className="kq-chip-value text-primary">{progress.wins}</span>
              <span className="kq-chip-label">Wins</span>
            </div>
            <div className="kq-chip">
              <span className="kq-chip-value text-destructive">{progress.losses}</span>
              <span className="kq-chip-label">Losses</span>
            </div>
            <div className="kq-chip">
              <span className="kq-chip-value text-electric">{raceRecord}</span>
              <span className="kq-chip-label">Races</span>
            </div>
          </div>
          <p className="text-center text-[0.7rem] text-muted-foreground mt-2">
            {progress.unlockedMonsters.length} / {roster.playable.length} monsters unlocked
          </p>
        </section>

        {/* ══ Cloud save ═════════════════════════════════════════════════ */}
        {cloudSlot && <div>{cloudSlot}</div>}
      </div>
    </div>
  );
}
