import { ChallengeObjective, ChallengeReward } from '@/types/game';

export interface ChallengeTemplate {
  id: string;
  type: 'battle' | 'race' | 'mixed';
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  icon: string;
  objectiveTemplates: Omit<ChallengeObjective, 'current'>[];
  rewards: ChallengeReward[];
  minLevel: number;
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // Easy challenges
  {
    id: 'first-steps',
    type: 'battle',
    title: 'First Steps',
    description: 'Win a couple of battles to warm up!',
    difficulty: 'easy',
    icon: '👊',
    objectiveTemplates: [
      { id: 'win-2', type: 'win_battles', target: 2, description: 'Win 2 battles' }
    ],
    rewards: [{ type: 'xp', value: 50, description: '+50 XP' }],
    minLevel: 1
  },
  {
    id: 'race-starter',
    type: 'race',
    title: 'Race Starter',
    description: 'Make your first correct prediction!',
    difficulty: 'easy',
    icon: '🏁',
    objectiveTemplates: [
      { id: 'predict-1', type: 'correct_predictions', target: 1, description: 'Predict 1 race correctly' }
    ],
    rewards: [{ type: 'xp', value: 50, description: '+50 XP' }],
    minLevel: 1
  },
  {
    id: 'warm-up',
    type: 'mixed',
    title: 'Warm Up',
    description: 'Try both game modes today!',
    difficulty: 'easy',
    icon: '🌟',
    objectiveTemplates: [
      { id: 'win-1', type: 'win_battles', target: 1, description: 'Win 1 battle' },
      { id: 'predict-1', type: 'correct_predictions', target: 1, description: 'Predict 1 race correctly' }
    ],
    rewards: [{ type: 'xp', value: 75, description: '+75 XP' }],
    minLevel: 1
  },

  // Medium challenges
  {
    id: 'speed-demon',
    type: 'battle',
    title: 'Speed Demon',
    description: 'Prove your reflexes are unmatched!',
    difficulty: 'medium',
    icon: '⚡',
    objectiveTemplates: [
      { id: 'speed-wins', type: 'win_trait', target: 2, trait: 'speed', description: 'Win 2 Speed battles' }
    ],
    rewards: [
      { type: 'xp', value: 100, description: '+100 XP' },
      { type: 'monster_unlock', value: 'bonus', description: 'Unlock chance bonus' }
    ],
    minLevel: 2
  },
  {
    id: 'strength-training',
    type: 'battle',
    title: 'Strength Training',
    description: 'Show off your raw power!',
    difficulty: 'medium',
    icon: '💪',
    objectiveTemplates: [
      { id: 'strength-wins', type: 'win_trait', target: 2, trait: 'strength', description: 'Win 2 Strength battles' }
    ],
    rewards: [
      { type: 'xp', value: 100, description: '+100 XP' },
      { type: 'monster_unlock', value: 'bonus', description: 'Unlock chance bonus' }
    ],
    minLevel: 2
  },
  {
    id: 'battle-ready',
    type: 'battle',
    title: 'Battle Ready',
    description: 'Dominate the arena!',
    difficulty: 'medium',
    icon: '⚔️',
    objectiveTemplates: [
      { id: 'win-3', type: 'win_battles', target: 3, description: 'Win 3 battles' }
    ],
    rewards: [
      { type: 'xp', value: 100, description: '+100 XP' }
    ],
    minLevel: 2
  },
  {
    id: 'prediction-pro',
    type: 'race',
    title: 'Prediction Pro',
    description: 'Your racing instincts are sharp!',
    difficulty: 'medium',
    icon: '🎯',
    objectiveTemplates: [
      { id: 'predict-2', type: 'correct_predictions', target: 2, description: 'Predict 2 races correctly' }
    ],
    rewards: [
      { type: 'xp', value: 100, description: '+100 XP' }
    ],
    minLevel: 2
  },

  // Hard challenges
  {
    id: 'purist',
    type: 'battle',
    title: 'The Purist',
    description: 'Win without any booster assistance!',
    difficulty: 'hard',
    icon: '🎖️',
    objectiveTemplates: [
      { id: 'no-boost-wins', type: 'no_booster', target: 3, description: 'Win 3 battles without boosters' }
    ],
    rewards: [
      { type: 'xp', value: 150, description: '+150 XP' },
      { type: 'monster_unlock', value: 'guaranteed', description: 'Guaranteed unlock' }
    ],
    minLevel: 3
  },
  {
    id: 'streak-master',
    type: 'mixed',
    title: 'Streak Master',
    description: 'Build an impressive winning streak!',
    difficulty: 'hard',
    icon: '🔥',
    objectiveTemplates: [
      { id: 'streak-3', type: 'streak', target: 3, description: 'Achieve a 3-win streak' }
    ],
    rewards: [
      { type: 'xp', value: 200, description: '+200 XP' },
      { type: 'monster_unlock', value: 'guaranteed', description: 'Guaranteed unlock' }
    ],
    minLevel: 4
  },
  {
    id: 'complete-warrior',
    type: 'mixed',
    title: 'Complete Warrior',
    description: 'Master both battle and prediction!',
    difficulty: 'hard',
    icon: '👑',
    objectiveTemplates: [
      { id: 'win-3', type: 'win_battles', target: 3, description: 'Win 3 battles' },
      { id: 'predict-2', type: 'correct_predictions', target: 2, description: 'Predict 2 races correctly' }
    ],
    rewards: [
      { type: 'xp', value: 200, description: '+200 XP' },
      { type: 'monster_unlock', value: 'guaranteed', description: 'Guaranteed unlock' }
    ],
    minLevel: 4
  }
];

// Terrain-specific challenges (generated dynamically)
export const TERRAIN_CHALLENGES: Record<string, { title: string; description: string; icon: string }> = {
  city: { title: 'Urban Legend', description: 'Conquer the city battlegrounds!', icon: '🏙️' },
  island: { title: 'Island Champion', description: 'Rule the tropical arena!', icon: '🏝️' },
  ocean: { title: 'Ocean Master', description: 'Dominate the deep waters!', icon: '🌊' },
  volcano: { title: 'Volcanic Victory', description: 'Survive the fiery terrain!', icon: '🌋' },
  ruins: { title: 'Ancient Conqueror', description: 'Reclaim the ancient ruins!', icon: '🏛️' }
};

// Streak milestone rewards
export const STREAK_MILESTONES = [
  { days: 3, xpBonus: 25, description: '+25% XP bonus' },
  { days: 7, xpBonus: 50, description: 'Guaranteed monster unlock' },
  { days: 14, xpBonus: 100, description: 'Rare monster unlock chance' },
  { days: 30, xpBonus: 200, description: 'Legendary unlock chance' }
];
