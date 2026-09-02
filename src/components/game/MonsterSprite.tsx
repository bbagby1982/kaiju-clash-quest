/**
 * MonsterSprite — the one way a monster is drawn as a *character* (arena, race, title screen).
 *
 * - Pulls art from the roster (bundled or Canva-in-the-cloud); falls back to a tinted
 *   kaiju silhouette + emoji so a monster with no art still has a body on screen.
 * - Mirrors the image so the fighter faces its opponent: art is assumed to face RIGHT
 *   unless the monster says `facing: 'left'`.
 * - Cut-out (transparent) PNGs are drawn as-is; square art with a background gets a
 *   soft radial mask so it reads as a figure rather than a card. Transparency is sniffed
 *   once per image URL by sampling the corner pixels.
 * - All motion is CSS: `data-state` drives keyframes defined in src/index.css
 *   (sprite-idle, sprite-attack, sprite-special, sprite-hit, sprite-defend, sprite-ko,
 *   sprite-victory, sprite-run, sprite-enter). `--dir` is +1 when the sprite should move
 *   right (player on the left) and -1 when it should move left.
 */
import { CSSProperties, useEffect, useState } from 'react';
import { Monster } from '@/types/game';
import { useRoster } from '@/lib/roster';

export type SpriteState = 'idle' | 'attack' | 'special' | 'charge' | 'hit' | 'defend' | 'ko' | 'victory' | 'run' | 'enter' | 'none';
export type SpriteSide = 'left' | 'right';
export type SpriteSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface MonsterSpriteProps {
  monster: Monster;
  /** Which side of the screen the sprite stands on. Left faces right, right faces left. */
  side?: SpriteSide;
  state?: SpriteState;
  size?: SpriteSize;
  /** Extra glow colour (e.g. the ability colour while charging). */
  glow?: string;
  /** Draw the ground shadow ellipse. */
  shadow?: boolean;
  /** Desaturate + darken (locked / KO'd). */
  dim?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  /** Called once the image has loaded (or failed) — arenas use it to start the intro. */
  onReady?: () => void;
}

const SIZE_CLASS: Record<SpriteSize, string> = {
  xs: 'w-12 h-12',
  sm: 'w-20 h-20',
  md: 'w-32 h-32 md:w-40 md:h-40',
  lg: 'w-44 h-44 md:w-56 md:h-56',
  xl: 'w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80',
};

const transparencyCache = new Map<string, boolean>();
const transparencyInflight = new Map<string, Promise<boolean>>();

/** True when the image has transparent corners (a cut-out sprite). Cached per URL. */
export function sniffTransparency(url: string): Promise<boolean> {
  if (transparencyCache.has(url)) return Promise.resolve(transparencyCache.get(url)!);
  const inflight = transparencyInflight.get(url);
  if (inflight) return inflight;
  const p = new Promise<boolean>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        const w = img.naturalWidth, h = img.naturalHeight;
        c.width = w; c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx || !w || !h) return resolve(false);
        ctx.drawImage(img, 0, 0);
        const pts: [number, number][] = [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2], [Math.floor(w / 2), 1], [1, Math.floor(h / 2)]];
        let transparent = 0;
        for (const [x, y] of pts) {
          const a = ctx.getImageData(Math.max(0, x), Math.max(0, y), 1, 1).data[3];
          if (a < 16) transparent++;
        }
        resolve(transparent >= 3);
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = url;
  }).then((v) => { transparencyCache.set(url, v); transparencyInflight.delete(url); return v; });
  transparencyInflight.set(url, p);
  return p;
}

export function useImageIsCutout(url: string | undefined): boolean | null {
  const [cutout, setCutout] = useState<boolean | null>(() => (url && transparencyCache.has(url) ? transparencyCache.get(url)! : null));
  useEffect(() => {
    if (!url) { setCutout(null); return; }
    let live = true;
    sniffTransparency(url).then((v) => { if (live) setCutout(v); });
    return () => { live = false; };
  }, [url]);
  return cutout;
}

