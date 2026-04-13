import { useState, useCallback, useMemo, useEffect } from 'react';
import { GameTab, Monster, Booster, GameMap } from '@/types/game';
import { GameLayout } from '@/components/game/GameLayout';
import { MonsterCard } from '@/components/game/MonsterCard';
import { BattleReadyButton } from '@/components/game/BattleReadyButton';
import { BoosterSelection } from '@/components/game/BoosterSelection';
import { MonsterProfile } from '@/components/game/MonsterProfile';
import { EncyclopediaEntry } from '@/components/game/EncyclopediaEntry';
import { BattleSetup } from '@/components/game/BattleSetup';
import { BattleFocusSelection, BattleFocus } from '@/components/game/BattleFocusSelection';
import { BattlePreview } from '@/components/game/BattlePreview';
import { BattleSimulation } from '@/components/game/BattleSimulation';
import { RaceSetup } from '@/components/game/RaceSetup';
import { SpectatorRaceTrack } from '@/components/game/SpectatorRaceTrack';
import { DailyChallengeCard } from '@/components/game/DailyChallengeCard';
import { ChallengeCompletedModal } from '@/components/game/ChallengeCompletedModal';
import { CloudSavePanel } from '@/components/game/CloudSavePanel';
import { useGameProgress } from '@/hooks/useGameProgress';
import { useCloudSave } from '@/hooks/useCloudSave';
import { MONSTERS, PLAYABLE_MONSTERS } from '@/data/monsters';
import { getRandomMap, GAME_MAPS } from '@/data/maps';
import { Trophy, Swords, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type GameState = 'menu' | 'setup' | 'booster' | 'focus' | 'preview' | 'battle' | 'race-setup' | 'race';

const Index = () => {
  const [activeTab, setActiveTab] = useState<GameTab>('battle');
  const [gameState, setGameState] = useState<GameState>('menu');
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);
  const [opponent, setOpponent] = useState<Monster | null>(null);
  const [raceMonsters, setRaceMonsters] = useState<Monster[]>([]);
  const [predictedWinner, setPredictedWinner] = useState<Monster | null>(null);
  const [currentMap, setCurrentMap] = useState(getRandomMap());
  const [selectedBooster, setSelectedBooster] = useState<Booster | null>(null);
  const [battleFocus, setBattleFocus] = useState<BattleFocus | null>(null);
  const [profileMonster, setProfileMonster] = useState<Monster | null>(null);
  const [showChallengeComplete, setShowChallengeComplete] = useState(false);
  const [lastCompletedChallenge, setLastCompletedChallenge] = useState<{ challenge: any; streak: number } | null>(null);
  
  const { 
    progress, 
    setProgress,
    unlockRandomMonster, 
    recordBattleResult, 
    recordRaceResult,
    refreshDailyChallenge,
    updateDailyChallengeAfterBattle,
    updateDailyChallengeAfterRace
  } = useGameProgress();
  const cloudSave = useCloudSave();
  const { toast } = useToast();

  // Auto-save to cloud after battles/races (when progress changes meaningfully)
  const lastBattleCount = useState(progress.totalBattles + progress.totalRaces)[0];
  useEffect(() => {
    const currentCount = progress.totalBattles + progress.totalRaces;
    if (cloudSave.isLoggedIn && currentCount > 0 && currentCount !== lastBattleCount) {
      cloudSave.saveToCloud(progress);
    }
  }, [progress.totalBattles, progress.totalRaces]);

  const handleCloudLogin = useCallback(async (name: string, code: string) => {
    const result = await cloudSave.login(name, code);
    if (result.success && result.progress && !result.isNew) {
      setProgress(result.progress);
      toast({ title: "☁️ Cloud Save Loaded!", description: `Welcome back, ${name}! Your monsters are here.` });
    } else if (result.success && result.isNew) {
      // New player — save current progress to cloud
      await cloudSave.saveToCloud(progress);
      toast({ title: "☁️ Cloud Save Connected!", description: `Hi ${name}! Your progress will sync across devices.` });
    }
    return result;
  }, [cloudSave, setProgress, progress, toast]);

  const handleCloudSave = useCallback(() => {
    cloudSave.saveToCloud(progress).then(ok => {
      if (ok) toast({ title: "☁️ Saved!", description: "Progress saved to the cloud." });
    });
  }, [cloudSave, progress, toast]);

  const handleCloudLoad = useCallback(async () => {
    const loaded = await cloudSave.loadFromCloud();
    if (loaded) {
      setProgress(loaded);
      toast({ title: "☁️ Loaded!", description: "Cloud save restored." });
    }
  }, [cloudSave, setProgress, toast]);

  // Sort monsters alphabetically — only show ones with real artwork
  const sortedMonsters = useMemo(() => {
    return [...PLAYABLE_MONSTERS].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const handleBattleSetupComplete = useCallback((playerMonster: Monster, opponentMonster: Monster) => {
    setSelectedMonster(playerMonster);
    setOpponent(opponentMonster);
    setGameState('booster');
  }, []);

  const handleBoosterConfirm = useCallback(() => {
    if (!selectedMonster) return;
    const map = getRandomMap();
    setCurrentMap(map);
    setGameState('focus');
  }, [selectedMonster]);

  const handleFocusSelect = useCallback((focus: BattleFocus) => {
    setBattleFocus(focus);
    setGameState('preview');
  }, []);

  const handleStartBattle = useCallback(() => {
    setGameState('battle');
  }, []);

  const handleStartRaceSetup = useCallback(() => {
    setGameState('race-setup');
  }, []);

  const handleRaceStart = useCallback((selectedMonsters: Monster[], predicted: Monster, map: GameMap) => {
    setRaceMonsters(selectedMonsters);
    setPredictedWinner(predicted);
    setCurrentMap(map);
    setGameState('race');
  }, []);

  const handleBattleEnd = useCallback((won: boolean, opponentId?: string, trait?: string) => {
    const wasCompleted = progress.dailyChallenge?.todayCompleted || false;
    
    recordBattleResult(won, opponentId, trait, currentMap.terrain, !selectedBooster, selectedMonster?.id);
    
    // Update daily challenge progress
    if (won) {
      updateDailyChallengeAfterBattle(true, trait, currentMap.terrain, !!selectedBooster);
    }
    
    if (won) {
      const unlockedId = unlockRandomMonster();
      if (unlockedId) {
        const monster = MONSTERS.find(m => m.id === unlockedId);
        toast({
          title: "🎉 New Monster Unlocked!",
          description: `${monster?.name} has joined your roster!`,
        });
      }
    }
    
    // Check if challenge just completed
    setTimeout(() => {
      if (!wasCompleted && progress.dailyChallenge?.todayCompleted && progress.dailyChallenge?.currentChallenge) {
        setLastCompletedChallenge({
          challenge: progress.dailyChallenge.currentChallenge,
          streak: progress.dailyChallenge.challengeStreak
        });
        setShowChallengeComplete(true);
      }
    }, 100);
    
    setGameState('menu');
    setSelectedMonster(null);
    setSelectedBooster(null);
    setBattleFocus(null);
    setOpponent(null);
  }, [recordBattleResult, unlockRandomMonster, toast, currentMap, selectedBooster, selectedMonster, updateDailyChallengeAfterBattle, progress.dailyChallenge]);

  const handleRaceEnd = useCallback((winner: Monster, placements: Monster[], predictionCorrect: boolean) => {
    const wasCompleted = progress.dailyChallenge?.todayCompleted || false;
    
    // Count as a win if prediction was correct
    recordRaceResult(predictionCorrect, currentMap.terrain, predictedWinner?.id);
    
    // Update daily challenge progress
    if (predictionCorrect) {
      updateDailyChallengeAfterRace(true);
    }
    
    if (predictionCorrect) {
      const unlockedId = unlockRandomMonster();
      if (unlockedId) {
        const monster = MONSTERS.find(m => m.id === unlockedId);
        toast({
          title: "🎉 New Monster Unlocked!",
          description: `${monster?.name} has joined your roster!`,
        });
      }
    }
    
    // Check if challenge just completed
    setTimeout(() => {
      if (!wasCompleted && progress.dailyChallenge?.todayCompleted && progress.dailyChallenge?.currentChallenge) {
        setLastCompletedChallenge({
          challenge: progress.dailyChallenge.currentChallenge,
          streak: progress.dailyChallenge.challengeStreak
        });
        setShowChallengeComplete(true);
      }
    }, 100);
    
    setGameState('menu');
    setRaceMonsters([]);
    setPredictedWinner(null);
  }, [recordRaceResult, unlockRandomMonster, toast, currentMap, predictedWinner, updateDailyChallengeAfterRace, progress.dailyChallenge]);

  const resetSelection = useCallback(() => {
    setGameState('menu');
    setSelectedMonster(null);
    setSelectedBooster(null);
    setBattleFocus(null);
    setOpponent(null);
    setRaceMonsters([]);
    setPredictedWinner(null);
  }, []);

  // Monster Profile View
  if (profileMonster) {
    return (
      <MonsterProfile
        monster={profileMonster}
        isUnlocked={progress.unlockedMonsters.includes(profileMonster.id)}
        progress={progress}
        onClose={() => setProfileMonster(null)}
      />
    );
  }

  // Battle Setup
  if (gameState === 'setup') {
    return (
      <BattleSetup
        unlockedMonsterIds={progress.unlockedMonsters}
        onSetupComplete={handleBattleSetupComplete}
        onBack={resetSelection}
      />
    );
  }

  // Battle Focus Selection
  if (gameState === 'focus' && selectedMonster && opponent) {
    return (
      <BattleFocusSelection
        playerMonster={selectedMonster}
        opponent={opponent}
        onSelectFocus={handleFocusSelect}
        onBack={() => setGameState('booster')}
      />
    );
  }

  // Battle Preview
  if (gameState === 'preview' && selectedMonster && opponent && battleFocus) {
    return (
      <BattlePreview
        playerMonster={selectedMonster}
        opponentMonster={opponent}
        battleFocus={battleFocus}
        map={currentMap}
        booster={selectedBooster}
        onStartBattle={handleStartBattle}
        onBack={() => setGameState('focus')}
      />
    );
  }

  // Battle in progress
  if (gameState === 'battle' && selectedMonster && opponent && battleFocus) {
    return (
      <BattleSimulation
        playerMonster={selectedMonster}
        opponentMonster={opponent}
        battleFocus={battleFocus}
        map={currentMap}
        booster={selectedBooster}
        onBattleEnd={handleBattleEnd}
      />
    );
  }

  // Race setup
  if (gameState === 'race-setup') {
    return (
      <RaceSetup
        unlockedMonsterIds={progress.unlockedMonsters}
        availableMaps={GAME_MAPS}
        onStartRace={handleRaceStart}
        onBack={resetSelection}
      />
    );
  }

  // Race in progress (spectator mode)
  if (gameState === 'race' && raceMonsters.length >= 2 && predictedWinner) {
    return (
      <SpectatorRaceTrack
        racers={raceMonsters}
        predictedWinner={predictedWinner}
        map={currentMap}
        onRaceEnd={handleRaceEnd}
      />
    );
  }

  return (
    <GameLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="p-4 pb-20 animate-fade-in">
        {/* Challenge Completed Modal */}
        {showChallengeComplete && lastCompletedChallenge && (
          <ChallengeCompletedModal
            challenge={lastCompletedChallenge.challenge}
            streak={lastCompletedChallenge.streak}
            onClose={() => setShowChallengeComplete(false)}
          />
        )}

        {/* Battle Tab */}
        {activeTab === 'battle' && (
          <div className="space-y-6">
            {/* Cloud Save */}
            <CloudSavePanel
              isLoggedIn={cloudSave.isLoggedIn}
              playerName={cloudSave.playerName}
              isSaving={cloudSave.isSaving}
              isLoading={cloudSave.isLoading}
              lastSynced={cloudSave.lastSynced}
              error={cloudSave.error}
              onLogin={handleCloudLogin}
              onSave={handleCloudSave}
              onLoad={handleCloudLoad}
              onLogout={cloudSave.logout}
              onCloudProgressLoaded={setProgress}
            />

            {/* Daily Challenge Card */}
            <DailyChallengeCard 
              challengeProgress={progress.dailyChallenge} 
              onRefresh={refreshDailyChallenge}
            />

            <div className="text-center space-y-2">
              <Swords className="w-12 h-12 mx-auto text-primary" />
              <h2 className="text-2xl font-orbitron font-bold">Battle Mode</h2>
              <p className="text-muted-foreground">Select your monster and fight!</p>
              <p className="text-xs text-lightning">Level {progress.playerLevel}</p>
            </div>
            
            {gameState === 'booster' && selectedMonster ? (
              <BoosterSelection
                progress={progress}
                onSelect={setSelectedBooster}
                onConfirm={handleBoosterConfirm}
              />
            ) : (
              <div className="text-center">
                <BattleReadyButton onClick={() => setGameState('setup')} label="Start Battle" />
              </div>
            )}

            <div className="flex justify-center gap-8 text-center pt-4">
              <div><span className="text-2xl font-orbitron text-primary">{progress.wins}</span><p className="text-xs text-muted-foreground">Wins</p></div>
              <div><span className="text-2xl font-orbitron text-destructive">{progress.losses}</span><p className="text-xs text-muted-foreground">Losses</p></div>
            </div>
          </div>
        )}

        {/* Race Tab */}
        {activeTab === 'race' && (
          <div className="space-y-6">
            {/* Daily Challenge Card */}
            <DailyChallengeCard 
              challengeProgress={progress.dailyChallenge} 
              onRefresh={refreshDailyChallenge}
            />

            <div className="text-center space-y-2">
              <Trophy className="w-12 h-12 mx-auto text-lightning" />
              <h2 className="text-2xl font-orbitron font-bold">Race Prediction</h2>
              <p className="text-muted-foreground">Pick the monsters and predict the winner!</p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Select 2-4 monsters to race, then predict who will win!
              </p>
              <BattleReadyButton onClick={handleStartRaceSetup} label="Set Up Race" />
            </div>

            <div className="flex justify-center gap-8 text-center pt-4">
              <div><span className="text-2xl font-orbitron text-primary">{progress.racesWon}</span><p className="text-xs text-muted-foreground">Correct</p></div>
              <div><span className="text-2xl font-orbitron text-destructive">{progress.racesLost}</span><p className="text-xs text-muted-foreground">Wrong</p></div>
            </div>
          </div>
        )}

        {/* My Monsters Tab */}
        {activeTab === 'monsters' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-orbitron font-bold">My Monsters</h2>
              <p className="text-muted-foreground">{progress.unlockedMonsters.length} / {PLAYABLE_MONSTERS.length} Unlocked</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sortedMonsters.map((monster) => (
                <div key={monster.id} onClick={() => setProfileMonster(monster)} className="cursor-pointer">
                  <MonsterCard
                    monster={monster}
                    isLocked={!progress.unlockedMonsters.includes(monster.id)}
                    size="lg"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Encyclopedia Tab */}
        {activeTab === 'encyclopedia' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <BookOpen className="w-12 h-12 mx-auto text-electric" />
              <h2 className="text-2xl font-orbitron font-bold">Monster Encyclopedia</h2>
              <p className="text-sm text-muted-foreground">
                {progress.unlockedMonsters.length} discovered • Tap any monster to learn more!
              </p>
            </div>
            <div className="space-y-3">
              {sortedMonsters.map((monster) => (
                <EncyclopediaEntry
                  key={monster.id}
                  monster={monster}
                  isUnlocked={progress.unlockedMonsters.includes(monster.id)}
                  onClick={() => setProfileMonster(monster)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
};

export default Index;
