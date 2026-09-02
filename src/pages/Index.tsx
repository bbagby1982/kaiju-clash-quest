import { useState, useCallback, useMemo, useEffect } from 'react';
import { GameTab, Monster, Booster, GameMap, DailyChallenge } from '@/types/game';
import { GameLayout } from '@/components/game/GameLayout';
import { HomeScreen } from '@/components/game/HomeScreen';
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
import { useRoster } from '@/lib/roster';
import { getRandomMap, GAME_MAPS } from '@/data/maps';
import { Trophy, Swords, BookOpen, Dna, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type GameState = 'menu' | 'setup' | 'booster' | 'focus' | 'preview' | 'battle' | 'race-setup' | 'race';

/** The "you finished today's challenge" payload handed to the celebration modal. */
interface CompletedChallenge {
  challenge: DailyChallenge;
  streak: number;
}

/** Shown while the roster manifest is still on its way and we have nothing to draw. */
function SummoningState() {
  return (
    <div className="kq-summon">
      <div className="kq-summon-ring" />
      <p className="font-orbitron text-sm text-primary">Summoning monsters…</p>
      <p className="text-xs text-muted-foreground">Waking up the roster</p>
    </div>
  );
}

function RosterNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg border border-lightning/40 bg-lightning/10 text-[0.7rem] text-lightning">
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

const Index = () => {
  const [activeTab, setActiveTab] = useState<GameTab>('home');
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
  const [lastCompletedChallenge, setLastCompletedChallenge] = useState<CompletedChallenge | null>(null);

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
  const roster = useRoster();
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

  // Unlocked monsters first (alphabetical), then locked (alphabetical) — only
  // the ones with real artwork are playable.
  const sortedMonsters = useMemo(() => {
    const unlockedIds = new Set(progress.unlockedMonsters);
    return [...roster.playable].sort((a, b) => {
      const unlockedDiff = Number(unlockedIds.has(b.id)) - Number(unlockedIds.has(a.id));
      return unlockedDiff !== 0 ? unlockedDiff : a.name.localeCompare(b.name);
    });
  }, [roster.playable, progress.unlockedMonsters]);

  // The encyclopedia lists EVERY monster; the ones with no art still read as
  // ???. Discovered (unlocked) monsters lead, each group alphabetical.
  const encyclopediaMonsters = useMemo(() => {
    const unlockedIds = new Set(progress.unlockedMonsters);
    return [...roster.all].sort((a, b) => {
      const unlockedDiff = Number(unlockedIds.has(b.id)) - Number(unlockedIds.has(a.id));
      return unlockedDiff !== 0 ? unlockedDiff : a.name.localeCompare(b.name);
    });
  }, [roster.all, progress.unlockedMonsters]);

  const rosterPending = !roster.ready && roster.playable.length === 0;

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
        const monster = roster.byId(unlockedId);
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
  }, [recordBattleResult, unlockRandomMonster, toast, currentMap, selectedBooster, selectedMonster, updateDailyChallengeAfterBattle, progress.dailyChallenge, roster]);

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
        const monster = roster.byId(unlockedId);
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
  }, [recordRaceResult, unlockRandomMonster, toast, currentMap, predictedWinner, updateDailyChallengeAfterRace, progress.dailyChallenge, roster]);

  const resetSelection = useCallback(() => {
    setGameState('menu');
    setSelectedMonster(null);
    setSelectedBooster(null);
    setBattleFocus(null);
    setOpponent(null);
    setRaceMonsters([]);
    setPredictedWinner(null);
  }, []);

  /** Home's mode buttons: switch tabs, and always land on the tab's menu state. */
  const handleHomeNavigate = useCallback((tab: GameTab) => {
    setGameState('menu');
    setActiveTab(tab);
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
      {/* Challenge Completed Modal */}
      {showChallengeComplete && lastCompletedChallenge && (
        <ChallengeCompletedModal
          challenge={lastCompletedChallenge.challenge}
          streak={lastCompletedChallenge.streak}
          onClose={() => setShowChallengeComplete(false)}
        />
      )}

      {/* ══ HOME — the title screen ═══════════════════════════════════════ */}
      {activeTab === 'home' && (
        <HomeScreen
          progress={progress}
          onNavigate={handleHomeNavigate}
          challengeSlot={
            <DailyChallengeCard
              challengeProgress={progress.dailyChallenge}
              onRefresh={refreshDailyChallenge}
            />
          }
          cloudSlot={
            /* Mounted on Home (the default tab) so its boot-time auto-load runs. */
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
          }
        />
      )}

      {activeTab !== 'home' && (
        <div className="p-4 kq-screen-pad max-w-3xl mx-auto kq-screen-in">
          {/* ══ BATTLE ═══════════════════════════════════════════════════ */}
          {activeTab === 'battle' && (
            <div className="space-y-5">
              <div className="text-center space-y-1.5">
                <Swords className="w-11 h-11 mx-auto text-primary" />
                <h2 className="text-2xl font-orbitron font-black text-title-glow">Battle Mode</h2>
                <p className="text-muted-foreground text-sm">Select your monster and fight!</p>
                <p className="text-xs text-lightning">Level {progress.playerLevel}</p>
              </div>

              {roster.error && <RosterNotice message={roster.error} />}

              {gameState === 'booster' && selectedMonster ? (
                <BoosterSelection
                  progress={progress}
                  onSelect={setSelectedBooster}
                  onConfirm={handleBoosterConfirm}
                />
              ) : rosterPending ? (
                <SummoningState />
              ) : (
                <div className="flex justify-center">
                  <BattleReadyButton onClick={() => setGameState('setup')} label="Start Battle" />
                </div>
              )}

              <DailyChallengeCard
                challengeProgress={progress.dailyChallenge}
                onRefresh={refreshDailyChallenge}
              />

              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                <div className="kq-chip">
                  <span className="kq-chip-value text-primary">{progress.wins}</span>
                  <span className="kq-chip-label">Wins</span>
                </div>
                <div className="kq-chip">
                  <span className="kq-chip-value text-destructive">{progress.losses}</span>
                  <span className="kq-chip-label">Losses</span>
                </div>
              </div>
            </div>
          )}

          {/* ══ RACE ═════════════════════════════════════════════════════ */}
          {activeTab === 'race' && (
            <div className="space-y-5">
              <div className="text-center space-y-1.5">
                <Trophy className="w-11 h-11 mx-auto text-lightning" />
                <h2 className="text-2xl font-orbitron font-black text-title-glow">Race Prediction</h2>
                <p className="text-muted-foreground text-sm">Pick the monsters and predict the winner!</p>
              </div>

              {roster.error && <RosterNotice message={roster.error} />}

              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select 2-4 monsters to race, then predict who will win!
                </p>
                {rosterPending ? (
                  <SummoningState />
                ) : (
                  <div className="flex justify-center">
                    <BattleReadyButton onClick={handleStartRaceSetup} label="Set Up Race" />
                  </div>
                )}
              </div>

              <DailyChallengeCard
                challengeProgress={progress.dailyChallenge}
                onRefresh={refreshDailyChallenge}
              />

              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                <div className="kq-chip">
                  <span className="kq-chip-value text-primary">{progress.racesWon}</span>
                  <span className="kq-chip-label">Correct</span>
                </div>
                <div className="kq-chip">
                  <span className="kq-chip-value text-destructive">{progress.racesLost}</span>
                  <span className="kq-chip-label">Wrong</span>
                </div>
              </div>
            </div>
          )}

          {/* ══ MY MONSTERS ══════════════════════════════════════════════ */}
          {activeTab === 'monsters' && (
            <div className="space-y-5">
              <div className="text-center space-y-1.5">
                <Dna className="w-11 h-11 mx-auto text-electric" />
                <h2 className="text-2xl font-orbitron font-black text-title-glow">My Monsters</h2>
                <p className="text-muted-foreground text-sm">
                  {progress.unlockedMonsters.length} / {roster.playable.length} Unlocked
                </p>
              </div>

              {roster.error && <RosterNotice message={roster.error} />}

              {rosterPending ? (
                <SummoningState />
              ) : sortedMonsters.length === 0 ? (
                <div className="kq-summon">
                  <span className="text-5xl" aria-hidden="true">🥚</span>
                  <p className="font-orbitron text-sm text-foreground">No monster art yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Upload art in the admin page and your kaiju will appear right here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {sortedMonsters.map((monster, i) => (
                    <div key={monster.id} className="kq-stagger" style={{ '--i': i } as React.CSSProperties}>
                      <MonsterCard
                        monster={monster}
                        isLocked={!progress.unlockedMonsters.includes(monster.id)}
                        onClick={() => setProfileMonster(monster)}
                        size="lg"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ ENCYCLOPEDIA ═════════════════════════════════════════════ */}
          {activeTab === 'encyclopedia' && (
            <div className="space-y-5">
              <div className="text-center space-y-1.5">
                <BookOpen className="w-11 h-11 mx-auto text-electric" />
                <h2 className="text-2xl font-orbitron font-black text-title-glow">Monster Encyclopedia</h2>
                <p className="text-sm text-muted-foreground">
                  {progress.unlockedMonsters.length} discovered • Tap any monster to learn more!
                </p>
              </div>

              {roster.error && <RosterNotice message={roster.error} />}

              {rosterPending ? (
                <SummoningState />
              ) : (
                <div className="space-y-2.5">
                  {encyclopediaMonsters.map((monster, i) => (
                    <div key={monster.id} className="kq-stagger" style={{ '--i': Math.min(i, 12) } as React.CSSProperties}>
                      <EncyclopediaEntry
                        monster={monster}
                        isUnlocked={progress.unlockedMonsters.includes(monster.id)}
                        onClick={() => setProfileMonster(monster)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </GameLayout>
  );
};

export default Index;
