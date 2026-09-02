/**
 * ArenaBackdrop — the full-screen battlefield the fighters stand on.
 *
 * One layered scene per `map.terrain`:
 *   sky gradient → far silhouette (parallax) → mid silhouette (faster parallax)
 *   → ground plane → ambient particles → vignette.
 *
 * Rules this file keeps:
 *  - CSS only. No canvas, no timers, no framer-motion. Motion lives in
 *    src/styles/arena.css (`.arena-scroll--*`, `.arena-p-*`) so it can be shut
 *    off wholesale by prefers-reduced-motion.
 *  - At most ~30 animated particle nodes on screen, ever.
 *  - The ground line is `--arena-ground` (62% down). BattleSimulation stands the
 *    sprites on it and BattleFX aims at it, so nothing here may move it.
 *  - Layout is percentage-based, so it reads the same at 390px portrait, 820px
 *    iPad and desktop.
 */
import { CSSProperties, memo, useMemo } from 'react';
import { GameMap } from '@/types/game';

type Terrain = GameMap['terrain'];

interface ArenaBackdropProps {
  map: GameMap;
  className?: string;
}

interface TerrainTheme {
  sky: string;
  haze: string;
  far: string;
  mid: string;
  groundNear: string;
  groundFar: string;
  rim: string;
}

// groundNear/groundFar: the ground gradient runs far→near from the horizon line down to
// the very bottom of the screen (behind the caption bar), so groundFar only needs to read
// as "a bit darker than groundNear" — on a tall phone viewport that band can be 300px+, and
// if it dives to near-black the whole lower third of the arena reads as dead space.
const THEMES: Record<Terrain, TerrainTheme> = {
  city: {
    sky: 'linear-gradient(180deg, #05070f 0%, #0d1630 38%, #2a2350 66%, #6d3352 88%, #93414d 100%)',
    haze: 'hsl(300 60% 60% / 0.18)',
    far: '#0b1226',
    mid: '#05080f',
    groundNear: '#262c3c',
    groundFar: '#141926',
    rim: 'hsl(300 100% 72% / 0.5)',
  },
  island: {
    sky: 'linear-gradient(180deg, #061019 0%, #0d2a34 34%, #1f5b57 60%, #a86b3c 88%, #d99552 100%)',
    haze: 'hsl(35 80% 65% / 0.22)',
    far: '#0a2119',
    mid: '#04120d',
    groundNear: '#4a3d2a',
    groundFar: '#26200f',
    rim: 'hsl(45 90% 70% / 0.45)',
  },
  ocean: {
    sky: 'linear-gradient(180deg, #01060f 0%, #032037 40%, #05496b 72%, #0a7290 100%)',
    haze: 'hsl(190 100% 70% / 0.2)',
    far: '#04283c',
    mid: '#021620',
    groundNear: '#0f4a63',
    groundFar: '#082c3d',
    rim: 'hsl(185 100% 70% / 0.5)',
  },
  volcano: {
    sky: 'linear-gradient(180deg, #0a0203 0%, #240607 36%, #4d1206 66%, #8a2a06 88%, #c24a08 100%)',
    haze: 'hsl(22 100% 55% / 0.3)',
    far: '#1a0704',
    mid: '#0b0302',
    groundNear: '#421a0e',
    groundFar: '#220c07',
    rim: 'hsl(20 100% 60% / 0.7)',
  },
  ruins: {
    sky: 'linear-gradient(180deg, #05070b 0%, #131923 40%, #2b3140 68%, #4a4536 90%, #6b5c3c 100%)',
    haze: 'hsl(45 40% 65% / 0.18)',
    far: '#141a24',
    mid: '#080b11',
    groundNear: '#37342b',
    groundFar: '#1c1a15',
    rim: 'hsl(45 60% 70% / 0.4)',
  },
};

