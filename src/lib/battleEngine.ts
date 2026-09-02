/**
 * Battle engine — deterministic, local, no network.
 *
 * The arena plays back the "beats" this returns (who moved, what they did, how much it
 * hurt) as animation, so the fight is always playable even when /api/battle is down.
 * The AI narrator only adds flavour text on top; it never decides damage any more.
 *
 * Pass `rng` to make a fight reproducible (tests do).
 */
import { Monster, MonsterStats, GameMap, Booster } from '@/types/game';

export type Choice = 'attack' | 'special' | 'defend' | 'terrain';
export type Trait = keyof MonsterStats;
export type Side = 'player' | 'opponent';

export const CHOICES: Choice[] = ['attack', 'special', 'defend', 'terrain'];
export const MAX_ROUNDS = 5;
export const MAX_HP = 100;

export interface Beat {
  actor: Side;
  target: Side;
  action: Choice;
  /** Damage dealt TO the target by this beat (0 for a pure defend). */
  damage: number;
  /** Counter damage dealt back to the actor when the target was defending. */
  counter: number;
  crit: boolean;
  blocked: boolean;
  missed: boolean;
  /** Attacker used terrain it has a bonus on. */
  terrainBoost: boolean;
  /** Attacker tried to use terrain it has NO bonus on (weak hit). */
  terrainFlop: boolean;
  abilityName?: string;
  abilityType?: Monster['specialAbility']['type'];
  /** Short fallback caption for the beat, used when the AI narrator is unavailable. */
  text: string;
}

export interface RoundResult {
  round: number;
  playerChoice: Choice;
  opponentChoice: Choice;
  playerFirst: boolean;
  beats: Beat[];
  playerHP: number;
  opponentHP: number;
  over: boolean;
  winner: 'player' | 'opponent' | 'tie' | null;
}

