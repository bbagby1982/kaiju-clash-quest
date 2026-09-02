/**
 * BattleSimulation — the BATTLE ARENA.
 *
 * A full-screen, side-view kaiju fight: layered backdrop, two sprites standing on
 * the ground line, a HUD of health bars, a comic caption bar and a four-command
 * touch menu. It plays like a small video game, not a text box with buttons.
 *
 * Who decides what:
 *  - src/lib/battleEngine.ts decides the FIGHT. `resolveRound` returns the beats
 *    (who moved, what they did, how much it hurt) and this file only ANIMATES them.
 *    No network call can change a number here.
 *  - netlify/functions/battle.mts writes flavour text. It is fired in parallel and
 *    is allowed to be slow or missing: the local `beat.text` caption is on screen
 *    immediately, and the AI line only ever replaces it if it lands while that same
 *    moment is still the current one (see `narrationToken`).
 *
 * How the animation runs: ONE sequencer. Every phase builds an array of `Step`s
 * ({ how long, what to do }) and hands it to `play()`. `play` walks the array with
 * `setTimeout`s that all live in `timers` and are cleared on unmount and on every
 * new sequence, so nothing can fire into a dead component. A "Skip" tap flushes the
 * remaining steps, running only the ones marked `essential` (HP commits, caption,
 * sprite reset) — the state machine always lands where it would have landed.
 */
import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Monster, GameMap, Booster } from '@/types/game';
import { BattleResults } from './BattleResults';
import { MonsterSprite, SpriteState } from './MonsterSprite';
import { ArenaBackdrop } from './arena/ArenaBackdrop';
import { BattleFXLayer, FXItem, FXSpec, fxColor, fxShapeForAbility } from './arena/BattleFX';
import { HPBar } from './arena/HPBar';
import { preloadRoar, roar, speak, useVoice } from '@/lib/voice';
import {
  Beat,
  CHOICES,
  Choice,
  MAX_HP,
  MAX_ROUNDS,
  RoundResult,
  TRAIT_INFO,
  Trait,
  choiceDescriptions,
  hasTerrainBonus,
  resolveRound,
  traitForFocus,
} from '@/lib/battleEngine';
import '@/styles/arena.css';

type BattleFocus = 'speed' | 'strength' | 'defense' | 'specialAttack' | 'fireVsIce' | 'focusVsDistraction' | 'allOut' | 'random';
type Phase = 'boot' | 'intro' | 'menu' | 'playing' | 'finale' | 'results';

interface BattleSimulationProps {
  playerMonster: Monster;
  opponentMonster: Monster;
  battleFocus: BattleFocus;
  map: GameMap;
  booster?: Booster | null;
  onBattleEnd: (won: boolean, opponentId: string, trait: string) => void;
}

/** One tick of the sequencer. `essential` steps also run when the kid taps Skip. */
interface Step {
  ms: number;
  run: () => void;
  essential?: boolean;
}

const COMMAND_COLOR: Record<Choice, string> = {
  attack: '#ef4444',
  special: '#eab308',
  defend: '#22c55e',
  terrain: '#3b82f6',
};

const TERRAIN_ICON: Record<GameMap['terrain'], string> = {
  city: '🏙️',
  island: '🏝️',
  ocean: '🌊',
  volcano: '🌋',
  ruins: '🏛️',
};

const clampHP = (n: number) => Math.max(0, Math.min(MAX_HP, n));

/** Waits on `p`, but never longer than `ms` — a stuck voice clip must never delay the round. */
function withHardCap(p: Promise<void>, ms: number): Promise<void> {
  return Promise.race([p, new Promise<void>((resolve) => { window.setTimeout(resolve, ms); })]);
}

/* ── Victory quotes — one line the winning fighter "speaks" at the finale.
   Player wins voice as 'godzilla', opponent wins voice as 'godzilla2' (src/lib/voice.ts). ── */
