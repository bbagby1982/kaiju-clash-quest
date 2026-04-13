export interface MonsterStats {
  speed: number;
  strength: number;
  defense: number;
  specialAttack: number;
}

export interface UnlockRequirement {
  type: 'battles_won' | 'races_won' | 'defeat_monster' | 'trait_wins' | 'terrain_wins' | 'player_level' | 'no_booster_wins' | 'monster_mastery' | 'theme_gate' | 'special_trial' | 'discovery' | 'unique_monsters_used' | 'consecutive_wins';
  target: number;
  description: string;
  monsterId?: string;
  trait?: keyof MonsterStats;
  terrain?: string;
  theme?: 'fire' | 'speed' | 'strength' | 'trickery' | 'ocean' | 'ancient';
  trialId?: string;
  discoveryType?: 'lose_then_win' | 'no_booster_streak' | 'underdog_victory' | 'all_terrains';
}

export interface Monster {
  id: string;
  name: string;
  title: string;
  era: string;
  description: string;
  stats: MonsterStats;
  specialAbility: {
    name: string;
    description: string;
    type: 'beam' | 'melee' | 'area' | 'buff' | 'projectile' | 'debuff' | 'drain' | 'movement' | 'trap';
  };
  terrainBonus?: string[];
  rarity: 'common' | 'rare' | 'legendary';
  evolutionStage?: number;
  imageColor: string;
  unlockRequirements?: UnlockRequirement[];
  funFacts?: string[];
  strengths?: string[];
  weaknesses?: string[];
}

export interface Booster {
  id: string;
  name: string;
  description: string;
  effect: 'attack' | 'defense' | 'speed' | 'terrain' | 'random';
  power: number;
  icon: string;
  color: string;
  unlockRequirement?: { type: string; value: number };
}

export interface WeatherEffect {
  id: string;
  name: string;
  description: string;
  speedModifier: number;
  visibilityModifier: number;
  icon: string;
}

export interface GameMap {
  id: string;
  name: string;
  description: string;
  terrain: 'city' | 'island' | 'ocean' | 'volcano' | 'ruins';
  bonusMonsters: string[];
  backgroundColor: string;
  accentColor: string;
  obstacles?: string[];
  weatherEffects?: string[];
}

export interface BattleState {
  phase: 'selection' | 'countdown' | 'battle' | 'qte' | 'mashing' | 'ability' | 'result';
  playerMonster: Monster | null;
  opponentMonster: Monster | null;
  map: GameMap | null;
  playerHealth: number;
  opponentHealth: number;
  playerEnergy: number;
  opponentEnergy: number;
  currentQTE: QTEState | null;
  mashingState: MashingState | null;
  abilityState: AbilityState | null;
  winner: 'player' | 'opponent' | null;
  battleLog: string[];
  playerBooster?: Booster | null;
}

export interface QTEState {
  targetStart: number;
  targetEnd: number;
  indicatorPosition: number;
  isActive: boolean;
  result: 'pending' | 'success' | 'fail';
}

export interface MashingState {
  targetPresses: number;
  currentPresses: number;
  timeRemaining: number;
  isActive: boolean;
}

export interface AbilityState {
  isCharging: boolean;
  chargeLevel: number;
  isReady: boolean;
}

export interface RaceState {
  phase: 'selection' | 'countdown' | 'racing' | 'obstacle' | 'boost' | 'result';
  playerMonster: Monster | null;
  opponents: Monster[];
  map: GameMap | null;
  positions: { [monsterId: string]: number };
  stamina: number;
  currentObstacle: ObstacleQTE | null;
  boostState: BoostState | null;
  placements: string[];
  weather?: WeatherEffect;
}

export interface ObstacleQTE {
  type: 'jump' | 'dodge' | 'smash';
  timeRemaining: number;
  requiredKey: string;
  isActive: boolean;
}

export interface BoostState {
  targetPresses: number;
  currentPresses: number;
  timeRemaining: number;
  isActive: boolean;
}

export interface GameProgress {
  unlockedMonsters: string[];
  wins: number;
  losses: number;
  racesWon: number;
  racesLost: number;
  totalBattles: number;
  totalRaces: number;
  playerLevel: number;
  defeatedMonsters: string[];
  traitWins: Record<string, number>;
  terrainWins: Record<string, number>;
  noBoosterWins: number;
  unlockedBoosters: string[];
  discoveredEncyclopedia: string[];
  // Advanced progression tracking
  monsterMastery: Record<string, MonsterMasteryProgress>;
  unlockedThemes: string[];
  completedTrials: string[];
  discoveryProgress: Record<string, number>;
  uniqueMonstersUsed: string[];
  consecutiveWins: number;
  consecutiveLosses: number;
  totalMonstersUnlocked: number;
  // Daily challenge progress
  dailyChallenge: DailyChallengeProgress | null;
}

export interface DailyChallenge {
  id: string;
  date: string;
  type: 'battle' | 'race' | 'mixed';
  title: string;
  description: string;
  objectives: ChallengeObjective[];
  rewards: ChallengeReward[];
  difficulty: 'easy' | 'medium' | 'hard';
  icon: string;
  expiresAt: number;
}

export interface ChallengeObjective {
  id: string;
  type: 'win_battles' | 'win_races' | 'correct_predictions' | 'use_monster' | 'win_terrain' | 'win_trait' | 'no_booster' | 'streak';
  target: number;
  current: number;
  description: string;
  monsterId?: string;
  terrain?: string;
  trait?: keyof MonsterStats;
}

export interface ChallengeReward {
  type: 'xp' | 'monster_unlock' | 'booster';
  value: number | string;
  description: string;
}

export interface DailyChallengeProgress {
  currentChallenge: DailyChallenge | null;
  lastRefreshDate: string;
  challengeStreak: number;
  bestChallengeStreak: number;
  completedChallengesTotal: number;
  todayCompleted: boolean;
}

export interface MonsterMasteryProgress {
  battlesWon: number;
  terrainsWonOn: string[];
  abilitiesUsed: number;
  isMastered: boolean;
}

export interface SpecialTrial {
  id: string;
  name: string;
  description: string;
  rules: string[];
  reward: string; // monster id
  requirements: TrialRequirement[];
  icon: string;
}

export interface TrialRequirement {
  type: 'win_streak' | 'specific_monster' | 'terrain' | 'no_damage' | 'time_limit';
  value: number | string;
  description: string;
}

export type GameMode = 'battle' | 'race';
export type GameTab = 'battle' | 'race' | 'monsters' | 'encyclopedia';
