/**
 * Roster — the ONE place the game learns which monsters exist and which have art.
 *
 * Three sources are merged, in this order:
 *   1. `MONSTERS` in src/data/monsters.ts — Alfred's hand-written roster (names, titles,
 *      fun facts, abilities). Never edited at runtime.
 *   2. Bundled images in src/lib/monsterImages.ts — art shipped inside the build.
 *   3. The cloud manifest from `/api/roster` — every Canva image uploaded through
 *      /admin.html (Netlify Blobs store "monster-images") plus every custom monster
 *      created there (store "monster-defs").
 *
 * A monster is PLAYABLE when it has art from source 2 or 3. That replaces the old
 * hard-coded MONSTERS_WITH_IMAGES set, which is why uploads used to "not show up":
 * the code had to be edited and redeployed for each one.
 *
 * The manifest is cached in localStorage so the roster is instant on the next visit
 * and still works offline; a fresh copy is fetched in the background on every boot.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { Monster } from '@/types/game';
import { MONSTERS } from '@/data/monsters';
import { getBundledMonsterImage, getMonsterFallbackEmoji } from '@/lib/monsterImages';

export interface RosterManifest {
  /** monsterId -> version token (blob etag). Presence means "has cloud art". */
  art: Record<string, string>;
  /** Monsters created in the admin page. */
  custom: Monster[];
  fetchedAt: number;
}

export interface Roster {
  /** Every monster, static + custom (custom overrides static on id collision). */
  all: Monster[];
  /** Monsters that have real artwork — the only ones a kid should ever be offered. */
  playable: Monster[];
  byId: (id: string) => Monster | undefined;
  hasArt: (id: string) => boolean;
  /** Image URL for a monster, or undefined when it has no art anywhere. */
  imageUrl: (id: string) => string | undefined;
  fallbackEmoji: (id: string) => string;
  /** True once the cloud manifest has been fetched (or definitively failed) this session. */
  ready: boolean;
  /** True while the manifest is being (re)fetched. */
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  randomOpponent: (excludeId: string) => Monster;
  randomRaceOpponents: (excludeId: string, count?: number) => Monster[];
  unlocked: (unlockedIds: string[]) => Monster[];
  locked: (unlockedIds: string[]) => Monster[];
}

const CACHE_KEY = 'kaiju-roster-manifest-v1';
const EMPTY_MANIFEST: RosterManifest = { art: {}, custom: [], fetchedAt: 0 };

function readCache(): RosterManifest {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return EMPTY_MANIFEST;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return EMPTY_MANIFEST;
    return {
      art: parsed.art && typeof parsed.art === 'object' ? parsed.art : {},
      custom: Array.isArray(parsed.custom) ? parsed.custom : [],
      fetchedAt: Number(parsed.fetchedAt) || 0,
    };
  } catch {
    return EMPTY_MANIFEST;
  }
}

function writeCache(m: RosterManifest) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(m));
  } catch {
    /* storage full or blocked — the in-memory copy still works */
  }
}

/** Fetch /api/roster with a timeout. Returns null on any failure (caller keeps the cached copy). */
export async function fetchRosterManifest(timeoutMs = 8000): Promise<RosterManifest | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('/api/roster', { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== 'object') return null;
    return {
      art: data.art && typeof data.art === 'object' ? data.art : {},
      custom: Array.isArray(data.custom) ? data.custom.filter(isMonsterLike) : [],
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isMonsterLike(m: unknown): m is Monster {
  if (!m || typeof m !== 'object') return false;
  const x = m as Record<string, unknown>;
  const stats = x.stats as Record<string, unknown> | undefined;
  return typeof x.id === 'string' && typeof x.name === 'string' && !!stats
    && typeof stats.speed === 'number' && typeof stats.strength === 'number'
    && typeof stats.defense === 'number' && typeof stats.specialAttack === 'number'
    && !!x.specialAbility && typeof (x.specialAbility as Record<string, unknown>).name === 'string';
}

/** Pure builder so tests and non-React code can derive a roster from a manifest. */
export function buildRoster(manifest: RosterManifest): Pick<Roster, 'all' | 'playable' | 'byId' | 'hasArt' | 'imageUrl'> {
  const map = new Map<string, Monster>();
  for (const m of MONSTERS) map.set(m.id, m);
  for (const c of manifest.custom) {
    const base = map.get(c.id);
    map.set(c.id, { ...(base || {}), ...c, custom: true, imageColor: c.imageColor || base?.imageColor || 'hsl(120 40% 25%)' } as Monster);
  }
  const all = [...map.values()];
  const hasArt = (id: string) => !!getBundledMonsterImage(id) || !!manifest.art[id];
  const imageUrl = (id: string) => {
    const bundled = getBundledMonsterImage(id);
    if (bundled) return bundled;
    const v = manifest.art[id];
    if (v) return `/api/monster-image/${encodeURIComponent(id)}?v=${encodeURIComponent(v)}`;
    return undefined;
  };
  const playable = all.filter(m => hasArt(m.id));
  return { all, playable, byId: (id) => map.get(id), hasArt, imageUrl };
}

const RosterContext = createContext<Roster | null>(null);

export function RosterProvider({ children }: { children: ReactNode }) {
  const [manifest, setManifest] = useState<RosterManifest>(() => readCache());
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inflight.current) return inflight.current;
    setLoading(true);
    const p = (async () => {
      const fresh = await fetchRosterManifest();
      if (fresh) {
        setManifest(fresh);
        writeCache(fresh);
        setError(null);
      } else {
        setError('Could not reach the monster art server — showing the last known roster.');
      }
      setLoading(false);
      setReady(true);
      inflight.current = null;
    })();
    inflight.current = p;
    return p;
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo<Roster>(() => {
    const base = buildRoster(manifest);
    const pick = (list: Monster[]) => list[Math.floor(Math.random() * list.length)];
    return {
      ...base,
      fallbackEmoji: (id) => getMonsterFallbackEmoji(id, base.byId(id)?.name),
      ready,
      loading,
      error,
      refresh,
      randomOpponent: (excludeId) => {
        const pool = base.playable.filter(m => m.id !== excludeId);
        return pick(pool.length ? pool : base.playable);
      },
      randomRaceOpponents: (excludeId, count = 3) => {
        const pool = base.playable.filter(m => m.id !== excludeId);
        return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
      },
      unlocked: (ids) => base.playable.filter(m => ids.includes(m.id)),
      locked: (ids) => base.playable.filter(m => !ids.includes(m.id)),
    };
  }, [manifest, ready, loading, error, refresh]);

  return <RosterContext.Provider value={value}>{children}</RosterContext.Provider>;
}

export function useRoster(): Roster {
  const ctx = useContext(RosterContext);
  if (!ctx) throw new Error('useRoster must be used inside <RosterProvider>');
  return ctx;
}
