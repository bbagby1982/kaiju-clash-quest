import { useState, useEffect, useCallback } from 'react';
import { GameProgress, UnlockRequirement, MonsterMasteryProgress, DailyChallenge, DailyChallengeProgress } from '@/types/game';
import { MONSTERS, PLAYABLE_MONSTERS } from '@/data/monsters';
import { 
  generateDailyChallenge, 
  getTodayDate, 
  isChallengeExpired, 
  isChallengeComplete,
  updateChallengeAfterBattle,
  updateChallengeAfterRace,
  calculateStreakBonusXP
} from '@/lib/dailyChallengeGenerator';

const STORAGE_KEY = 'godzilla-vs-progress';

const DEFAULT_CHALLENGE_PROGRESS: DailyChallengeProgress = {
  currentChallenge: null,
  lastRefreshDate: '',
  challengeStreak: 0,
  bestChallengeStreak: 0,
  completedChallengesTotal: 0,
  todayCompleted: false,
};

const DEFAULT_PROGRESS: GameProgress = {
  unlockedMonsters: ['showa-godzilla', 'king-kong'],
  wins: 0,
  losses: 0,
  racesWon: 0,
  racesLost: 0,
  totalBattles: 0,
  totalRaces: 0,
  playerLevel: 1,
  defeatedMonsters: [],
  traitWins: {},
  terrainWins: {},
  noBoosterWins: 0,
  unlockedBoosters: [],
  discoveredEncyclopedia: ['showa-godzilla', 'king-kong'],
  // Advanced progression
  monsterMastery: {},
  unlockedThemes: [],
  completedTrials: [],
  discoveryProgress: {},
  uniqueMonstersUsed: ['showa-godzilla', 'king-kong'],
  consecutiveWins: 0,
  consecutiveLosses: 0,
  totalMonstersUnlocked: 2,
  dailyChallenge: DEFAULT_CHALLENGE_PROGRESS,
};

// Theme definitions
const MONSTER_THEMES: Record<string, string[]> = {
  fire: ['heisei-godzilla', 'burning-godzilla', 'evolved-godzilla'],
  ocean: ['showa-godzilla', 'monsterverse-godzilla', 'sharkgera'],
  strength: ['king-kong', 'kong-armed', 'monsterverse-godzilla'],
  speed: ['storm-titan', 'crystal-serpent', 'sharkgera'],
  ancient: ['monsterverse-godzilla', 'showa-godzilla', 'crystal-serpent'],
};

// Mastery requirements
const MASTERY_REQUIREMENTS = {
  battlesWon: 5,
  terrainsRequired: 3,
  abilitiesUsed: 3,
};