/** Generic kaiju silhouette used when a monster has no art. Tinted with the monster's imageColor. */
function Silhouette({ color, emoji }: { color: string; emoji: string }) {
  return (
    <div className="relative w-full h-full flex items-end justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" aria-hidden="true">
        <defs>
          <linearGradient id="kaiju-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0.35" />
            <stop offset="1" stopColor="black" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <g fill={color}>
          <path d="M52 12c-9 0-16 6-16 15v10c-6 3-11 9-13 16l-9 3c-3 1-3 5 0 6l9 1c1 8 5 14 11 18l-5 12c-1 3 3 5 5 3l8-11h9l8 11c2 2 6 0 5-3l-5-12c8-4 13-11 14-20l12-5c3-1 3-5 0-6l-11-2c-3-7-8-13-15-16V27c0-9-7-15-16-15z" />
          <path d="M40 30l-6-8 8 2-2-9 6 6 2-8 3 8 5-6-1 9 8-2-6 8z" opacity="0.9" />
        </g>
        <path fill="url(#kaiju-fill)" d="M52 12c-9 0-16 6-16 15v10c-6 3-11 9-13 16l-9 3c-3 1-3 5 0 6l9 1c1 8 5 14 11 18l-5 12c-1 3 3 5 5 3l8-11h9l8 11c2 2 6 0 5-3l-5-12c8-4 13-11 14-20l12-5c3-1 3-5 0-6l-11-2c-3-7-8-13-15-16V27c0-9-7-15-16-15z" />
        <circle cx="46" cy="28" r="3" fill="#fff" />
        <circle cx="46.5" cy="28.5" r="1.5" fill="#111" />
      </svg>
      <span className="absolute bottom-1 right-1 text-lg md:text-2xl drop-shadow" aria-hidden="true">{emoji}</span>
    </div>
  );
}

export function MonsterSprite({
  monster, side = 'left', state = 'idle', size = 'md', glow, shadow = true, dim = false, className = '', style, onClick, onReady,
}: MonsterSpriteProps) {
  const roster = useRoster();
  const url = roster.imageUrl(monster.id);
  const cutout = useImageIsCutout(url);
  const [failed, setFailed] = useState(false);
  const facing = monster.facing ?? 'right';
  const wantFacing: 'left' | 'right' = side === 'left' ? 'right' : 'left';
  const flip = facing !== wantFacing;
  const dir = side === 'left' ? 1 : -1;

  useEffect(() => { setFailed(false); }, [url]);

  const showImage = !!url && !failed;
  const masked = showImage && cutout === false;

  const spriteStyle: CSSProperties = {
    ['--dir' as string]: dir,
    ['--sprite-glow' as string]: glow || monster.imageColor,
    ...style,
  };

  return (
    <div
      className={`sprite relative select-none ${SIZE_CLASS[size]} ${dim ? 'grayscale brightness-50' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      data-state={state}
      data-side={side}
      data-cutout={cutout === true ? 'true' : 'false'}
      style={spriteStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={monster.name}
    >
      {shadow && <div className="sprite-shadow" aria-hidden="true" />}
      <div className="sprite-body w-full h-full">
        <div className={`sprite-art w-full h-full ${masked ? 'sprite-art--masked' : ''}`} style={{ transform: flip ? 'scaleX(-1)' : undefined }}>
          {showImage ? (
            <img
              src={url}
              alt={monster.name}
              draggable={false}
              className="w-full h-full object-contain"
              onLoad={() => onReady?.()}
              onError={() => { setFailed(true); onReady?.(); }}
            />
          ) : (
            <Silhouette color={monster.imageColor} emoji={roster.fallbackEmoji(monster.id)} />
          )}
        </div>
        <div className="sprite-flash" aria-hidden="true" />
        <div className="sprite-guard" aria-hidden="true" />
      </div>
    </div>
  );
}
