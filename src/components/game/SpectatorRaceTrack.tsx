import { useEffect, useState, useCallback, useMemo } from 'react';
import { Monster, GameMap } from '@/types/game';
import { Flag, Trophy, Eye, Sparkles } from 'lucide-react';
import { RaceEnvironment } from './RaceEnvironment';
import { RaceWeather, WeatherType, getRandomWeather, getWeatherSpeedModifier } from './RaceWeather';
import { RaceMonster } from './RaceMonster';
import { getRaceMapData } from '@/data/maps';

interface SpectatorRaceTrackProps {
  racers: Monster[];
  predictedWinner: Monster;
  map: GameMap;
  onRaceEnd: (winner: Monster, placements: Monster[], predictionCorrect: boolean) => void;
}

type RacePhase = 'countdown' | 'racing' | 'photo-finish' | 'result';

interface RacerState {
  monster: Monster;
  position: number;
  speed: number;
  lane: number;
  isBoosting: boolean;
  isHit: boolean;
}

export function SpectatorRaceTrack({ racers: initialRacers, predictedWinner, map, onRaceEnd }: SpectatorRaceTrackProps) {
  const [phase, setPhase] = useState<RacePhase>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [racers, setRacers] = useState<RacerState[]>([]);
  const [finishOrder, setFinishOrder] = useState<Monster[]>([]);
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [commentary, setCommentary] = useState<string>('');

  const raceMapData = useMemo(() => getRaceMapData(map.id), [map.id]);
  const weatherModifier = useMemo(() => getWeatherSpeedModifier(weather), [weather]);

  // Assign lanes based on number of racers
  const getLane = (index: number, total: number) => {
    if (total === 2) return index === 0 ? 0 : 2;
    if (total === 3) return index;
    return index < 2 ? (index === 0 ? 0 : 2) : (index === 2 ? 1 : 1.5);
  };

  // Initialize race
  useEffect(() => {
    setWeather(getRandomWeather(map.terrain));
    
    const allRacers: RacerState[] = initialRacers.map((monster, i) => ({
      monster,
      position: 0,
      speed: monster.stats.speed / 50,
      lane: getLane(i, initialRacers.length),
      isBoosting: false,
      isHit: false,
    }));
    setRacers(allRacers);
    setCommentary(`${initialRacers.length} monsters ready to race!`);
  }, [initialRacers, map.terrain]);

  // Commentary updates
  const updateCommentary = useCallback((racerStates: RacerState[]) => {
    const sorted = [...racerStates].sort((a, b) => b.position - a.position);
    const leader = sorted[0];
    const second = sorted[1];
    
    const commentaries = [
      `${leader.monster.name} is in the lead!`,
      `${second.monster.name} is closing in!`,
      `What a race! ${leader.monster.name} vs ${second.monster.name}!`,
      `The crowd goes wild!`,
      `Look at ${leader.monster.name} go!`,
      `${second.monster.name} is making a move!`,
    ];
    
    if (Math.random() < 0.1) {
      setCommentary(commentaries[Math.floor(Math.random() * commentaries.length)]);
    }
  }, []);

  // Countdown
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      setCommentary("And they're off!");
      setTimeout(() => setPhase('racing'), 500);
    }
  }, [phase, countdown]);

  // Racing loop - fully automated
  useEffect(() => {
    if (phase !== 'racing') return;

    const interval = setInterval(() => {
      setRacers(prev => {
        const updated = prev.map(racer => {
          if (finishOrder.find(m => m.id === racer.monster.id)) return racer;
          
          // More variance for exciting races
          const variance = (Math.random() - 0.5) * 1.2;
          const terrainBonus = racer.monster.terrainBonus?.includes(map.terrain) ? 1.15 : 1;
          
          // Random speed bursts for excitement
          const randomBurst = Math.random() < 0.05 ? 1.3 : 1;
          const isBoosting = randomBurst > 1;
          
          const newPosition = racer.position + (racer.speed + variance) * terrainBonus * weatherModifier * randomBurst;
          
          return { 
            ...racer, 
            position: Math.min(100, newPosition),
            isBoosting,
          };
        });

        // Check for finishers
        updated.forEach(racer => {
          if (racer.position >= 100 && !finishOrder.find(m => m.id === racer.monster.id)) {
            setFinishOrder(prev => [...prev, racer.monster]);
          }
        });

        updateCommentary(updated);

        return updated;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [phase, finishOrder, map.terrain, weatherModifier, updateCommentary]);

  // Check for photo finish (close race)
  useEffect(() => {
    if (phase !== 'racing') return;
    
    const topTwo = [...racers].sort((a, b) => b.position - a.position).slice(0, 2);
    if (topTwo[0]?.position > 90 && topTwo[1]?.position > 88) {
      if (Math.abs(topTwo[0].position - topTwo[1].position) < 5) {
        setCommentary("PHOTO FINISH INCOMING!");
      }
    }
  }, [racers, phase]);

  // Check for race end
  useEffect(() => {
    if (finishOrder.length === racers.length && racers.length > 0) {
      const winner = finishOrder[0];
      const isPredictionCorrect = winner.id === predictedWinner.id;
      
      setCommentary(isPredictionCorrect 
        ? `${winner.name} wins! Your prediction was CORRECT!` 
        : `${winner.name} wins! Better luck next time!`
      );
      
      setTimeout(() => setPhase('result'), 1000);
    }
  }, [finishOrder, racers.length, predictedWinner]);

  const winner = finishOrder[0];
  const isPredictionCorrect = winner?.id === predictedWinner.id;
  const scrollPosition = Math.max(...racers.map(r => r.position)) * 10;

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        background: `linear-gradient(180deg, ${map.backgroundColor}, hsl(220 20% 4%))` 
      }}
    >
      {/* Environment layers */}
      <RaceEnvironment map={map} scrollPosition={scrollPosition} />
      
      {/* Weather overlay */}
      <RaceWeather weather={weather} />
      
      {/* Track surface */}
      <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-background/80 to-transparent" />
      
      {/* Race track area */}
      <div className="absolute inset-0 flex flex-col">
        {/* Header */}
        <div className="relative z-30 p-4 flex items-center justify-between">
          <div 
            className="px-4 py-2 rounded-full text-sm font-medium border backdrop-blur-sm"
            style={{ 
              borderColor: map.accentColor, 
              color: map.accentColor,
              background: `${map.accentColor}20`
            }}
          >
            {map.name}
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary backdrop-blur-sm">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Spectator Mode</span>
          </div>
        </div>

        {/* Your prediction banner */}
        <div className="relative z-30 px-4">
          <div className="bg-lightning/20 border border-lightning rounded-lg p-2 text-center backdrop-blur-sm">
            <span className="text-sm text-lightning">
              Your pick: <span className="font-bold">{predictedWinner.name}</span>
              {racers.find(r => r.monster.id === predictedWinner.id)?.position ? (
                <span className="ml-2 text-xs opacity-75">
                  (Currently #{[...racers].sort((a, b) => b.position - a.position).findIndex(r => r.monster.id === predictedWinner.id) + 1})
                </span>
              ) : null}
            </span>
          </div>
        </div>

        {/* Commentary */}
        <div className="relative z-30 px-4 mt-2">
          <div className="bg-card/80 border border-border rounded-lg p-3 text-center backdrop-blur-sm animate-pulse">
            <p className="font-medium text-foreground">{commentary}</p>
          </div>
        </div>

        {/* Main race area */}
        <div className="flex-1 relative">
          {/* Countdown */}
          {phase === 'countdown' && (
            <div className="absolute inset-0 flex items-center justify-center z-40">
              <div className="text-center animate-scale-in">
                <h2 className="text-8xl font-orbitron font-bold text-lightning text-glow-yellow">
                  {countdown > 0 ? countdown : 'GO!'}
                </h2>
              </div>
            </div>
          )}

          {/* Racers */}
          {phase !== 'countdown' && phase !== 'result' && (
            <>
              {racers.map((racer) => (
                <RaceMonster
                  key={racer.monster.id}
                  monster={racer.monster}
                  position={racer.position}
                  lane={racer.lane}
                  isPlayer={racer.monster.id === predictedWinner.id}
                  isBoosting={racer.isBoosting}
                  isHit={racer.isHit}
                  terrain={map.terrain}
                />
              ))}
              
              {/* Finish line */}
              <div 
                className="absolute right-4 top-1/4 bottom-1/4 w-2 bg-accent flex items-center justify-center"
                style={{ boxShadow: '0 0 20px hsl(var(--accent))' }}
              >
                <Flag className="absolute -left-6 top-0 w-8 h-8 text-accent" />
              </div>
            </>
          )}

          {/* Result */}
          {phase === 'result' && winner && (
            <div className="absolute inset-0 flex items-center justify-center z-40 bg-background/60 backdrop-blur-sm">
              <div className="text-center animate-scale-in space-y-6 p-6 max-w-md">
                {/* Winner announcement */}
                <div className="flex items-center justify-center mb-4">
                  <Trophy className="w-16 h-16 text-lightning animate-pulse-scale" />
                </div>
                
                <h2 className="text-3xl font-orbitron font-bold text-lightning text-glow-yellow">
                  {winner.name} Wins!
                </h2>

                {/* Prediction result */}
                <div className={`p-4 rounded-xl border-2 ${
                  isPredictionCorrect 
                    ? 'bg-primary/20 border-primary' 
                    : 'bg-destructive/20 border-destructive'
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {isPredictionCorrect ? (
                      <Sparkles className="w-6 h-6 text-primary" />
                    ) : null}
                    <span className={`text-xl font-bold ${
                      isPredictionCorrect ? 'text-primary' : 'text-destructive'
                    }`}>
                      {isPredictionCorrect ? 'Prediction Correct!' : 'Wrong Prediction'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isPredictionCorrect 
                      ? 'Great job! You really know your monsters!' 
                      : `You picked ${predictedWinner.name}. Keep studying those stats!`
                    }
                  </p>
                </div>
                
                {/* Final standings */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Final Standings</h3>
                  {finishOrder.map((monster, i) => (
                    <div 
                      key={monster.id}
                      className={`flex items-center justify-center gap-3 py-2 px-4 rounded-lg ${
                        monster.id === predictedWinner.id ? 'bg-lightning/20 border border-lightning' : 'bg-muted/30'
                      }`}
                    >
                      <span className="text-xl font-orbitron font-bold">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                      <span className="font-medium text-foreground">{monster.name}</span>
                      {monster.id === predictedWinner.id && (
                        <span className="text-xs text-lightning">(Your pick)</span>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onRaceEnd(winner, finishOrder, isPredictionCorrect)}
                  className="px-8 py-4 rounded-xl font-orbitron font-bold text-lg bg-primary text-primary-foreground hover:scale-105 transition-transform glow-atomic"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Position tracker */}
        {phase === 'racing' && (
          <div className="relative z-30 p-4">
            {/* Race positions */}
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 border border-border">
              <div className="space-y-2">
                {[...racers].sort((a, b) => b.position - a.position).map((racer, i) => (
                  <div 
                    key={racer.monster.id}
                    className={`flex items-center gap-3 ${
                      racer.monster.id === predictedWinner.id ? 'text-lightning' : 'text-foreground'
                    }`}
                  >
                    <span className="w-6 text-sm font-bold">#{i + 1}</span>
                    <span className="flex-1 text-sm font-medium truncate">{racer.monster.name}</span>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-200 ${
                          racer.monster.id === predictedWinner.id ? 'bg-lightning' : 'bg-primary'
                        }`}
                        style={{ width: `${racer.position}%` }}
                      />
                    </div>
                    <span className="w-10 text-xs text-right">{Math.floor(racer.position)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
