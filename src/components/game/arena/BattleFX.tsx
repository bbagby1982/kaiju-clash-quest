/**
 * BattleFX — every visual "hit" the arena can draw, positioned in arena space.
 *
 * The keyframes live in src/index.css (fx-beam / fx-impact / fx-projectile /
 * fx-shockwave / fx-damage / fx-stamp / fx-flash). This file only decides WHERE
 * each one goes and what colour it is, using the same geometry contract as
 * src/styles/arena.css:
 *
 *      player sprite at 22% from the left, opponent at 78%, ground line at 62%.
 *
 * Everything is absolutely positioned inside `.arena-fx`, which is `inset: 0`
 * over the (fixed, full-screen) arena — so `vw` and `%` mean the same thing to
 * both the layout and the travel distance of a projectile.
 *
 * Nothing here holds state or a timer: the sequencer in BattleSimulation pushes
 * items in and prunes them. Every animation is `both`, so a finished effect sits
 * at opacity 0 until it is pruned and can never leave a smear on screen.
 */
import { CSSProperties, memo } from 'react';
import { Monster } from '@/types/game';
import { Side } from '@/lib/battleEngine';

/** Arena geometry, in % of the arena box. Mirrors src/styles/arena.css. */
export const ARENA = {
  ground: 62,
  playerX: 22,
  opponentX: 78,
  /** Where beams and projectiles fly — roughly chest height on both fighters. */
  chestY: 52,
  /** Where damage numbers pop — above the head on a phone, at the head on desktop. */
  headY: 44,
} as const;

export type AbilityType = Monster['specialAbility']['type'];
export type FXShape = 'beam' | 'projectile' | 'shockwave' | 'melee';

/** Which effect an ability type should draw. Unmapped types fall back to melee. */
export function fxShapeForAbility(type: AbilityType | undefined): FXShape {
  switch (type) {
    case 'beam':
    case 'energy':
      return 'beam';
    case 'projectile':
      return 'projectile';
    case 'area':
    case 'buff':
    case 'debuff':
    case 'trap':
    case 'drain':
      return 'shockwave';
    case 'melee':
    case 'movement':
    default:
      return 'melee';
  }
}

export const sideX = (side: Side): number => (side === 'player' ? ARENA.playerX : ARENA.opponentX);

/** Vivid fallbacks for a monster whose `imageColor` is black/grey (several are). */
const TYPE_COLOR: Record<AbilityType, string> = {
  beam: '#7fff00',
  energy: '#00e5ff',
  projectile: '#ff5722',
  area: '#ffb300',
  buff: '#7cff6b',
  debuff: '#b388ff',
  drain: '#ff4081',
  trap: '#c9a227',
  melee: '#ffb300',
  movement: '#4fc3f7',
};

/**
 * The colour an effect is drawn in: the attacker's own `imageColor`, pushed up to
 * glow brightness. Roster colours are body colours (`hsl(120 40% 25%)` and friends)
 * — beautiful on a card, invisible as a beam — so the HUE is kept (that is the
 * monster's identity) and only saturation/lightness are lifted. Greys have no hue
 * worth keeping, so those fall back to a colour for the ability type.
 */
export function fxColor(monster: Monster, type?: AbilityType): string {
  const m = /^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$/.exec((monster.imageColor || '').trim());
  if (m) {
    const [h, s, l] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (s >= 25) {
      return `hsl(${h} ${Math.min(100, Math.max(85, s))}% ${Math.min(68, Math.max(55, l * 1.5))}%)`;
    }
  }
  return TYPE_COLOR[type ?? 'melee'] ?? '#ffb300';
}

/* ── Individual effects ─────────────────────────────────────────────────── */

/** An energy beam fired from one fighter into the other. */
export function Beam({ from, color }: { from: Side; color: string }) {
  const style: CSSProperties = {
    left: `${ARENA.playerX}%`,
    width: `${ARENA.opponentX - ARENA.playerX}%`,
    top: `${ARENA.chestY - 1.6}%`,
    height: '3.2%',
    ['--fx-color' as string]: color,
  };
  return <span className={`fx-beam arena-beam${from === 'opponent' ? ' arena-beam--rtl' : ''}`} style={style} />;
}