export function useGameProgress() {
  const [progress, setProgress] = useState<GameProgress>(DEFAULT_PROGRESS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...DEFAULT_PROGRESS, ...parsed };
        // Migration: ensure starter monsters are always unlocked
        const starters = ['showa-godzilla', 'king-kong'];
        for (const id of starters) {
          if (!merged.unlockedMonsters.includes(id)) {
            merged.unlockedMonsters.push(id);
          }
          if (!merged.discoveredEncyclopedia.includes(id)) {
            merged.discoveredEncyclopedia.push(id);
          }
          if (!merged.uniqueMonstersUsed.includes(id)) {
            merged.uniqueMonstersUsed.push(id);
          }
        }
        merged.totalMonstersUnlocked = Math.max(merged.totalMonstersUnlocked, merged.unlockedMonsters.length);
        setProgress(merged);
      } catch {
        setProgress(DEFAULT_PROGRESS);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  }, [progress, isLoaded]);

  // Check if a specific requirement is met
  const checkRequirement = useCallback((req: UnlockRequirement, prog: GameProgress): boolean => {
    switch (req.type) {
      case 'battles_won':
        return prog.wins >= req.target;
      case 'races_won':
        return prog.racesWon >= req.target;
      case 'defeat_monster':
        return prog.defeatedMonsters.includes(req.monsterId || '');
      case 'trait_wins':
        return (prog.traitWins[req.trait || ''] || 0) >= req.target;
      case 'terrain_wins':
        return (prog.terrainWins[req.terrain || ''] || 0) >= req.target;
      case 'player_level':
        return prog.playerLevel >= req.target;
      case 'no_booster_wins':
        return prog.noBoosterWins >= req.target;
      case 'monster_mastery':
        const mastery = prog.monsterMastery[req.monsterId || ''];
        return mastery?.isMastered || false;
      case 'theme_gate':
        return prog.unlockedThemes.includes(req.theme || '');
      case 'special_trial':
        return prog.completedTrials.includes(req.trialId || '');
      case 'unique_monsters_used':
        return prog.uniqueMonstersUsed.length >= req.target;
      case 'consecutive_wins':
        return prog.consecutiveWins >= req.target;
      case 'discovery':
        return (prog.discoveryProgress[req.discoveryType || ''] || 0) >= req.target;
      default:
        return false;
    }
  }, []);

  // Check if monster can be unlocked
  const canUnlockMonster = useCallback((monsterId: string): boolean => {
    const monster = MONSTERS.find(m => m.id === monsterId);
    if (!monster || !monster.unlockRequirements) return true;
    if (progress.unlockedMonsters.includes(monsterId)) return true;
    
    return monster.unlockRequirements.every(req => checkRequirement(req, progress));
  }, [progress, checkRequirement]);

  // Get list of newly unlockable monsters
  const getNewlyUnlockableMonsters = useCallback((): string[] => {
    return MONSTERS
      .filter(m => !progress.unlockedMonsters.includes(m.id))
      .filter(m => canUnlockMonster(m.id))
      .map(m => m.id);
  }, [progress.unlockedMonsters, canUnlockMonster]);

  // Unlock a specific monster
  const unlockMonster = useCallback((monsterId: string): boolean => {
    if (progress.unlockedMonsters.includes(monsterId)) return false;
    if (!canUnlockMonster(monsterId)) return false;

    setProgress(prev => ({
      ...prev,
      unlockedMonsters: [...prev.unlockedMonsters, monsterId],
      discoveredEncyclopedia: prev.discoveredEncyclopedia.includes(monsterId) 
        ? prev.discoveredEncyclopedia 
        : [...prev.discoveredEncyclopedia, monsterId],
      totalMonstersUnlocked: prev.totalMonstersUnlocked + 1,
    }));

    return true;
  }, [progress.unlockedMonsters, canUnlockMonster]);

  const unlockRandomMonster = useCallback((): string | null => {
    // After 10 monsters, only unlock if requirements are met
    if (progress.totalMonstersUnlocked >= 10) {
      const unlockable = getNewlyUnlockableMonsters();
      if (unlockable.length === 0) return null;
      
      const toUnlock = unlockable[Math.floor(Math.random() * unlockable.length)];
      unlockMonster(toUnlock);
      return toUnlock;
    }

    // Early game: more random unlocks — only from monsters with artwork
    const lockedMonsters = PLAYABLE_MONSTERS.filter(
      m => !progress.unlockedMonsters.includes(m.id)
    );
    
    if (lockedMonsters.length === 0) return null;

    // Weight towards common/rare monsters first
    const weighted = lockedMonsters.sort((a, b) => {
      const order = { common: 0, rare: 1, legendary: 2 };
      return order[a.rarity] - order[b.rarity];
    });

    // 60% chance common/rare, 40% any
    const pool = Math.random() < 0.6 
      ? weighted.filter(m => m.rarity !== 'legendary')
      : weighted;

    const toUnlock = pool.length > 0 
      ? pool[Math.floor(Math.random() * pool.length)]
      : weighted[0];

    // Check if requirements are met (even in early game, some monsters have requirements)
    if (toUnlock.unlockRequirements && !canUnlockMonster(toUnlock.id)) {
      // Find one that can be unlocked
      const unlockable = lockedMonsters.filter(m => canUnlockMonster(m.id));
      if (unlockable.length === 0) return null;
      const fallback = unlockable[Math.floor(Math.random() * unlockable.length)];
      unlockMonster(fallback.id);
      return fallback.id;
    }

    unlockMonster(toUnlock.id);
    return toUnlock.id;
  }, [progress.unlockedMonsters, progress.totalMonstersUnlocked, canUnlockMonster, getNewlyUnlockableMonsters, unlockMonster]);

  // Update monster mastery progress
  const updateMonsterMastery = useCallback((monsterId: string, terrain: string) => {
    setProgress(prev => {
      const currentMastery: MonsterMasteryProgress = prev.monsterMastery[monsterId] || {
        battlesWon: 0,
        terrainsWonOn: [],
        abilitiesUsed: 0,
        isMastered: false,
      };

      const newTerrains = currentMastery.terrainsWonOn.includes(terrain)
        ? currentMastery.terrainsWonOn
        : [...currentMastery.terrainsWonOn, terrain];

      const newBattlesWon = currentMastery.battlesWon + 1;
      const newAbilitiesUsed = currentMastery.abilitiesUsed + 1;

      const isMastered = 
        newBattlesWon >= MASTERY_REQUIREMENTS.battlesWon &&
        newTerrains.length >= MASTERY_REQUIREMENTS.terrainsRequired;

      return {
        ...prev,
        monsterMastery: {
          ...prev.monsterMastery,
          [monsterId]: {
            battlesWon: newBattlesWon,
            terrainsWonOn: newTerrains,
            abilitiesUsed: newAbilitiesUsed,
            isMastered,
          },
        },
      };
    });
  }, []);

  // Check and unlock themes
  const checkThemeUnlocks = useCallback((prog: GameProgress) => {
    const newThemes: string[] = [];
    
    for (const [theme, monsters] of Object.entries(MONSTER_THEMES)) {
      if (prog.unlockedThemes.includes(theme)) continue;
      
      // Theme unlocks when 2 of the theme's monsters are unlocked
      const unlockedCount = monsters.filter(m => prog.unlockedMonsters.includes(m)).length;
      if (unlockedCount >= 2) {
        newThemes.push(theme);
      }
    }

    if (newThemes.length > 0) {
      setProgress(prev => ({
        ...prev,
        unlockedThemes: [...prev.unlockedThemes, ...newThemes],
      }));
    }
  }, []);

  const recordBattleResult = useCallback((
    won: boolean, 
    opponentId?: string, 
    trait?: string, 
    terrain?: string, 
    usedBooster?: boolean,
    playerMonsterId?: string
  ) => {
    setProgress(prev => {
      const newProgress = {
        ...prev,
        wins: won ? prev.wins + 1 : prev.wins,
        losses: won ? prev.losses : prev.losses + 1,
        totalBattles: prev.totalBattles + 1,
        consecutiveWins: won ? prev.consecutiveWins + 1 : 0,
        consecutiveLosses: won ? 0 : prev.consecutiveLosses + 1,
      };

      // Track unique monsters used
      if (playerMonsterId && !prev.uniqueMonstersUsed.includes(playerMonsterId)) {
        newProgress.uniqueMonstersUsed = [...prev.uniqueMonstersUsed, playerMonsterId];
      }

      // Track defeated monsters
      if (won && opponentId && !prev.defeatedMonsters.includes(opponentId)) {
        newProgress.defeatedMonsters = [...prev.defeatedMonsters, opponentId];
      }

      // Track trait wins
      if (won && trait) {
        newProgress.traitWins = {
          ...prev.traitWins,
          [trait]: (prev.traitWins[trait] || 0) + 1,
        };
      }

      // Track terrain wins
      if (won && terrain) {
        newProgress.terrainWins = {
          ...prev.terrainWins,
          [terrain]: (prev.terrainWins[terrain] || 0) + 1,
        };
      }

      // Track no-booster wins
      if (won && !usedBooster) {
        newProgress.noBoosterWins = prev.noBoosterWins + 1;
      }

      // Discovery progress: lose then win
      if (won && prev.consecutiveLosses >= 2) {
        newProgress.discoveryProgress = {
          ...prev.discoveryProgress,
          lose_then_win: (prev.discoveryProgress.lose_then_win || 0) + 1,
        };
      }

      // Discovery progress: no booster streak
      if (won && !usedBooster && prev.noBoosterWins >= 2) {
        newProgress.discoveryProgress = {
          ...prev.discoveryProgress,
          no_booster_streak: (prev.discoveryProgress.no_booster_streak || 0) + 1,
        };
      }

      // Check for underdog victory (beating legendary with common)
      if (won && opponentId) {
        const opponent = MONSTERS.find(m => m.id === opponentId);
        const player = MONSTERS.find(m => m.id === playerMonsterId);
        if (opponent?.rarity === 'legendary' && player?.rarity === 'common') {
          newProgress.discoveryProgress = {
            ...prev.discoveryProgress,
            underdog_victory: (prev.discoveryProgress.underdog_victory || 0) + 1,
          };
        }
      }

      // Calculate player level
      const totalWins = newProgress.wins + newProgress.racesWon;
      newProgress.playerLevel = Math.floor(totalWins / 3) + 1;

      return newProgress;
    });

    // Update mastery if won
    if (won && playerMonsterId && terrain) {
      updateMonsterMastery(playerMonsterId, terrain);
    }

    // Check theme unlocks
    checkThemeUnlocks(progress);
  }, [updateMonsterMastery, checkThemeUnlocks, progress]);

  const recordRaceResult = useCallback((won: boolean, terrain?: string, playerMonsterId?: string) => {
    setProgress(prev => {
      const newProgress = {
        ...prev,
        racesWon: won ? prev.racesWon + 1 : prev.racesWon,
        racesLost: won ? prev.racesLost : prev.racesLost + 1,
        totalRaces: prev.totalRaces + 1,
      };

      // Track terrain wins for races too
      if (won && terrain) {
        newProgress.terrainWins = {
          ...prev.terrainWins,
          [terrain]: (prev.terrainWins[terrain] || 0) + 1,
        };
      }

      // Track unique monsters used
      if (playerMonsterId && !prev.uniqueMonstersUsed.includes(playerMonsterId)) {
        newProgress.uniqueMonstersUsed = [...prev.uniqueMonstersUsed, playerMonsterId];
      }

      // Check all terrains discovery
      const allTerrains = ['city', 'island', 'ocean', 'volcano', 'ruins'];
      const wonTerrains = Object.keys(newProgress.terrainWins);
      if (allTerrains.every(t => wonTerrains.includes(t))) {
        newProgress.discoveryProgress = {
          ...prev.discoveryProgress,
          all_terrains: 1,
        };
      }

      return newProgress;
    });
  }, []);

  const completeTrial = useCallback((trialId: string) => {
    setProgress(prev => ({
      ...prev,
      completedTrials: [...prev.completedTrials, trialId],
    }));
  }, []);

  // Daily Challenge Functions
  const refreshDailyChallenge = useCallback((): DailyChallenge => {
    const today = getTodayDate();
    const currentChallengeProgress = progress.dailyChallenge || DEFAULT_CHALLENGE_PROGRESS;
    
    // Check if we need a new challenge
    if (currentChallengeProgress.lastRefreshDate !== today || !currentChallengeProgress.currentChallenge) {
      const newChallenge = generateDailyChallenge(progress);
      
      // Check if yesterday was completed for streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const streakContinues = currentChallengeProgress.lastRefreshDate === yesterdayStr && 
                              currentChallengeProgress.todayCompleted;
      
      const newStreak = streakContinues ? currentChallengeProgress.challengeStreak : 0;
      
      setProgress(prev => ({
        ...prev,
        dailyChallenge: {
          currentChallenge: newChallenge,
          lastRefreshDate: today,
          challengeStreak: newStreak,
          bestChallengeStreak: Math.max(prev.dailyChallenge?.bestChallengeStreak || 0, newStreak),
          completedChallengesTotal: prev.dailyChallenge?.completedChallengesTotal || 0,
          todayCompleted: false,
        },
      }));
      
      return newChallenge;
    }
    
    return currentChallengeProgress.currentChallenge!;
  }, [progress]);

  const updateDailyChallengeAfterBattle = useCallback((
    won: boolean,
    trait?: string,
    terrain?: string,
    usedBooster?: boolean
  ) => {
    if (!won) return;
    
    setProgress(prev => {
      const challengeProgress = prev.dailyChallenge;
      if (!challengeProgress?.currentChallenge || challengeProgress.todayCompleted) {
        return prev;
      }
      
      // Check if expired
      if (isChallengeExpired(challengeProgress.currentChallenge)) {
        return prev;
      }
      
      const updatedChallenge = updateChallengeAfterBattle(
        challengeProgress.currentChallenge,
        won,
        trait,
        terrain,
        usedBooster,
        prev.consecutiveWins + 1
      );
      
      const isComplete = isChallengeComplete(updatedChallenge);
      
      return {
        ...prev,
        dailyChallenge: {
          ...challengeProgress,
          currentChallenge: updatedChallenge,
          todayCompleted: isComplete,
          challengeStreak: isComplete ? challengeProgress.challengeStreak + 1 : challengeProgress.challengeStreak,
          bestChallengeStreak: isComplete 
            ? Math.max(challengeProgress.bestChallengeStreak, challengeProgress.challengeStreak + 1)
            : challengeProgress.bestChallengeStreak,
          completedChallengesTotal: isComplete 
            ? challengeProgress.completedChallengesTotal + 1 
            : challengeProgress.completedChallengesTotal,
        },
      };
    });
  }, []);

  const updateDailyChallengeAfterRace = useCallback((predictionCorrect: boolean) => {
    if (!predictionCorrect) return;
    
    setProgress(prev => {
      const challengeProgress = prev.dailyChallenge;
      if (!challengeProgress?.currentChallenge || challengeProgress.todayCompleted) {
        return prev;
      }
      
      if (isChallengeExpired(challengeProgress.currentChallenge)) {
        return prev;
      }
      
      const updatedChallenge = updateChallengeAfterRace(
        challengeProgress.currentChallenge,
        predictionCorrect,
        prev.consecutiveWins + 1
      );
      
      const isComplete = isChallengeComplete(updatedChallenge);
      
      return {
        ...prev,
        dailyChallenge: {
          ...challengeProgress,
          currentChallenge: updatedChallenge,
          todayCompleted: isComplete,
          challengeStreak: isComplete ? challengeProgress.challengeStreak + 1 : challengeProgress.challengeStreak,
          bestChallengeStreak: isComplete 
            ? Math.max(challengeProgress.bestChallengeStreak, challengeProgress.challengeStreak + 1)
            : challengeProgress.bestChallengeStreak,
          completedChallengesTotal: isComplete 
            ? challengeProgress.completedChallengesTotal + 1 
            : challengeProgress.completedChallengesTotal,
        },
      };
    });
  }, []);

  const getDailyChallengeStatus = useCallback((): 'available' | 'in_progress' | 'completed' | 'expired' => {
    const challengeProgress = progress.dailyChallenge;
    if (!challengeProgress?.currentChallenge) return 'available';
    if (challengeProgress.todayCompleted) return 'completed';
    if (isChallengeExpired(challengeProgress.currentChallenge)) return 'expired';
    
    const hasProgress = challengeProgress.currentChallenge.objectives.some(obj => obj.current > 0);
    return hasProgress ? 'in_progress' : 'available';
  }, [progress.dailyChallenge]);

  const resetProgress = useCallback(() => {
    setProgress(DEFAULT_PROGRESS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    progress,
    setProgress,
    isLoaded,
    unlockRandomMonster,
    unlockMonster,
    canUnlockMonster,
    getNewlyUnlockableMonsters,
    recordBattleResult,
    recordRaceResult,
    completeTrial,
    resetProgress,
    // Daily challenge functions
    refreshDailyChallenge,
    updateDailyChallengeAfterBattle,
    updateDailyChallengeAfterRace,
    getDailyChallengeStatus,
  };
}