const PLAYER_WIN_LINES = [
  'The King has spoken!',
  'Bow before the true king of the monsters!',
  'Victory tastes like atomic fire!',
  'No titan can stand against me!',
  'This city — and this crown — are mine!',
  'You call that a fight? That was a warm-up!',
  'Legends are made on days like this!',
  'Let every kaiju hear my roar tonight!',
];
const OPPONENT_WIN_LINES = [
  'Every battle makes me stronger!',
  'You never stood a chance against me!',
  'The throne is mine now!',
  'Is that really your best, challenger?',
  'Rest up — you will need it next time!',
  'This ground is mine to claim!',
  'Another titan falls before me!',
  "That's how a real champion fights!",
];
const pickLine = (lines: string[]): string => lines[Math.floor(Math.random() * lines.length)];

/* ── Local captions (used immediately, and kept when the narrator is offline) ── */

function localIntro(p: Monster, o: Monster, map: GameMap) {
  return `The ground shakes as ${p.name} faces ${o.name} in the ${map.name}! Two titans lock eyes — only one will walk away victorious. ROOOAAR!`;
}

function localFinale(p: Monster, o: Monster, map: GameMap, winner: RoundResult['winner']) {
  if (winner === 'player') {
    return `${p.name} stands victorious! A triumphant ROAR echoes across the ${map.name}! The King has spoken!`;
  }
  if (winner === 'opponent') {
    return `${o.name} lands the final blow! ${p.name} falls — but every defeat makes a titan stronger!`;
  }
  return `Both titans are still standing as the dust settles over the ${map.name} — a perfectly matched fight!`;
}