export interface RoundInput {
  player: Monster;
  opponent: Monster;
  playerChoice: Choice;
  opponentChoice?: Choice;
  trait: Trait;
  map: GameMap;
  booster?: Booster | null;
  round: number;
  playerHP: number;
  opponentHP: number;
  rng?: () => number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Booster bonus applied to one stat (mirrors BoosterSelection/BattleResults rules). */
export function boosterBonus(booster: Booster | null | undefined, trait: Trait, rng: () => number = Math.random): number {
  if (!booster) return 0;
  if (booster.effect === 'attack' && trait === 'specialAttack') return booster.power;
  if (booster.effect === 'defense' && trait === 'defense') return booster.power;
  if (booster.effect === 'speed' && trait === 'speed') return booster.power;
  if (booster.effect === 'random') return Math.floor(rng() * booster.power);
  return 0;
}

export function hasTerrainBonus(m: Monster, map: GameMap): boolean {
  return !!m.terrainBonus?.includes(map.terrain) || map.bonusMonsters.includes(m.id);
}

/** Stats after booster and terrain are applied. */
export function effectiveStats(m: Monster, map: GameMap, booster?: Booster | null, rng: () => number = Math.random): MonsterStats {
  const terrain = hasTerrainBonus(m, map) ? 8 : 0;
  const terrainBoost = booster?.effect === 'terrain' ? booster.power : 0;
  return {
    speed: clamp(m.stats.speed + boosterBonus(booster, 'speed', rng) + terrain, 1, 130),
    strength: clamp(m.stats.strength + boosterBonus(booster, 'strength', rng) + terrain + terrainBoost, 1, 130),
    defense: clamp(m.stats.defense + boosterBonus(booster, 'defense', rng) + terrain + terrainBoost, 1, 130),
    specialAttack: clamp(m.stats.specialAttack + boosterBonus(booster, 'specialAttack', rng) + terrain, 1, 130),
  };
}

/** Simple opponent brain: leans on its best stat, defends when hurt, uses terrain when it owns it. */
export function chooseOpponentMove(opponent: Monster, player: Monster, map: GameMap, opponentHP: number, rng: () => number = Math.random): Choice {
  const weights: Record<Choice, number> = { attack: 3, special: 2, defend: 1, terrain: 1 };
  if (opponent.stats.specialAttack >= 80) weights.special += 2;
  if (opponent.stats.strength >= 80) weights.attack += 2;
  if (hasTerrainBonus(opponent, map)) weights.terrain += 3;
  if (opponentHP <= 35) weights.defend += 3;
  if (player.stats.specialAttack >= 85 && opponentHP <= 50) weights.defend += 1;
  const total = weights.attack + weights.special + weights.defend + weights.terrain;
  let r = rng() * total;
  for (const c of CHOICES) {
    r -= weights[c];
    if (r <= 0) return c;
  }
  return 'attack';
}

function name(m: Monster) { return m.name; }

function describe(actor: Monster, target: Monster, beat: Omit<Beat, 'text'>, map: GameMap): string {
  const a = name(actor); const t = name(target);
  if (beat.action === 'defend') {
    return beat.counter > 0
      ? `${a} braces for impact and shoves ${t} back with a counter-blow! CLANG!`
      : `${a} digs in and raises a guard, watching ${t} closely.`;
  }
  if (beat.missed) return `${a} lunges — but ${t} slips aside at the last second! WHOOSH!`;
  if (beat.blocked) return `${a} strikes, but ${t} was ready! The hit glances off the guard. CLANG!`;
  if (beat.action === 'special') {
    return beat.crit
      ? `${a} unleashes ${beat.abilityName}! A DIRECT HIT — ${t} is blasted off its feet! KABOOM!`
      : `${a} fires ${beat.abilityName}! The blast slams into ${t}! BOOM!`;
  }
  if (beat.action === 'terrain') {
    return beat.terrainBoost
      ? `${a} turns ${map.name} into a weapon — the ${map.terrain} itself crashes down on ${t}! CRASH!`
      : `${a} tries to use the ${map.terrain}, but it's unfamiliar ground — a weak hit on ${t}.`;
  }
  return beat.crit
    ? `${a} lands a CRUSHING blow! ${t} goes flying! SMASH!`
    : `${a} charges in and hammers ${t}! WHAM!`;
}

interface Strike { damage: number; counter: number; crit: boolean; blocked: boolean; missed: boolean; terrainBoost: boolean; terrainFlop: boolean }

function resolveStrike(
  actor: Monster, target: Monster, action: Choice, targetAction: Choice,
  aStats: MonsterStats, tStats: MonsterStats, trait: Trait, map: GameMap, rng: () => number,
): Strike {
  const s: Strike = { damage: 0, counter: 0, crit: false, blocked: false, missed: false, terrainBoost: false, terrainFlop: false };
  if (action === 'defend') {
    // A defender who is attacked counters lightly; a defender facing a defender does nothing.
    if (targetAction !== 'defend') s.counter = 4 + Math.floor(rng() * 5);
    return s;
  }

  const base = 9 + rng() * 9; // 9..18
  let attack = aStats.strength;
  let mult = 1;

  if (action === 'special') {
    attack = aStats.specialAttack;
    mult = 1.45;
    if (rng() < 0.12) { s.missed = true; return s; }
    if (rng() < 0.25) { s.crit = true; mult *= 1.5; }
  } else if (action === 'terrain') {
    if (hasTerrainBonus(actor, map)) { s.terrainBoost = true; mult = 1.5; }
    else { s.terrainFlop = true; mult = 0.6; }
  } else {
    if (rng() < 0.15) { s.crit = true; mult *= 1.4; }
  }

  // The battle focus trait matters: whoever leads on it hits harder / takes less.
  const lead = aStats[trait] - tStats[trait];
  if (lead > 0) mult *= 1.1 + Math.min(0.25, lead / 100);
  else if (lead < 0) mult *= 0.9 + Math.max(-0.2, lead / 100);

  // Stat contest: attack vs defense, scaled so 100 vs 50 is roughly +50%.
  const contest = 1 + (attack - tStats.defense) / 100;
  let dmg = base * mult * clamp(contest, 0.4, 2.0);

  if (targetAction === 'defend') {
    s.blocked = true;
    dmg *= 0.35;
    s.counter = 3 + Math.floor(rng() * 4);
  }
  s.damage = clamp(Math.round(dmg), 2, 40);
  return s;
}

export function resolveRound(input: RoundInput): RoundResult {
  const rng = input.rng ?? Math.random;
  const { player, opponent, map, trait, round } = input;
  const pStats = effectiveStats(player, map, input.booster, rng);
  const oStats = effectiveStats(opponent, map, null, rng);
  const opponentChoice = input.opponentChoice ?? chooseOpponentMove(opponent, player, map, input.opponentHP, rng);
  const playerChoice = input.playerChoice;

  // Speed decides who moves first; a defender always "moves" first so the block is up in time.
  let playerFirst: boolean;
  if (playerChoice === 'defend' && opponentChoice !== 'defend') playerFirst = true;
  else if (opponentChoice === 'defend' && playerChoice !== 'defend') playerFirst = false;
  else playerFirst = pStats.speed === oStats.speed ? rng() < 0.5 : pStats.speed > oStats.speed;

  let playerHP = input.playerHP;
  let opponentHP = input.opponentHP;
  const beats: Beat[] = [];

  const doBeat = (side: Side) => {
    const actor = side === 'player' ? player : opponent;
    const target = side === 'player' ? opponent : player;
    const action = side === 'player' ? playerChoice : opponentChoice;
    const targetAction = side === 'player' ? opponentChoice : playerChoice;
    const aStats = side === 'player' ? pStats : oStats;
    const tStats = side === 'player' ? oStats : pStats;
    const strike = resolveStrike(actor, target, action, targetAction, aStats, tStats, trait, map, rng);
    const partial: Omit<Beat, 'text'> = {
      actor: side,
      target: side === 'player' ? 'opponent' : 'player',
      action,
      ...strike,
      abilityName: action === 'special' ? actor.specialAbility.name : undefined,
      abilityType: action === 'special' ? actor.specialAbility.type : undefined,
    };
    const beat: Beat = { ...partial, text: describe(actor, target, partial, map) };
    beats.push(beat);
    if (side === 'player') {
      opponentHP = clamp(opponentHP - beat.damage, 0, MAX_HP);
      playerHP = clamp(playerHP - beat.counter, 0, MAX_HP);
    } else {
      playerHP = clamp(playerHP - beat.damage, 0, MAX_HP);
      opponentHP = clamp(opponentHP - beat.counter, 0, MAX_HP);
    }
  };

  const order: Side[] = playerFirst ? ['player', 'opponent'] : ['opponent', 'player'];
  doBeat(order[0]);
  if (playerHP > 0 && opponentHP > 0) doBeat(order[1]);

  const koed = playerHP <= 0 || opponentHP <= 0;
  const over = koed || round >= MAX_ROUNDS;
  let winner: RoundResult['winner'] = null;
  if (over) {
    if (playerHP > opponentHP) winner = 'player';
    else if (opponentHP > playerHP) winner = 'opponent';
    else winner = 'tie';
  }

  return { round, playerChoice, opponentChoice, playerFirst, beats, playerHP, opponentHP, over, winner };
}

/** The trait a battle focus actually tests (kept from the previous BattleSimulation). */
export function traitForFocus(focus: string, rng: () => number = Math.random): Trait {
  if (focus === 'random') {
    const t: Trait[] = ['speed', 'strength', 'defense', 'specialAttack'];
    return t[Math.floor(rng() * t.length)];
  }
  if (focus === 'fireVsIce') return 'specialAttack';
  if (focus === 'focusVsDistraction') return 'defense';
  if (focus === 'allOut') return 'strength';
  if (focus === 'speed' || focus === 'strength' || focus === 'defense' || focus === 'specialAttack') return focus;
  return 'strength';
}

export const TRAIT_INFO: Record<Trait, { label: string; color: string }> = {
  speed: { label: 'SPEED', color: '#3b82f6' },
  strength: { label: 'STRENGTH', color: '#ef4444' },
  defense: { label: 'DEFENSE', color: '#22c55e' },
  specialAttack: { label: 'SPECIAL', color: '#eab308' },
};

/** Player-facing description of each command for a given fighter/map. */
export function choiceDescriptions(m: Monster, map: GameMap): Record<Choice, string> {
  return {
    attack: `Charge in and hit hard with raw strength`,
    special: `Unleash ${m.specialAbility.name}`,
    defend: `Brace, take less damage and counter`,
    terrain: hasTerrainBonus(m, map) ? `Use the ${map.terrain} — ${m.name} owns this ground!` : `Try to use the ${map.terrain} (risky here)`,
  };
}

/** Tiny seeded RNG for reproducible fights (mulberry32). */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
