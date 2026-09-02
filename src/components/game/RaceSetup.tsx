import { useState, useMemo } from 'react';
import { Monster, GameMap } from '@/types/game';
import { useRoster } from '@/lib/roster';
import { Button } from '@/components/ui/button';
import { MonsterCard } from './MonsterCard';
import { MonsterSprite } from './MonsterSprite';
import { Trophy, ChevronRight, ChevronLeft, Zap, Check, X, MapPin } from 'lucide-react';

interface RaceSetupProps {
  unlockedMonsterIds: string[];
  availableMaps: GameMap[];
  onStartRace: (selectedMonsters: Monster[], predictedWinner: Monster, map: GameMap) => void;
  onBack: () => void;
}

type SetupStep = 'select-monsters' | 'predict-winner' | 'map-preview';

const STEPS: { key: SetupStep; label: string }[] = [
  { key: 'select-monsters', label: 'Pick Racers' },
  { key: 'predict-winner', label: 'Predict Winner' },
  { key: 'map-preview', label: 'Start Race' },
];

export function RaceSetup({ unlockedMonsterIds, availableMaps, onStartRace, onBack }: RaceSetupProps) {
  const roster = useRoster();
  const [step, setStep] = useState<SetupStep>('select-monsters');
  const [selectedMonsters, setSelectedMonsters] = useState<Monster[]>([]);
  const [predictedWinner, setPredictedWinner] = useState<Monster | null>(null);
  const [selectedMap, setSelectedMap] = useState<GameMap>(availableMaps[Math.floor(Math.random() * availableMaps.length)]);

  // Only monsters with real art are ever offered as racers — MonsterCard/MonsterSprite
  // would otherwise fall back to a generic silhouette for most of the roster.
  const racePool = useMemo(() => {
    return [...roster.playable].sort((a, b) => a.name.localeCompare(b.name));
  }, [roster.playable]);

  const toggleMonsterSelection = (monster: Monster) => {
    if (selectedMonsters.find(m => m.id === monster.id)) {
      setSelectedMonsters(prev => prev.filter(m => m.id !== monster.id));
      if (predictedWinner?.id === monster.id) {
        setPredictedWinner(null);
      }
    } else if (selectedMonsters.length < 4) {
      setSelectedMonsters(prev => [...prev, monster]);
    }
  };

  const canProceedToPredict = selectedMonsters.length >= 2 && selectedMonsters.length <= 4;
  const canStartRace = predictedWinner !== null;

  const handleStartRace = () => {
    if (predictedWinner) {
      onStartRace(selectedMonsters, predictedWinner, selectedMap);
    }
  };

  const getTerrainAdvantage = (monster: Monster) => {
    return monster.terrainBonus?.includes(selectedMap.terrain);
  };

  const getWinChance = (monster: Monster) => {
    const baseSpeed = monster.stats.speed;
    const terrainBonus = getTerrainAdvantage(monster) ? 15 : 0;
    const totalScore = baseSpeed + terrainBonus;
    const allScores = selectedMonsters.reduce((sum, m) => {
      const s = m.stats.speed + (m.terrainBonus?.includes(selectedMap.terrain) ? 15 : 0);
      return sum + s;
    }, 0);
    return allScores > 0 ? Math.round((totalScore / allScores) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
      {/* Header */}
      <div className="text-center space-y-2 mb-6">
        <Trophy className="w-12 h-12 mx-auto text-lightning" />
        <h1 className="text-2xl font-orbitron font-bold">Race Setup</h1>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                step === s.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <span>{i + 1}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Select Monsters */}
      {step === 'select-monsters' && (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-1">Choose Your Racers</h2>
            <p className="text-muted-foreground text-sm">
              Select 2-4 monsters to compete ({selectedMonsters.length}/4 selected)
            </p>
          </div>

          {/* Selected lineup */}
          {selectedMonsters.length > 0 && (
            <div className="bg-muted/30 rounded-xl p-4 border border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Race Lineup</h3>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {selectedMonsters.map((monster, i) => (
                  <button
                    key={monster.id}
                    type="button"
                    className="relative group"
                    onClick={() => toggleMonsterSelection(monster)}
                    aria-label={`Remove ${monster.name}`}
                  >
                    <div
                      className="w-16 h-16 rounded-lg border-2 border-primary overflow-hidden flex items-center justify-center cursor-pointer group-hover:scale-105 transition-transform"
                      style={{ background: `linear-gradient(160deg, ${monster.imageColor}, hsl(220 25% 6%))` }}
                    >
                      {roster.imageUrl(monster.id) ? (
                        <img src={roster.imageUrl(monster.id)} alt={monster.name} className="w-full h-full object-cover" draggable={false} />
                      ) : (
                        <span className="text-3xl">{roster.fallbackEmoji(monster.id)}</span>
                      )}
                    </div>
                    <span className="absolute -top-1.5 -left-1.5 text-lg leading-none drop-shadow" aria-hidden="true">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '4️⃣'}
                    </span>
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                      <X className="w-3 h-3 text-destructive-foreground" />
                    </div>
                    <p className="text-xs text-center mt-1 truncate w-16">{monster.name.split(' ')[0]}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monster grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {racePool.map((monster) => {
              const isUnlocked = unlockedMonsterIds.includes(monster.id);
              const isSelected = !!selectedMonsters.find(m => m.id === monster.id);

              return (
                <div key={monster.id} className="relative">
                  <MonsterCard
                    monster={monster}
                    isSelected={isSelected}
                    isLocked={!isUnlocked}
                    size="sm"
                    onClick={isUnlocked ? () => toggleMonsterSelection(monster) : undefined}
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center pointer-events-none">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {racePool.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No racers have artwork yet — check back once some monsters are unlocked!
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={() => setStep('predict-winner')}
              disabled={!canProceedToPredict}
              className="glow-atomic"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Predict Winner */}
      {step === 'predict-winner' && (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-1">Who Will Win?</h2>
            <p className="text-muted-foreground text-sm">
              Pick the monster you think will cross the finish line first!
            </p>
          </div>

          {/* Map info */}
          <div
            className="p-3 rounded-lg border text-center"
            style={{
              borderColor: selectedMap.accentColor,
              background: `${selectedMap.accentColor}10`
            }}
          >
            <span className="text-sm text-muted-foreground">Racing on: </span>
            <span className="font-bold" style={{ color: selectedMap.accentColor }}>{selectedMap.name}</span>
          </div>

          {/* Monster comparison cards, with big art */}
          <div className="grid gap-4">
            {selectedMonsters.map((monster) => {
              const hasAdvantage = getTerrainAdvantage(monster);
              const winChance = getWinChance(monster);
              const isSelected = predictedWinner?.id === monster.id;

              return (
                <button
                  key={monster.id}
                  type="button"
                  onClick={() => setPredictedWinner(monster)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                    isSelected
                      ? 'border-lightning bg-lightning/10 shadow-lg'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-lightning text-lightning-foreground rounded-full text-xs font-bold">
                      YOUR PICK!
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    {/* Big art */}
                    <div
                      className="shrink-0 rounded-lg overflow-hidden"
                      style={{ background: `linear-gradient(160deg, ${monster.imageColor}, hsl(220 25% 6%))` }}
                    >
                      <MonsterSprite monster={monster} side="left" state="idle" size="sm" shadow={false} />
                    </div>

                    {/* Stats */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold truncate">{monster.name}</h3>
                        {hasAdvantage && (
                          <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full shrink-0">
                            +Terrain
                          </span>
                        )}
                      </div>

                      {/* Speed bar */}
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-lightning shrink-0" />
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-lightning transition-all"
                            style={{ width: `${monster.stats.speed}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">{monster.stats.speed}</span>
                      </div>

                      {/* Win chance */}
                      <div className="flex items-center gap-2 mt-1">
                        <Trophy className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Win chance: <span className={`font-bold ${winChance > 30 ? 'text-primary' : 'text-muted-foreground'}`}>{winChance}%</span>
                        </span>
                      </div>
                    </div>

                    {/* Selection indicator */}
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-lightning border-lightning' : 'border-muted-foreground'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-lightning-foreground" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={() => setStep('select-monsters')}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={() => setStep('map-preview')}
              disabled={!canStartRace}
              className="glow-atomic"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Map Preview & Start */}
      {step === 'map-preview' && predictedWinner && (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-1">Ready to Race!</h2>
            <p className="text-muted-foreground text-sm">
              Your prediction: <span className="text-lightning font-bold">{predictedWinner.name}</span>
            </p>
          </div>

          {/* Race preview card */}
          <div
            className="rounded-xl overflow-hidden border-2"
            style={{ borderColor: selectedMap.accentColor }}
          >
            {/* Map header */}
            <div
              className="p-4 text-center space-y-1"
              style={{ background: `linear-gradient(180deg, ${selectedMap.backgroundColor}, transparent)` }}
            >
              <h3 className="font-orbitron font-bold text-lg" style={{ color: selectedMap.accentColor }}>
                {selectedMap.name}
              </h3>
              <p className="text-sm text-muted-foreground capitalize">{selectedMap.terrain} Terrain</p>
              {selectedMap.description && (
                <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto">{selectedMap.description}</p>
              )}
            </div>

            {/* Racers lineup */}
            <div className="p-4 bg-card">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 text-center">Competitors</h4>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {selectedMonsters.map((monster) => (
                  <div
                    key={monster.id}
                    className={`text-center ${monster.id === predictedWinner.id ? 'scale-110' : ''}`}
                  >
                    <div
                      className={`rounded-lg overflow-hidden mb-1 ${
                        monster.id === predictedWinner.id ? 'ring-2 ring-lightning ring-offset-2 ring-offset-background' : ''
                      }`}
                      style={{ background: `linear-gradient(160deg, ${monster.imageColor}, hsl(220 25% 6%))` }}
                    >
                      <MonsterSprite monster={monster} side="left" state="idle" size="xs" shadow={false} />
                    </div>
                    {monster.id === predictedWinner.id && (
                      <Trophy className="w-4 h-4 text-lightning mx-auto -mt-1 mb-0.5" />
                    )}
                    <p className="text-xs truncate w-14">{monster.name.split(' ')[0]}</p>
                    {getTerrainAdvantage(monster) && (
                      <span className="text-[10px] text-primary">+Bonus</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Change map */}
          <div>
            <p className="text-sm text-muted-foreground text-center mb-2 flex items-center justify-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Change track
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {availableMaps.map((map) => (
                <button
                  key={map.id}
                  onClick={() => setSelectedMap(map)}
                  className={`text-left px-3 py-2 rounded-lg border transition-all ${
                    selectedMap.id === map.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <p className="text-sm font-semibold" style={{ color: selectedMap.id === map.id ? map.accentColor : undefined }}>
                    {map.name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{map.terrain}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={() => setStep('predict-winner')}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={handleStartRace}
              size="lg"
              className="glow-atomic font-orbitron"
            >
              <Trophy className="w-5 h-5 mr-2" />
              Start Race!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
