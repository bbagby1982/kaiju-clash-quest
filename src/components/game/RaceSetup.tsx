import { useState, useMemo } from 'react';
import { Monster, GameMap } from '@/types/game';
import { MONSTERS } from '@/data/monsters';
import { Button } from '@/components/ui/button';
import { MonsterCard } from './MonsterCard';
import { Trophy, ChevronRight, ChevronLeft, Zap, Shield, Swords, Sparkles, Check, X } from 'lucide-react';

interface RaceSetupProps {
  unlockedMonsterIds: string[];
  availableMaps: GameMap[];
  onStartRace: (selectedMonsters: Monster[], predictedWinner: Monster, map: GameMap) => void;
  onBack: () => void;
}

type SetupStep = 'select-monsters' | 'predict-winner' | 'map-preview';

export function RaceSetup({ unlockedMonsterIds, availableMaps, onStartRace, onBack }: RaceSetupProps) {
  const [step, setStep] = useState<SetupStep>('select-monsters');
  const [selectedMonsters, setSelectedMonsters] = useState<Monster[]>([]);
  const [predictedWinner, setPredictedWinner] = useState<Monster | null>(null);
  const [selectedMap, setSelectedMap] = useState<GameMap>(availableMaps[Math.floor(Math.random() * availableMaps.length)]);

  const sortedMonsters = useMemo(() => {
    return [...MONSTERS].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

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
    return Math.round((totalScore / allScores) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
      {/* Header */}
      <div className="text-center space-y-2 mb-6">
        <Trophy className="w-12 h-12 mx-auto text-lightning" />
        <h1 className="text-2xl font-orbitron font-bold">Race Setup</h1>
        
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
            step === 'select-monsters' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            <span>1</span>
            <span className="hidden sm:inline">Pick Racers</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
            step === 'predict-winner' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            <span>2</span>
            <span className="hidden sm:inline">Predict Winner</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
            step === 'map-preview' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            <span>3</span>
            <span className="hidden sm:inline">Start Race</span>
          </div>
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
                  <div 
                    key={monster.id}
                    className="relative"
                    onClick={() => toggleMonsterSelection(monster)}
                  >
                    <div className="w-16 h-16 rounded-lg border-2 border-primary bg-card flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                      <span className="text-3xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '4️⃣'}</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                      <X className="w-3 h-3 text-destructive-foreground" />
                    </div>
                    <p className="text-xs text-center mt-1 truncate w-16">{monster.name.split(' ')[0]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monster grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sortedMonsters.map((monster) => {
              const isUnlocked = unlockedMonsterIds.includes(monster.id);
              const isSelected = selectedMonsters.find(m => m.id === monster.id);
              
              return (
                <div 
                  key={monster.id}
                  onClick={() => isUnlocked && toggleMonsterSelection(monster)}
                  className={`relative cursor-pointer transition-all ${
                    !isUnlocked ? 'opacity-50 cursor-not-allowed' : ''
                  } ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl' : ''}`}
                >
                  <MonsterCard
                    monster={monster}
                    isLocked={!isUnlocked}
                    size="sm"
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

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

          {/* Monster comparison cards */}
          <div className="grid gap-4">
            {selectedMonsters.map((monster) => {
              const hasAdvantage = getTerrainAdvantage(monster);
              const winChance = getWinChance(monster);
              const isSelected = predictedWinner?.id === monster.id;

              return (
                <div
                  key={monster.id}
                  onClick={() => setPredictedWinner(monster)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
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
                    {/* Monster avatar */}
                    <div 
                      className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: monster.imageColor }}
                    >
                      <span className="text-2xl font-bold text-white/80">
                        {monster.name.charAt(0)}
                      </span>
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
                </div>
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
              className="p-4 text-center"
              style={{ background: `linear-gradient(180deg, ${selectedMap.backgroundColor}, transparent)` }}
            >
              <h3 className="font-orbitron font-bold text-lg" style={{ color: selectedMap.accentColor }}>
                {selectedMap.name}
              </h3>
              <p className="text-sm text-muted-foreground capitalize">{selectedMap.terrain} Terrain</p>
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
                      className={`w-14 h-14 rounded-lg flex items-center justify-center mb-1 ${
                        monster.id === predictedWinner.id ? 'ring-2 ring-lightning ring-offset-2 ring-offset-background' : ''
                      }`}
                      style={{ background: monster.imageColor }}
                    >
                      {monster.id === predictedWinner.id ? (
                        <Trophy className="w-6 h-6 text-lightning" />
                      ) : (
                        <span className="text-lg font-bold text-white/80">
                          {monster.name.charAt(0)}
                        </span>
                      )}
                    </div>
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
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Change track:</span>
            <div className="flex gap-2">
              {availableMaps.map((map) => (
                <button
                  key={map.id}
                  onClick={() => setSelectedMap(map)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedMap.id === map.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {map.terrain}
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
