import { DailyChallenge, ChallengeObjective, GameProgress } from '@/types/game';
import { CHALLENGE_TEMPLATES, TERRAIN_CHALLENGES, ChallengeTemplate } from '@/data/dailyChallenges';

// Simple hash function to get consistent daily seed
function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Get milliseconds until midnight
export function getTimeUntilReset(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000)
  };
}

// Generate a daily challenge based on player level and date
export function generateDailyChallenge(progress: GameProgress): DailyChallenge {
  const today = getTodayDate();
  const seed = hashDate(today);
  
  // Filter templates by player level
  const availableTemplates = CHALLENGE_TEMPLATES.filter(t => t.minLevel <= progress.playerLevel);
  
  // Use seed to pick consistent template for the day
  const templateIndex = seed % availableTemplates.length;
  const template = availableTemplates[templateIndex];
  
  // Maybe add terrain-specific twist on medium+ difficulty
  const addTerrainTwist = progress.playerLevel >= 3 && (seed % 3 === 0);
  let finalTemplate: ChallengeTemplate = { ...template };
  
  if (addTerrainTwist && template.type === 'battle') {
    const terrains = Object.keys(TERRAIN_CHALLENGES);
    const terrainIndex = seed % terrains.length;
    const terrain = terrains[terrainIndex];
    const terrainInfo = TERRAIN_CHALLENGES[terrain];
    
    finalTemplate = {
      ...template,
      title: terrainInfo.title,
      description: terrainInfo.description,
      icon: terrainInfo.icon,
      objectiveTemplates: [
        ...template.objectiveTemplates,
        { id: `terrain-${terrain}`, type: 'win_terrain', target: 2, terrain, description: `Win 2 ${terrain} battles` }
      ]
    };
  }
  
  // Create objectives with current = 0
  const objectives: ChallengeObjective[] = finalTemplate.objectiveTemplates.map(obj => ({
    ...obj,
    current: 0
  }));
  
  // Calculate expiry (midnight tonight)
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  
  return {
    id: `${finalTemplate.id}-${today}`,
    date: today,
    type: finalTemplate.type,
    title: finalTemplate.title,
    description: finalTemplate.description,
    objectives,
    rewards: finalTemplate.rewards,
    difficulty: finalTemplate.difficulty,
    icon: finalTemplate.icon,
    expiresAt: midnight.getTime()
  };
}

// Check if challenge has expired
export function isChallengeExpired(challenge: DailyChallenge): boolean {
  return Date.now() >= challenge.expiresAt;
}

// Check if all objectives are complete
export function isChallengeComplete(challenge: DailyChallenge): boolean {
  return challenge.objectives.every(obj => obj.current >= obj.target);
}

// Update challenge progress after a battle
export function updateChallengeAfterBattle(
  challenge: DailyChallenge,
  won: boolean,
  trait?: string,
  terrain?: string,
  usedBooster?: boolean,
  currentStreak?: number
): DailyChallenge {
  if (!won) return challenge;
  
  const updatedObjectives = challenge.objectives.map(obj => {
    let newCurrent = obj.current;
    
    switch (obj.type) {
      case 'win_battles':
        newCurrent = Math.min(obj.current + 1, obj.target);
        break;
      case 'win_trait':
        if (trait && obj.trait === trait) {
          newCurrent = Math.min(obj.current + 1, obj.target);
        }
        break;
      case 'win_terrain':
        if (terrain && obj.terrain === terrain) {
          newCurrent = Math.min(obj.current + 1, obj.target);
        }
        break;
      case 'no_booster':
        if (!usedBooster) {
          newCurrent = Math.min(obj.current + 1, obj.target);
        }
        break;
      case 'streak':
        if (currentStreak && currentStreak >= obj.target) {
          newCurrent = obj.target;
        }
        break;
    }
    
    return { ...obj, current: newCurrent };
  });
  
  return { ...challenge, objectives: updatedObjectives };
}

// Update challenge progress after a race prediction
export function updateChallengeAfterRace(
  challenge: DailyChallenge,
  predictionCorrect: boolean,
  currentStreak?: number
): DailyChallenge {
  if (!predictionCorrect) return challenge;
  
  const updatedObjectives = challenge.objectives.map(obj => {
    let newCurrent = obj.current;
    
    switch (obj.type) {
      case 'correct_predictions':
      case 'win_races':
        newCurrent = Math.min(obj.current + 1, obj.target);
        break;
      case 'streak':
        if (currentStreak && currentStreak >= obj.target) {
          newCurrent = obj.target;
        }
        break;
    }
    
    return { ...obj, current: newCurrent };
  });
  
  return { ...challenge, objectives: updatedObjectives };
}

// Calculate XP with streak bonus
export function calculateStreakBonusXP(baseXP: number, streakDays: number): number {
  if (streakDays >= 30) return Math.floor(baseXP * 3);
  if (streakDays >= 14) return Math.floor(baseXP * 2);
  if (streakDays >= 7) return Math.floor(baseXP * 1.5);
  if (streakDays >= 3) return Math.floor(baseXP * 1.25);
  return baseXP;
}