export function BattleSimulation({ playerMonster, opponentMonster, battleFocus, map, booster, onBattleEnd }: BattleSimulationProps) {
  const [trait] = useState<Trait>(() => traitForFocus(battleFocus));
  const traitInfo = TRAIT_INFO[trait];

  const [phase, setPhase] = useState<Phase>('boot');
  const [round, setRound] = useState(1);
  const [playerHP, setPlayerHP] = useState(MAX_HP);
  const [opponentHP, setOpponentHP] = useState(MAX_HP);
  const [playerState, setPlayerState] = useState<SpriteState>('none');
  const [opponentState, setOpponentState] = useState<SpriteState>('none');
  const [caption, setCaption] = useState(() => localIntro(playerMonster, opponentMonster, map));
  const [captionFromAI, setCaptionFromAI] = useState(false);
  const [fx, setFx] = useState<FXItem[]>([]);
  const [shake, setShake] = useState('');
  const [showVs, setShowVs] = useState(false);
  const [winner, setWinner] = useState<RoundResult['winner']>(null);

  const mounted = useRef(true);
  const timers = useRef<number[]>([]);
  const seq = useRef<{ steps: Step[]; i: number; done: () => void } | null>(null);
  const hp = useRef({ player: MAX_HP, opponent: MAX_HP });
  const fxId = useRef(0);
  const suppressVisuals = useRef(false);
  const history = useRef<string[]>([]);
  const phaseRef = useRef<Phase>('boot');
  const startedRef = useRef(false);
  const spritesReady = useRef(0);
  const roundRef = useRef(1);

  // Narrator plumbing — a token per "current moment" so a late answer is dropped.
  const narrationToken = useRef(0);
  const narrationAbort = useRef<AbortController | null>(null);
  const narratorOff = useRef(false);
  const narratorFailures = useRef(0);
  // A round's AI caption that arrived mid-round: applying it immediately would just
  // get stamped over by the next beat's local caption, so it waits here until the
  // round's beat sequence is done — see the play() done callback in handleChoice.
  const pendingRoundAI = useRef<{ token: number; text: string } | null>(null);

  // Voice plumbing. One AbortController for the arena's whole lifetime (aborted on
  // unmount) and one "already spoken" token so an AI caption that arrives late never
  // gets read out twice (once as the local fallback, once as the AI line).
  const voice = useVoice();
  const voiceAbort = useRef<AbortController | null>(null);
  const vsignal = useCallback((): AbortSignal | undefined => voiceAbort.current?.signal, []);
  const voiceSpokenForToken = useRef(-1);
  const captionRef = useRef('');
  /** Speaks `text` once per token; resolves when it's done (or immediately if skipped). */
  const narrateOnce = useCallback((token: number, text: string): Promise<void> => {
    if (!text || voiceSpokenForToken.current === token) return Promise.resolve();
    voiceSpokenForToken.current = token;
    return speak(text, 'narrator', { signal: vsignal() });
  }, [vsignal]);

  const reduced = useRef(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  const playerOwnsMap = useMemo(() => hasTerrainBonus(playerMonster, map), [playerMonster, map]);
  const opponentOwnsMap = useMemo(() => hasTerrainBonus(opponentMonster, map), [opponentMonster, map]);
  const descriptions = useMemo(() => choiceDescriptions(playerMonster, map), [playerMonster, map]);

  const setPhaseTracked = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  /* ── timers ─────────────────────────────────────────────────────────── */
  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      if (mounted.current) fn();
    }, ms);
    timers.current.push(id);
    return id;
  }, []);

  /* ── visual helpers ─────────────────────────────────────────────────── */
  const pushFX = useCallback((...specs: FXSpec[]) => {
    if (suppressVisuals.current || !specs.length) return;
    setFx((prev) => {
      const next = prev.concat(specs.map((s) => ({ ...s, id: ++fxId.current } as FXItem)));
      return next.length > 16 ? next.slice(next.length - 16) : next;
    });
  }, []);

  const triggerShake = useCallback((hard: boolean) => {
    if (suppressVisuals.current || reduced.current) return;
    setShake('');
    later(() => setShake(hard ? 'arena-shake-hard' : 'arena-shake'), 16);
  }, [later]);

  const showCaption = useCallback((text: string, fromAI = false) => {
    captionRef.current = text;
    setCaption(text);
    setCaptionFromAI(fromAI);
  }, []);

  const commitHP = useCallback((p: number, o: number) => {
    hp.current = { player: clampHP(p), opponent: clampHP(o) };
    setPlayerHP(hp.current.player);
    setOpponentHP(hp.current.opponent);
  }, []);

  /* ── the sequencer ──────────────────────────────────────────────────── */
  const advance = useCallback(() => {
    const s = seq.current;
    if (!s) return;
    if (s.i >= s.steps.length) {
      seq.current = null;
      s.done();
      return;
    }
    const step = s.steps[s.i++];
    step.run();
    const ms = reduced.current ? Math.min(step.ms, 90) : step.ms;
    later(advance, ms);
  }, [later]);

  const play = useCallback((steps: Step[], done: () => void) => {
    clearTimers();
    seq.current = { steps, i: 0, done };
    advance();
  }, [advance, clearTimers]);

  /** Kid taps the caption bar: run the rest of the sequence instantly, state intact. */
  const skip = useCallback(() => {
    const s = seq.current;
    if (!s) return;
    clearTimers();
    seq.current = null;
    suppressVisuals.current = true;
    try {
      while (s.i < s.steps.length) {
        const step = s.steps[s.i++];
        if (step.essential) step.run();
      }
    } finally {
      suppressVisuals.current = false;
    }
    s.done();
  }, [clearTimers]);

  /* ── narrator ───────────────────────────────────────────────────────── */
  const requestNarration = useCallback((
    narrationPhase: 'intro' | 'round' | 'finale',
    payload: { round?: number; beats?: Beat[]; playerHP?: number; opponentHP?: number; winner?: RoundResult['winner'] } = {},
  ): number => {
    const token = ++narrationToken.current;
    if (narratorOff.current) return token;
    narrationAbort.current?.abort();
    const ctrl = new AbortController();
    narrationAbort.current = ctrl;
    const bail = window.setTimeout(() => ctrl.abort(), 6000);

    const fighter = (m: Monster) => ({
      name: m.name, title: m.title, era: m.era, stats: m.stats,
      specialAbility: m.specialAbility, terrainBonus: m.terrainBonus,
      strengths: m.strengths, weaknesses: m.weaknesses,
    });

    fetch('/api/battle', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: narrationPhase,
        player: fighter(playerMonster),
        opponent: fighter(opponentMonster),
        map: { name: map.name, terrain: map.terrain, description: map.description },
        focus: battleFocus,
        booster: booster ? { name: booster.name, description: booster.description, effect: booster.effect, power: booster.power } : null,
        round: payload.round ?? 0,
        beats: payload.beats ?? [],
        playerHP: payload.playerHP ?? hp.current.player,
        opponentHP: payload.opponentHP ?? hp.current.opponent,
        winner: payload.winner ?? null,
        history: history.current.slice(-3),
      }),
    })
      .then((res) => {
        if (res.status === 503) {
          narratorOff.current = true;
          throw new Error('narrator-unconfigured');
        }
        if (!res.ok) throw new Error(`narrator-${res.status}`);
        return res.json();
      })
      .then((data: { narration?: unknown }) => {
        narratorFailures.current = 0;
        if (!mounted.current) return;
        // A newer moment has already started, or the fight is over: drop it.
        if (token !== narrationToken.current) return;
        if (phaseRef.current === 'results') return;
        const text = typeof data?.narration === 'string' ? data.narration.trim() : '';
        if (text) {
          if (narrationPhase === 'round') {
            // Don't show it yet — the beat still playing would call showCaption(beat.text)
            // right after this and stamp over it before anyone reads it. It's applied
            // (and spoken) once the round's beat sequence finishes, in handleChoice.
            pendingRoundAI.current = { token, text };
          } else {
            showCaption(text, true);
            // Finale narration doesn't get a narrator voice line — only the announcer
            // stamp and the winner's own victory quote, wired in startFinale.
            if (narrationPhase !== 'finale') narrateOnce(token, text);
          }
        }
      })
      .catch((err: unknown) => {
        // The arena's OWN aborts — a newer requestNarration superseding this one, or
        // the 6s bail below — reject with AbortError. That's not the narrator failing
        // and must never count toward narratorOff's 3-strikes limit.
        if (ctrl.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
        narratorFailures.current += 1;
        if (narratorFailures.current >= 3) narratorOff.current = true;
      })
      .finally(() => clearTimeout(bail));
    return token;
  }, [playerMonster, opponentMonster, map, battleFocus, booster, showCaption, narrateOnce]);

  /* ── beat → animation steps ─────────────────────────────────────────── */
  const buildBeatSteps = useCallback((beat: Beat, after: { player: number; opponent: number }, previousBeat: Beat | null): Step[] => {
    const actorMonster = beat.actor === 'player' ? playerMonster : opponentMonster;
    const setActor = beat.actor === 'player' ? setPlayerState : setOpponentState;
    const setTarget = beat.target === 'player' ? setPlayerState : setOpponentState;
    const idleBoth = () => { setPlayerState('idle'); setOpponentState('idle'); };
    const commit = () => commitHP(after.player, after.opponent);
    const steps: Step[] = [];

    // ── defend: guard bubble, then the counter-blow (if the engine gave one)
    if (beat.action === 'defend') {
      steps.push({
        ms: 520,
        essential: true,
        run: () => { setFx([]); showCaption(beat.text); setActor('defend'); setTarget('idle'); },
      });
      if (beat.counter > 0) {
        steps.push({
          ms: 460,
          essential: true,
          run: () => {
            setTarget('hit');
            pushFX(
              { kind: 'impact', at: beat.target, color: '#9ae6ff' },
              { kind: 'damage', at: beat.target, value: beat.counter, label: 'COUNTER' },
            );
            triggerShake(false);
            commit();
          },
        });
      } else {
        steps.push({ ms: 320, run: () => undefined });
      }
      steps.push({ ms: 340, essential: true, run: () => { idleBoth(); commit(); } });
      return steps;
    }

    const isSpecial = beat.action === 'special';
    const shape = isSpecial ? fxShapeForAbility(beat.abilityType) : 'melee';
    const beamColor = fxColor(actorMonster, beat.abilityType);
    const impactColor = beat.crit ? '#ffd600' : beat.terrainBoost ? map.accentColor : '#ffb300';

    // ── wind-up (specials charge first, so the kid sees the ability coming)
    // If the target just braced in the beat right before this one (the round's other
    // fighter defended, then immediately swings back), keep its guard up through the
    // attacker's wind-up instead of snapping back to idle first.
    const targetHeldGuard = previousBeat?.action === 'defend' && previousBeat.actor === beat.target;
    steps.push({
      ms: isSpecial ? 520 : 240,
      essential: true,
      run: () => {
        setFx([]);
        showCaption(beat.text);
        setActor(isSpecial ? 'charge' : 'attack');
        setTarget(targetHeldGuard ? 'defend' : 'idle');
      },
    });

    // ── release: the ability actually leaves the attacker
    if (isSpecial) {
      // Matches each shape's own CSS travel time (fx-projectile/-beam/-impact in index.css)
      // so the contact FX lands right as the effect visually reaches the target.
      const releaseMs = shape === 'projectile' ? 600 : shape === 'shockwave' ? 280 : 220;
      steps.push({
        ms: releaseMs,
        run: () => {
          setActor('special');
          void roar(actorMonster, { signal: vsignal() });
          if (shape === 'beam') pushFX({ kind: 'beam', from: beat.actor, color: beamColor }, { kind: 'flash', color: `${beamColor}44` });
          else if (shape === 'projectile') pushFX({ kind: 'projectile', from: beat.actor, color: beamColor });
          else if (shape === 'shockwave') pushFX({ kind: 'shockwave', at: beat.actor, color: beamColor });
          else pushFX({ kind: 'impact', at: beat.actor, color: beamColor });
        },
      });
    } else if (beat.action === 'terrain' && beat.terrainBoost) {
      steps.push({
        ms: 260,
        run: () => pushFX({ kind: 'shockwave', at: beat.actor, color: map.accentColor }),
      });
    }

    // ── contact
    steps.push({
      ms: isSpecial ? 380 : 360,
      essential: true,
      run: () => {
        if (beat.missed) {
          pushFX({ kind: 'stamp', text: 'MISS!', color: '#9ca3af' });
        } else {
          setTarget('hit');
          pushFX(
            { kind: 'impact', at: beat.target, color: impactColor, big: beat.crit || isSpecial },
            { kind: 'damage', at: beat.target, value: beat.damage, crit: beat.crit },
          );
          if (beat.crit) pushFX({ kind: 'stamp', text: 'CRITICAL!', color: '#ffd600' }, { kind: 'flash', color: '#ffffff55' });
          else if (beat.blocked) pushFX({ kind: 'stamp', text: 'BLOCKED!', color: '#60a5fa' });
          triggerShake(beat.crit || (isSpecial && !beat.blocked));
        }
        commit();
      },
    });

    steps.push({ ms: isSpecial ? 400 : 420, essential: true, run: () => { idleBoth(); commit(); } });
    steps.push({ ms: isSpecial ? 200 : 280, run: () => undefined });
    return steps;
  }, [playerMonster, opponentMonster, map, commitHP, pushFX, showCaption, triggerShake, vsignal]);

  /* ── phases ─────────────────────────────────────────────────────────── */
  const startFinale = useCallback((result: RoundResult) => {
    setPhaseTracked('finale');
    const koed = result.playerHP <= 0 || result.opponentHP <= 0;
    const stampText = koed ? 'K.O.!' : "TIME'S UP";
    const stampColor = koed ? '#ff3d00' : '#eab308';

    requestNarration('finale', {
      round: result.round,
      beats: result.beats,
      playerHP: result.playerHP,
      opponentHP: result.opponentHP,
      winner: result.winner,
    });

    play([
      {
        ms: 300,
        essential: true,
        run: () => {
          showCaption(localFinale(playerMonster, opponentMonster, map, result.winner));
          if (result.winner === 'player') { setOpponentState('ko'); setPlayerState('victory'); }
          else if (result.winner === 'opponent') { setPlayerState('ko'); setOpponentState('victory'); }
          else { setPlayerState('idle'); setOpponentState('idle'); }
        },
      },
      {
        ms: 1200,
        run: () => {
          pushFX({ kind: 'stamp', text: stampText, color: stampColor }, { kind: 'flash', color: '#ffffff44' });
          triggerShake(true);
          // The announcer calls it, THEN the winner gets to talk — both go through the
          // one shared speech element (speak() interrupts by default), so they're
          // chained instead of fired together or they'd cut each other off.
          void (async () => {
            await speak(stampText, 'announcer', { signal: vsignal() });
            if (result.winner === 'player') await speak(pickLine(PLAYER_WIN_LINES), 'godzilla', { signal: vsignal() });
            else if (result.winner === 'opponent') await speak(pickLine(OPPONENT_WIN_LINES), 'godzilla2', { signal: vsignal() });
          })();
        },
      },
      { ms: 1300, run: () => undefined },
    ], () => {
      setWinner(result.winner ?? 'tie');
      setPhaseTracked('results');
    });
  }, [map, opponentMonster, play, playerMonster, pushFX, requestNarration, setPhaseTracked, showCaption, triggerShake, vsignal]);

  const beginRound = useCallback((n: number) => {
    roundRef.current = n;
    setRound(n);
    setPhaseTracked('playing');
    play([
      {
        ms: 850,
        run: () => {
          pushFX({ kind: 'stamp', text: `ROUND ${n}`, color: '#7fff00' });
          void speak(`ROUND ${n}`, 'announcer', { signal: vsignal() });
        },
      },
    ], () => setPhaseTracked('menu'));
  }, [play, pushFX, setPhaseTracked, vsignal]);

  const handleChoice = useCallback((choice: Choice) => {
    if (phaseRef.current !== 'menu') return;
    setPhaseTracked('playing');
    setFx([]);

    const result = resolveRound({
      player: playerMonster,
      opponent: opponentMonster,
      playerChoice: choice,
      trait,
      map,
      booster,
      round: roundRef.current,
      playerHP: hp.current.player,
      opponentHP: hp.current.opponent,
    });

    const roundVoiceToken = requestNarration('round', {
      round: result.round,
      beats: result.beats,
      playerHP: result.playerHP,
      opponentHP: result.opponentHP,
    });

    // Replay the engine's own arithmetic so each beat commits the HP it caused.
    let p = hp.current.player;
    let o = hp.current.opponent;
    const steps: Step[] = [];
    let previousBeat: Beat | null = null;
    for (const beat of result.beats) {
      if (beat.actor === 'player') { o = clampHP(o - beat.damage); p = clampHP(p - beat.counter); }
      else { p = clampHP(p - beat.damage); o = clampHP(o - beat.counter); }
      steps.push(...buildBeatSteps(beat, { player: p, opponent: o }, previousBeat));
      previousBeat = beat;
    }
    // Belt and braces: whatever the playback did, the engine's numbers are the truth.
    steps.push({
      ms: 140,
      essential: true,
      run: () => { commitHP(result.playerHP, result.opponentHP); setPlayerState('idle'); setOpponentState('idle'); },
    });

    history.current = history.current.concat(result.beats.map((b) => b.text));

    play(steps, () => {
      // Playback for this round is over. If AI narration for THIS round arrived while
      // a beat was still playing, it was buffered instead of shown immediately (that
      // would have been stamped over by the next beat's local caption) — apply it now
      // as the round's final caption. Otherwise fall back to whatever local caption is
      // on screen. Either way, the spoken line matches what's now on screen.
      const buffered = pendingRoundAI.current;
      const useBuffered = !!buffered && buffered.token === roundVoiceToken;
      const finalCaption = useBuffered ? buffered!.text : captionRef.current;
      if (useBuffered) {
        showCaption(finalCaption, true);
        pendingRoundAI.current = null;
      }
      void (async () => {
        // Sequence this caption's speech before the next round's "ROUND n" announcer
        // stamp — both go through the same interrupting speech element (see
        // voice.ts's speak()), so firing them together lets whichever lands second
        // cut the other off mid-word. Capped so a stuck clip never delays the round.
        await withHardCap(narrateOnce(roundVoiceToken, finalCaption), 4000);
        if (result.over) startFinale(result);
        else beginRound(result.round + 1);
      })();
    });
  }, [beginRound, booster, buildBeatSteps, commitHP, map, narrateOnce, opponentMonster, play, playerMonster, requestNarration, setPhaseTracked, showCaption, startFinale, trait]);

  const startIntro = useCallback(() => {
    setPhaseTracked('intro');
    showCaption(localIntro(playerMonster, opponentMonster, map));
    // Both roars are pre-fetched now so the special-attack roar() later in the fight
    // plays instantly instead of waiting on the network the first time it's needed.
    preloadRoar(playerMonster);
    preloadRoar(opponentMonster);
    const introVoiceToken = requestNarration('intro');
    play([
      { ms: 750, run: () => { setPlayerState('enter'); setOpponentState('enter'); setShowVs(true); } },
      { ms: 1300, essential: true, run: () => { setPlayerState('idle'); setOpponentState('idle'); } },
      {
        ms: 800,
        essential: true,
        run: () => {
          setShowVs(false);
          pushFX({ kind: 'stamp', text: 'FIGHT!', color: '#ffd600' });
          void speak('FIGHT!', 'announcer', { signal: vsignal() });
        },
      },
    ], () => {
      // Same "AI if it arrived in time, else the local one — never both" rule as a
      // round, and the same sequencing: let the intro's line finish (or hit the 4s
      // cap) before ROUND 1's announcer stamp tries to speak over it.
      void (async () => {
        await withHardCap(narrateOnce(introVoiceToken, captionRef.current), 4000);
        beginRound(1);
      })();
    });
  }, [beginRound, map, narrateOnce, opponentMonster, play, playerMonster, pushFX, requestNarration, setPhaseTracked, showCaption, vsignal]);

  /* ── boot: give the art a moment to load, then start no matter what ──── */
  const kickoff = useCallback(() => {
    if (startedRef.current || !mounted.current) return;
    startedRef.current = true;
    startIntro();
  }, [startIntro]);

  useEffect(() => {
    mounted.current = true;
    voiceAbort.current = new AbortController();
    const bootTimer = window.setTimeout(() => kickoff(), 1500);
    return () => {
      mounted.current = false;
      clearTimeout(bootTimer);
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
      seq.current = null;
      narrationAbort.current?.abort();
      voiceAbort.current?.abort();
    };
    // Mount-only: the fight owns its own lifecycle from here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSpriteReady = useCallback(() => {
    spritesReady.current += 1;
    if (spritesReady.current >= 2) kickoff();
  }, [kickoff]);

  /* ── render ─────────────────────────────────────────────────────────── */
  const canSkip = phase === 'intro' || phase === 'playing' || phase === 'finale';
  const captionAccent: CSSProperties = {
    ['--caption-accent' as string]: phase === 'finale' ? '#ffd600' : 'hsl(120 100% 45%)',
    ['--caption-glow' as string]: phase === 'finale' ? 'hsl(50 100% 50% / 0.35)' : 'hsl(120 100% 45% / 0.25)',
  };

  return (
    <div className="arena-root">
      <div className={`arena-world ${shake}`} onAnimationEnd={() => setShake('')}>
        <ArenaBackdrop map={map} />

        <div className="arena-stage">
          <div className="arena-fighter arena-fighter--player">
            <MonsterSprite
              monster={playerMonster}
              side="left"
              state={playerState}
              size="lg"
              onReady={onSpriteReady}
            />
          </div>
          <div className="arena-fighter arena-fighter--opponent">
            <MonsterSprite
              monster={opponentMonster}
              side="right"
              state={opponentState}
              size="lg"
              onReady={onSpriteReady}
            />
          </div>

          <BattleFXLayer items={fx} />
        </div>
      </div>

      {/* ── HUD ── (hidden once the results sheet is up — see the arena-results comment below) */}
      {phase !== 'results' && (
      <div className="arena-hud">
        <div className="mx-auto w-full max-w-3xl flex items-start gap-2">
          <HPBar monster={playerMonster} hp={playerHP} side="player" terrainBonus={playerOwnsMap} className="flex-1 min-w-0" />

          <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
            <span className="arena-chip" style={{ color: 'hsl(180 60% 85%)' }}>
              ROUND {round}/{MAX_ROUNDS}
            </span>
            <span className="arena-chip" style={{ color: traitInfo.color }}>{traitInfo.label}</span>
            <button
              type="button"
              className="arena-voice-toggle"
              onClick={voice.toggle}
              disabled={voice.available === false}
              aria-pressed={!voice.muted}
              aria-label={voice.muted ? 'Unmute voices' : 'Mute voices'}
              title={voice.available === false ? 'Voices not set up' : voice.muted ? 'Unmute voices' : 'Mute voices'}
            >
              {voice.muted || voice.available === false ? '🔇' : '🔊'}
            </button>
          </div>

          <HPBar monster={opponentMonster} hp={opponentHP} side="opponent" terrainBonus={opponentOwnsMap} className="flex-1 min-w-0" />
        </div>

        <div className="mx-auto w-full max-w-3xl mt-1 flex justify-center gap-1.5 flex-wrap">
          <span className="arena-chip" style={{ color: 'hsl(220 15% 65%)' }}>
            {TERRAIN_ICON[map.terrain]} {map.name}
          </span>
          {booster && (
            <span className="arena-chip" style={{ color: booster.color }}>
              {booster.icon} {booster.name}
            </span>
          )}
        </div>
      </div>
      )}

      {/* ── VS splash ── */}
      {showVs && (
        <div className="arena-vs">
          <div className="arena-vs-plate arena-vs-plate--left" style={{ ['--plate-color' as string]: 'hsl(120 100% 45%)' }}>
            <div className="arena-vs-name" style={{ color: 'hsl(120 100% 55%)' }}>{playerMonster.name}</div>
            <div className="arena-vs-title">{playerMonster.title}</div>
          </div>
          <div className="arena-vs-mark">VS</div>
          <div className="arena-vs-plate arena-vs-plate--right" style={{ ['--plate-color' as string]: 'hsl(0 85% 55%)' }}>
            <div className="arena-vs-name" style={{ color: 'hsl(0 85% 62%)' }}>{opponentMonster.name}</div>
            <div className="arena-vs-title">{opponentMonster.title}</div>
          </div>
        </div>
      )}

      {/* ── caption + command menu ── (hidden once the results sheet is up: the finale
           stamp has already finished and there is nothing left to skip or choose) */}
      {phase !== 'results' && (
      <div className="arena-bottom">
        <div className="mx-auto w-full max-w-3xl">
          <button
            type="button"
            className="arena-caption"
            style={captionAccent}
            onClick={canSkip ? skip : undefined}
            aria-label={canSkip ? 'Skip to the end of this move' : 'Battle narration'}
          >
            <p className="arena-caption-text">{caption}</p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="arena-caption-ai">{captionFromAI ? '★ narrator' : ''}</span>
              {canSkip && <span className="arena-caption-skip">TAP TO SKIP ▶▶</span>}
            </div>
          </button>

          {phase === 'menu' && (
            <div className="arena-menu mt-2 grid grid-cols-2 gap-2">
              {CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="arena-cmd"
                  style={{
                    ['--cmd-color' as string]: COMMAND_COLOR[c],
                    ['--cmd-glow' as string]: `${COMMAND_COLOR[c]}55`,
                  }}
                  onClick={() => handleChoice(c)}
                >
                  <span className="arena-cmd-head">
                    <span className="arena-cmd-icon">
                      {c === 'attack' ? '⚔️' : c === 'special' ? '✨' : c === 'defend' ? '🛡️' : TERRAIN_ICON[map.terrain]}
                    </span>
                    {c}
                  </span>
                  <span className="arena-cmd-desc">{descriptions[c]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── results ── an opaque sheet: the HUD/caption/menu above are unmounted (not just
          covered) the moment this phase starts, so nothing from the fight can bleed through. */}
      {phase === 'results' && winner && (
        <div className="arena-results">
          <div className="arena-results-sheet">
            <BattleResults
              playerMonster={playerMonster}
              opponentMonster={opponentMonster}
              winner={winner}
              trait={{ key: trait, label: traitInfo.label, color: traitInfo.color }}
              map={map}
              booster={booster}
              onContinue={() => onBattleEnd(winner === 'player', opponentMonster.id, trait)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
