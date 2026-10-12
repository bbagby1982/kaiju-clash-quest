/**
 * Voice — ElevenLabs speech + roars for the game, through /api/voice.
 *
 * Design rules:
 *  - NEVER blocks gameplay. Every call resolves (never rejects); a failure just means silence.
 *  - One shared <audio> element, unlocked by the first user gesture (iOS/Safari require it):
 *    `installAudioUnlock()` is called once by the app shell.
 *  - `speak()` interrupts whatever is playing by default; `roar()` layers on a second element.
 *  - Muted state lives in localStorage ('kaiju-voice-muted'); a 503 from the server (no key)
 *    switches the session to "unavailable" so we stop asking.
 *  - Clips are memoised in memory by (kind, voice, text) so replayed lines are instant.
 */
import { useCallback, useEffect, useState } from 'react';
import { Monster } from '@/types/game';

export type VoiceRole = 'narrator' | 'godzilla' | 'godzilla2' | 'announcer' | 'gamer' | 'theatre';

const MUTE_KEY = 'kaiju-voice-muted';
const MAX_MEMO = 60;

let speechEl: HTMLAudioElement | null = null;
let roarEl: HTMLAudioElement | null = null;
let unlocked = false;
let available: boolean | null = null; // null = unknown until the first request
const memo = new Map<string, string>(); // key -> object URL
const listeners = new Set<() => void>();

function notify() { listeners.forEach((l) => l()); }

function readMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
let muted = readMuted();

export function isVoiceMuted(): boolean { return muted; }
export function setVoiceMuted(next: boolean): void {
  muted = next;
  try { localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
  if (next) stopAllAudio();
  notify();
}
export function isVoiceAvailable(): boolean | null { return available; }

function ensureElements() {
  if (typeof window === 'undefined') return;
  if (!speechEl) { speechEl = new Audio(); speechEl.preload = 'auto'; }
  if (!roarEl) { roarEl = new Audio(); roarEl.preload = 'auto'; roarEl.volume = 0.9; }
}

/** Call once on app boot: the first tap/click primes the audio elements so iOS lets us play later. */
export function installAudioUnlock(): () => void {
  if (typeof window === 'undefined') return () => {};
  ensureElements();
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    for (const el of [speechEl, roarEl]) {
      if (!el) continue;
      try {
        // A silent, tiny WAV keeps Safari's "started by a gesture" flag on the element.
        el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
        const p = el.play();
        if (p && typeof p.catch === 'function') p.catch(() => { unlocked = false; });
      } catch { unlocked = false; }
    }
  };
  const opts = { passive: true } as AddEventListenerOptions;
  window.addEventListener('pointerdown', unlock, opts);
  window.addEventListener('touchend', unlock, opts);
  window.addEventListener('keydown', unlock, opts);
  return () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('touchend', unlock);
    window.removeEventListener('keydown', unlock);
  };
}

function remember(key: string, url: string) {
  if (memo.size >= MAX_MEMO) {
    const oldest = memo.keys().next().value;
    if (oldest) { const u = memo.get(oldest); memo.delete(oldest); if (u) URL.revokeObjectURL(u); }
  }
  memo.set(key, url);
}

async function fetchClip(key: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<string | null> {
  const cached = memo.get(key);
  if (cached) return cached;
  if (available === false) return null;
  try {
    const res = await fetch('/api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
    if (res.status === 503) { available = false; notify(); return null; }
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size) return null;
    const url = URL.createObjectURL(blob);
    remember(key, url);
    if (available !== true) { available = true; notify(); }
    return url;
  } catch {
    return null;
  }
}

function playOn(el: HTMLAudioElement | null, url: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (!el) return resolve();
    let done = false;
    const finish = () => { if (done) return; done = true; el.removeEventListener('ended', finish); el.removeEventListener('error', finish); resolve(); };
    el.addEventListener('ended', finish);
    el.addEventListener('error', finish);
    if (signal) signal.addEventListener('abort', () => { try { el.pause(); } catch { /* ignore */ } finish(); }, { once: true });
    // Re-check right before play(): the clip's fetch may have been in flight when
    // mute got tapped, so `muted` at call time isn't good enough.
    if (muted) return finish();
    try {
      el.src = url;
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => finish());
    } catch { finish(); }
  });
}

export function stopSpeaking(): void {
  try { if (speechEl) { speechEl.pause(); speechEl.currentTime = 0; } } catch { /* ignore */ }
}

/** Mute-tap handler: stop BOTH the speech line and any roar in progress. */
function stopAllAudio(): void {
  stopSpeaking();
  try { if (roarEl) { roarEl.pause(); roarEl.currentTime = 0; } } catch { /* ignore */ }
}

/**
 * Speak a line. Resolves when playback ends (or immediately when muted/unavailable/failed).
 * `interrupt` (default true) cuts off the previous line — captions never queue up behind each other.
 */
export async function speak(text: string, role: VoiceRole = 'narrator', opts: { interrupt?: boolean; signal?: AbortSignal } = {}): Promise<void> {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean || muted || available === false) return;
  ensureElements();
  const key = `tts|${role}|${clean}`;
  const url = await fetchClip(key, { kind: 'speech', text: clean, voice: role }, opts.signal);
  if (!url || muted || opts.signal?.aborted) return;
  if (opts.interrupt !== false) stopSpeaking();
  await playOn(speechEl, url, opts.signal);
}