/** A hurled projectile that crosses the arena. */
export function Projectile({ from, color }: { from: Side; color: string }) {
  const travel = ARENA.opponentX - ARENA.playerX; // 56 — the gap between the fighters
  const style: CSSProperties = {
    left: `${sideX(from)}%`,
    top: `${ARENA.chestY}%`,
    ['--fx-size' as string]: 'clamp(26px, 7vw, 56px)',
    ['--fx-travel' as string]: `${from === 'player' ? travel : -travel}vw`,
    ['--fx-color' as string]: color,
  };
  return <span className="fx-projectile arena-projectile" style={style} />;
}

/** An expanding ring for area / buff / debuff / trap / drain abilities. */
export function Shockwave({ at, color }: { at: Side; color: string }) {
  const style: CSSProperties = {
    left: `${sideX(at)}%`,
    top: `${ARENA.ground - 5}%`,
    ['--fx-size' as string]: 'clamp(80px, 22vw, 190px)',
    ['--fx-color' as string]: color,
  };
  return <span className="fx-shockwave arena-shockwave" style={style} />;
}

/** The burst of light where a hit lands. */
export function ImpactBurst({ at, color, big = false }: { at: Side; color: string; big?: boolean }) {
  const style: CSSProperties = {
    left: `${sideX(at)}%`,
    top: `${ARENA.chestY}%`,
    ['--fx-size' as string]: big ? 'clamp(140px, 40vw, 320px)' : 'clamp(90px, 26vw, 210px)',
    ['--fx-color' as string]: color,
  };
  return <span className="fx-impact arena-impact" style={style} />;
}

/** Floating damage number. `crit` makes it big and gold. */
export function DamageNumber({ at, value, crit = false, label }: { at: Side; value: number; crit?: boolean; label?: string }) {
  const anchor: CSSProperties = { left: `${sideX(at)}%`, top: `${ARENA.headY}%` };
  return (
    <span className="arena-damage-anchor" style={anchor}>
      <span
        className={`fx-damage arena-damage${crit ? ' fx-damage--crit' : ''}`}
        style={{ fontSize: crit ? 'clamp(26px, 7vw, 46px)' : 'clamp(20px, 5.5vw, 34px)' }}
      >
        {label ? `${label} ${value}` : `-${value}`}
      </span>
    </span>
  );
}

/** Big centred word — "CRITICAL!", "BLOCKED!", "MISS!", "K.O.!", "ROUND 1", "FIGHT!". */
export function Stamp({ text, color = '#ffd600' }: { text: string; color?: string }) {
  return (
    <span
      className="fx-stamp"
      style={{ ['--fx-color' as string]: color, color, fontSize: 'clamp(30px, 11vw, 82px)', whiteSpace: 'nowrap' }}
    >
      {text}
    </span>
  );
}

/** Full-screen colour wash on a big moment. */
export function ScreenFlash({ color = '#ffffff' }: { color?: string }) {
  return <span className="fx-flash" style={{ background: color }} />;
}

/* ── The layer the sequencer talks to ───────────────────────────────────── */

/** What the sequencer asks for. `FXItem` is the same thing once the layer has stamped an id on it. */
export type FXSpec =
  | { kind: 'beam'; from: Side; color: string }
  | { kind: 'projectile'; from: Side; color: string }
  | { kind: 'shockwave'; at: Side; color: string }
  | { kind: 'impact'; at: Side; color: string; big?: boolean }
  | { kind: 'damage'; at: Side; value: number; crit?: boolean; label?: string }
  | { kind: 'stamp'; text: string; color?: string }
  | { kind: 'flash'; color?: string };

export type FXItem = FXSpec & { id: number };

function renderItem(item: FXItem) {
  switch (item.kind) {
    case 'beam': return <Beam key={item.id} from={item.from} color={item.color} />;
    case 'projectile': return <Projectile key={item.id} from={item.from} color={item.color} />;
    case 'shockwave': return <Shockwave key={item.id} at={item.at} color={item.color} />;
    case 'impact': return <ImpactBurst key={item.id} at={item.at} color={item.color} big={item.big} />;
    case 'damage': return <DamageNumber key={item.id} at={item.at} value={item.value} crit={item.crit} label={item.label} />;
    case 'stamp': return <Stamp key={item.id} text={item.text} color={item.color} />;
    case 'flash': return <ScreenFlash key={item.id} color={item.color} />;
    default: return null;
  }
}

function BattleFXLayerInner({ items }: { items: FXItem[] }) {
  return <div className="arena-fx" aria-hidden="true">{items.map(renderItem)}</div>;
}

export const BattleFXLayer = memo(BattleFXLayerInner);