/** Stable pseudo-random in [0,1) — same layout on every render, no useState churn. */
function prand(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Evenly spaced silhouette bars across a 0..400 viewBox. */
function bars(heights: number[], gap = 3) {
  const w = 400 / heights.length;
  return heights.map((h, i) => (
    <rect key={i} x={i * w} y={100 - h} width={Math.max(1, w - gap)} height={h} />
  ));
}

const CITY_FAR_H = [40, 58, 33, 71, 47, 63, 37, 82, 44, 60, 35, 68, 50, 76, 41, 55];
const CITY_MID_H = [58, 88, 66, 100, 72, 92, 61, 84];
const RUINS_FAR_H = [34, 62, 28, 74, 40, 55, 30, 68, 36, 58, 26, 70];

function FarScene({ terrain, fill }: { terrain: Terrain; fill: string }) {
  if (terrain === 'city') {
    return (
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
        <g fill={fill}>
          {bars(CITY_FAR_H)}
          <rect x="176" y="8" width="2" height="12" />
          <rect x="308" y="16" width="2" height="10" />
        </g>
      </svg>
    );
  }
  if (terrain === 'volcano') {
    return (
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
        <path fill={fill} d="M0 100 L0 78 L58 52 L96 66 L150 24 L182 8 L214 26 L262 62 L306 44 L352 70 L400 58 L400 100 Z" />
        <path fill="hsl(20 100% 58% / 0.85)" d="M170 16 L182 8 L196 18 L188 22 L178 20 Z" />
        <path fill="hsl(20 100% 55% / 0.35)" d="M182 8 L196 18 L206 44 L192 40 Z" />
      </svg>
    );
  }
  if (terrain === 'island') {
    return (
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
        <path fill={fill} d="M0 100 L0 66 Q38 46 76 60 L108 40 Q148 20 188 44 L228 32 Q278 18 326 50 L366 38 L400 58 L400 100 Z" />
        <g fill={fill}>
          <rect x="120" y="52" width="3" height="30" />
          <path d="M121 54 q-16 -10 -24 -2 q12 -3 24 4 z M121 54 q16 -10 25 -2 q-13 -3 -25 4 z M121 52 q-3 -14 -12 -18 q9 8 10 19 z" />
          <rect x="290" y="60" width="3" height="26" />
          <path d="M291 62 q-14 -9 -22 -2 q11 -3 22 4 z M291 62 q15 -9 23 -2 q-12 -3 -23 4 z" />
        </g>
      </svg>
    );
  }
  if (terrain === 'ocean') {
    return (
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
        <path fill={fill} d="M0 100 L0 84 Q56 80 116 84 L154 68 Q188 50 222 70 L262 84 Q330 80 400 84 L400 100 Z" />
        <path fill="hsl(190 100% 80% / 0.25)" d="M0 84 Q56 80 116 84 L154 68 Q188 50 222 70 L262 84 Q330 80 400 84 L400 87 Q330 83 262 87 L222 73 Q188 53 154 71 L116 87 Q56 83 0 87 Z" />
      </svg>
    );
  }
  // ruins — broken towers with bitten-off tops
  return (
    <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
      <g fill={fill}>
        {bars(RUINS_FAR_H, 6)}
        <path d="M60 38 l10 -8 l6 10 l10 -6 l4 8 z" />
        <path d="M196 26 l12 -10 l8 12 l10 -5 l3 9 z" />
        <path d="M330 30 l9 -9 l7 11 l9 -5 l4 8 z" />
      </g>
      <g fill="hsl(0 0% 0% / 0.55)">
        <rect x="112" y="40" width="10" height="10" />
        <rect x="268" y="34" width="9" height="9" />
      </g>
    </svg>
  );
}

function MidScene({ terrain, fill }: { terrain: Terrain; fill: string }) {
  if (terrain === 'city') {
    return (
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
        <g fill={fill}>{bars(CITY_MID_H, 6)}</g>
      </svg>
    );
  }
  if (terrain === 'volcano') {
    return (
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
        <path fill={fill} d="M0 100 L0 62 L34 40 L62 58 L104 30 L140 56 L178 36 L220 60 L258 34 L300 58 L340 38 L376 60 L400 46 L400 100 Z" />
        <path fill="hsl(24 100% 52% / 0.6)" d="M0 96 Q60 84 118 96 Q180 108 244 94 Q310 82 400 96 L400 100 L0 100 Z" />
      </svg>
    );
  }
  if (terrain === 'island') {
    return (
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
        <path fill={fill} d="M0 100 L0 58 Q22 34 48 52 Q70 26 98 48 Q124 24 152 50 Q178 28 206 52 Q232 30 260 50 Q288 26 316 50 Q342 30 370 52 Q388 40 400 56 L400 100 Z" />
      </svg>
    );
  }
  if (terrain === 'ocean') {
    return (
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
        <path fill={fill} d="M0 100 L0 56 Q40 32 80 54 Q120 76 160 52 Q200 28 240 54 Q280 78 320 52 Q360 30 400 56 L400 100 Z" />
        <path fill="hsl(190 100% 85% / 0.22)" d="M0 56 Q40 32 80 54 Q120 76 160 52 Q200 28 240 54 Q280 78 320 52 Q360 30 400 56 L400 61 Q360 35 320 57 Q280 83 240 59 Q200 33 160 57 Q120 81 80 59 Q40 37 0 61 Z" />
      </svg>
    );
  }
  // ruins — rubble mounds and leaning slabs
  return (
    <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
      <path fill={fill} d="M0 100 L0 72 Q40 52 84 70 L118 46 L136 72 Q180 54 222 72 L252 44 L272 70 Q322 50 366 70 L400 58 L400 100 Z" />
      <g fill={fill}>
        <path d="M150 100 L162 44 L176 46 L170 100 Z" />
        <path d="M312 100 L300 50 L314 46 L326 100 Z" />
      </g>
    </svg>
  );
}

interface Particle { className: string; style: CSSProperties }

/** Ambient particle field — never more than 30 nodes, all pure CSS. */
function useParticles(terrain: Terrain): Particle[] {
  return useMemo(() => {
    const out: Particle[] = [];
    const px = (i: number, salt: number) => `${(prand(i, salt) * 100).toFixed(2)}%`;

    if (terrain === 'city') {
      // Lit windows scattered across the skyline band, blinking out of sync.
      for (let i = 0; i < 22; i++) {
        out.push({
          className: 'arena-particle arena-p-twinkle',
          style: {
            left: px(i, 3),
            top: `${(22 + prand(i, 7) * 34).toFixed(2)}%`,
            width: 3,
            height: 4,
            borderRadius: 1,
            background: prand(i, 11) > 0.7 ? 'hsl(190 100% 75%)' : 'hsl(45 100% 70%)',
            boxShadow: '0 0 6px currentColor',
            ['--dur' as string]: `${(2.2 + prand(i, 13) * 4).toFixed(2)}s`,
            ['--delay' as string]: `${(prand(i, 17) * 5).toFixed(2)}s`,
            ['--peak' as string]: 0.95,
          },
        });
      }
      return out;
    }

    if (terrain === 'island') {
      for (let i = 0; i < 14; i++) {
        out.push({
          className: 'arena-particle arena-p-float',
          style: {
            left: px(i, 3),
            top: `${(30 + prand(i, 7) * 34).toFixed(2)}%`,
            width: 4,
            height: 4,
            background: 'hsl(70 100% 65%)',
            boxShadow: '0 0 10px hsl(70 100% 60%)',
            ['--dur' as string]: `${(3 + prand(i, 13) * 4).toFixed(2)}s`,
            ['--delay' as string]: `${(prand(i, 17) * 4).toFixed(2)}s`,
            ['--sway' as string]: `${(prand(i, 19) * 50 - 25).toFixed(0)}px`,
            ['--lift' as string]: `${(-14 - prand(i, 23) * 28).toFixed(0)}px`,
            ['--peak' as string]: 0.9,
          },
        });
      }
      for (let i = 0; i < 8; i++) {
        out.push({
          className: 'arena-particle arena-p-fall',
          style: {
            left: px(i, 29),
            top: '-4%',
            width: 7,
            height: 4,
            borderRadius: '60% 10% 60% 10%',
            background: 'hsl(96 45% 42%)',
            ['--dur' as string]: `${(8 + prand(i, 31) * 7).toFixed(2)}s`,
            ['--delay' as string]: `${(prand(i, 37) * 9).toFixed(2)}s`,
            ['--sway' as string]: `${(prand(i, 41) * 90 - 30).toFixed(0)}px`,
            ['--peak' as string]: 0.7,
          },
        });
      }
      return out;
    }

    if (terrain === 'ocean') {
      for (let i = 0; i < 20; i++) {
        const size = 3 + prand(i, 5) * 8;
        out.push({
          className: 'arena-particle arena-p-rise',
          style: {
            left: px(i, 3),
            bottom: `${(prand(i, 7) * 25).toFixed(2)}%`,
            width: size,
            height: size,
            border: '1px solid hsl(190 100% 85% / 0.75)',
            background: 'hsl(190 100% 90% / 0.12)',
            ['--dur' as string]: `${(5 + prand(i, 13) * 6).toFixed(2)}s`,
            ['--delay' as string]: `${(prand(i, 17) * 7).toFixed(2)}s`,
            ['--sway' as string]: `${(prand(i, 19) * 40 - 20).toFixed(0)}px`,
            ['--lift' as string]: '-80vh',
            ['--peak' as string]: 0.85,
          },
        });
      }
      return out;
    }

    if (terrain === 'volcano') {
      for (let i = 0; i < 24; i++) {
        const size = 2 + prand(i, 5) * 5;
        out.push({
          className: 'arena-particle arena-p-rise',
          style: {
            left: px(i, 3),
            bottom: `${(prand(i, 7) * 30).toFixed(2)}%`,
            width: size,
            height: size,
            background: prand(i, 11) > 0.6 ? 'hsl(45 100% 70%)' : 'hsl(18 100% 58%)',
            boxShadow: '0 0 8px hsl(24 100% 60%)',
            ['--dur' as string]: `${(4 + prand(i, 13) * 5).toFixed(2)}s`,
            ['--delay' as string]: `${(prand(i, 17) * 6).toFixed(2)}s`,
            ['--sway' as string]: `${(prand(i, 19) * 70 - 35).toFixed(0)}px`,
            ['--lift' as string]: '-95vh',
            ['--peak' as string]: 1,
          },
        });
      }
      return out;
    }

    // ruins — slow drifting dust
    for (let i = 0; i < 22; i++) {
      const size = 2 + prand(i, 5) * 4;
      out.push({
        className: 'arena-particle arena-p-float',
        style: {
          left: px(i, 3),
          top: `${(20 + prand(i, 7) * 55).toFixed(2)}%`,
          width: size,
          height: size,
          background: 'hsl(42 40% 78%)',
          ['--dur' as string]: `${(4 + prand(i, 13) * 6).toFixed(2)}s`,
          ['--delay' as string]: `${(prand(i, 17) * 6).toFixed(2)}s`,
          ['--sway' as string]: `${(prand(i, 19) * 60 - 30).toFixed(0)}px`,
          ['--lift' as string]: `${(-10 - prand(i, 23) * 30).toFixed(0)}px`,
          ['--peak' as string]: 0.5,
        },
      });
    }
    return out;
  }, [terrain]);
}

function ArenaBackdropInner({ map, className = '' }: ArenaBackdropProps) {
  const terrain = map.terrain;
  const theme = THEMES[terrain] ?? THEMES.city;
  const particles = useParticles(terrain);

  const rootStyle: CSSProperties = {
    ['--arena-haze' as string]: theme.haze,
    ['--arena-ground-near' as string]: theme.groundNear,
    ['--arena-ground-far' as string]: theme.groundFar,
    ['--arena-rim' as string]: theme.rim,
  };

  return (
    <div className={`arena-backdrop ${className}`} style={rootStyle} aria-hidden="true">
      <div className="arena-sky" style={{ background: theme.sky }} />

      {/* The map's own accent colour, so every map still feels like itself. */}
      <div
        className="arena-sky"
        style={{ background: `radial-gradient(ellipse 60% 40% at 50% 58%, ${map.accentColor}33, transparent 70%)` }}
      />

      <div className="arena-layer arena-far">
        <div className="arena-scroll arena-scroll--slow">
          <div><FarScene terrain={terrain} fill={theme.far} /></div>
          <div><FarScene terrain={terrain} fill={theme.far} /></div>
        </div>
      </div>

      <div className="arena-layer arena-mid">
        <div className="arena-scroll arena-scroll--mid">
          <div><MidScene terrain={terrain} fill={theme.mid} /></div>
          <div><MidScene terrain={terrain} fill={theme.mid} /></div>
        </div>
      </div>

      <div className="arena-haze" />
      <div className="arena-ground" />

      {terrain === 'volcano' && <div className="arena-lavaglow" />}
      {terrain === 'ruins' && <div className="arena-lightning" />}
      {terrain === 'ocean' && <div className="arena-caustics" />}
      {terrain === 'city' && (
        <>
          <div className="arena-searchlight" style={{ left: '12%', ['--dur' as string]: '13s', ['--sl-color' as string]: 'hsl(50 100% 75% / 0.4)' }} />
          <div className="arena-searchlight" style={{ left: '72%', ['--dur' as string]: '17s', ['--delay' as string]: '2s', ['--sl-color' as string]: 'hsl(190 100% 75% / 0.35)' }} />
        </>
      )}

      <div className="arena-particles">
        {particles.map((p, i) => (
          <span key={i} className={p.className} style={p.style} />
        ))}
      </div>

      <div className="arena-vignette" />
    </div>
  );
}

export const ArenaBackdrop = memo(ArenaBackdropInner);