/** Prefetch a line (e.g. the victory quote) so it plays instantly later. */
export function preloadSpeech(text: string, role: VoiceRole = 'narrator'): void {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean || muted || available === false) return;
  void fetchClip(`tts|${role}|${clean}`, { kind: 'speech', text: clean, voice: role });
}

/** A sound-effect prompt for a monster's roar, derived from what it is. Shared across similar monsters so the cache pays once. */
export function roarPrompt(monster: Monster): string {
  const n = `${monster.id} ${monster.name}`.toLowerCase();
  if (/godzilla|zilla|rex|saur|dino|anguirus|rodan|ghidorah|titan|leviathan/.test(n)) return 'deep thunderous giant kaiju roar like Godzilla, cinematic, echoing across a city';
  if (/kong|ape|gorilla/.test(n)) return 'giant gorilla roar with chest beating, cinematic, echoing';
  if (/shark|kraken|jelly|urchin|crab|angler|whale|eel|barnacle|nautil|aqua|wave|tidal/.test(n)) return 'huge sea monster roar with rushing water and deep underwater growl, cinematic';
  if (/mecha|zord|robot|drone|glitch|wire|tank|junk|laser|hack|gear/.test(n)) return 'giant robot roar, metallic mechanical growl with servo whine and a clang, cinematic';
  if (/sock|burp|fluff|pizza|sneeze|nap|hiccup|wobble|giggle|snack|bubbl|confetti|noodle|banana|disco/.test(n)) return 'goofy cartoon monster growl, silly and big, with a comedic boing';
  if (/phantom|gloom|skull|tomb|night|crypt|ghoul|dread|wraith|bone/.test(n)) return 'ghostly monster howl, eerie and echoing, cinematic, not too scary';
  if (/moth|wing|bird|sky|storm|tempest|cyclon|volt|thunder/.test(n)) return 'giant flying monster screech with thunder crack and rushing wind, cinematic';
  if (/fire|infern|magma|cinder|lava|burn|blaze/.test(n)) return 'fiery monster roar with crackling flames and a whoosh of fire, cinematic';
  if (/ice|frost|glaci|snow/.test(n)) return 'icy monster roar with cracking ice and freezing wind, cinematic';
  return 'giant monster roar, deep and cinematic, echoing';
}

/** Play a monster's roar (layered over speech). Resolves when it ends or fails. */
export async function roar(monster: Monster, opts: { signal?: AbortSignal } = {}): Promise<void> {
  if (muted || available === false) return;
  ensureElements();
  const prompt = roarPrompt(monster);
  const key = `sfx|${prompt}`;
  const url = await fetchClip(key, { kind: 'roar', prompt }, opts.signal);
  if (!url || muted || opts.signal?.aborted) return;
  await playOn(roarEl, url, opts.signal);
}

export function preloadRoar(monster: Monster): void {
  if (muted || available === false) return;
  const prompt = roarPrompt(monster);
  void fetchClip(`sfx|${prompt}`, { kind: 'roar', prompt });
}

/** React hook: mute state + availability, re-rendering when either changes. */
export function useVoice() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  const toggle = useCallback(() => setVoiceMuted(!muted), []);
  return { muted, available, toggle, speak, roar, preloadSpeech, preloadRoar, stop: stopSpeaking };
}

/**
 * waitForLine — let a spoken line finish, but never let it hold a screen
 * hostage.
 *
 * Owner, 2026-10-12: "in the godzilla game the voice over keeps getting cut
 * off before it moves to the next page after the battle." The arena used to
 * fire the announcer + the winner's line as fire-and-forget and swap in the
 * results sheet on a fixed 1300ms timer; two real ElevenLabs clips run 4-8s,
 * so the sheet always landed mid-sentence.
 *
 * Resolves on whichever comes FIRST:
 *   1. `line` settles — the normal case, the kid hears the whole thing;
 *   2. `capMs` elapses — a slow or dead ElevenLabs must cost a few seconds of
 *      quiet, never a child stranded in a fight that is already over. This
 *      module's first rule is that voice never blocks gameplay;
 *   3. someone calls the releaser handed to `onRelease` — the kid tapped
 *      "skip", which cuts the line on purpose.
 *
 * Never rejects: a line that throws is treated as a line that finished, for
 * the same reason speak() never rejects. `onRelease(null)` is always called on
 * the way out so a caller can drop its reference and leave no live control
 * pointing at a finished wait.
 */
export function waitForLine(
  line: Promise<unknown> | null | undefined,
  capMs: number,
  onRelease?: (release: (() => void) | null) => void,
): Promise<'ended' | 'capped' | 'released' | 'none'> {
  if (!line) { onRelease?.(null); return Promise.resolve('none'); }
  return new Promise((resolve) => {
    let settled = false;
    const done = (how: 'ended' | 'capped' | 'released') => {
      if (settled) return;
      settled = true;
      clearTimeout(cap);
      onRelease?.(null);
      resolve(how);
    };
    const cap = setTimeout(() => done('capped'), Math.max(0, capMs));
    onRelease?.(() => { stopSpeaking(); done('released'); });
    void Promise.resolve(line).then(() => done('ended'), () => done('ended'));
  });
}
