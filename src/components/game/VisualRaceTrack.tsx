import { useEffect, useState, useCallback, useMemo } from 'react';
import { Monster, GameMap } from '@/types/game';
import { Flag, Zap, Trophy } from 'lucide-react';
import { RaceEnvironment } from './RaceEnvironment';
import { RaceWeather, WeatherType, getRandomWeather, getWeatherSpeedModifier } from './RaceWeather';
import { RaceMonster } from './RaceMonster';
import { RaceObstacleVisual, ObstacleQTE } from './RaceObstacle';
import { getRaceMapData, RaceObstacle } from '@/data/maps';

interface VisualRaceTrackProps {
  playerMonster: Monster;
  opponents: Monster[];
  map: GameMap;
  onRaceEnd: (won: boolean, placement: number) => void;
}

type RacePhase = 'countdown' | 'racing' | 'obstacle' | 'boost' | 'result';

interface RacerState {
  monster: Monster;
  position: number;
  speed: number;
  isPlayer: boolean;
  lane: number;
  isBoosting: boolean;
  isHit: boolean;
}

export function VisualRaceTrack({ playerMonster, opponents, map, onRaceEnd }: VisualRaceTrackProps) {
  const [phase, setPhase] = useState<RacePhase>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [racers, setRacers] = useState<RacerState[]>([]);
  const [finishOrder, setFinishOrder] = useState<string[]>([]);
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [currentObstacle, setCurrentObstacle] = useState<RaceObstacle | null>(null);
  const [obstacleTimeRemaining, setObstacleTimeRemaining] = useState(1.5);
  const [boostPresses, setBoostPresses] = useState(0);
  const [boostTimeRemaining, setBoostTimeRemaining] = useState(0);
  const [cameraShake, setCameraShake] = useState(false);

  const raceMapData = useMemo(() => getRaceMapData(map.id), [map.id]);
  const weatherModifier = useMemo(() => getWeatherSpeedModifier(weather), [weather]);

  // Initialize race
  useEffect(() => {
    setWeather(getRandomWeather(map.terrain));
    
    const allRacers: RacerState[] = [
      { 
        monster: playerMonster, 
        position: 0, 
        speed: playerMonster.stats.speed / 50, 
        isPlayer: true, 
        lane: 1,
        isBoosting: false,
        isHit: false,
      },
      ...opponents.map((m, i) => ({ 
        monster: m, 
        position: 0, 
        speed: m.stats.speed / 50, 
        isPlayer: false,
        lane: i === 0 ? 0 : 2,
        isBoosting: false,
        isHit: false,
      }))
    ];
    setRacers(allRacers);
  }, [playerMonster, opponents, map.terrain]);

  // Countdown
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      setTimeout(() => setPhase('racing'), 500);
    }
  }, [phase, countdown]);

  // Racing loop
  useEffect(() => {
    if (phase !== 'racing') return;

    const interval = setInterval(() => {
      setRacers(prev => {
        const updated = prev.map(racer => {
          if (finishOrder.includes(racer.monster.id)) return racer;
          
          const variance = racer.isPlayer ? 0 : (Math.random() - 0.5) * 0.5;
          const terrainBonus = racer.monster.terrainBonus?.includes(map.terrain) ? 1.15 : 1;
          const boostMultiplier = racer.isBoosting ? 1.5 : 1;
          const newPosition = racer.position + (racer.speed + variance) * terrainBonus * weatherModifier * boostMultiplier;
          
          return { 
            ...racer, 
            position: Math.min(100, newPosition),
            isBoosting: false,
            isHit: false,
          };
        });

        // Check for finishers
        updated.forEach(racer => {
          if (racer.position >= 100 && !finishOrder.includes(racer.monster.id)) {
            setFinishOrder(prev => [...prev, racer.monster.id]);
          }
        });

        return updated;
      });

      // Random events
      if (Math.random() < 0.015) {
        const events = ['obstacle', 'boost'];
        const event = events[Math.floor(Math.random() * events.length)] as 'obstacle' | 'boost';
        
        if (event === 'obstacle' && raceMapData) {
          // Get a random obstacle from current segment
          const playerPos = racers.find(r => r.isPlayer)?.position || 0;
          const currentSegment = raceMapData.segments.find(
            s => playerPos >= s.startPercent && playerPos < s.endPercent
          );
          
          if (currentSegment?.obstacles?.length) {
            const obstacle = currentSegment.obstacles[Math.floor(Math.random() * currentSegment.obstacles.length)];
            setCurrentObstacle(obstacle);
            setObstacleTimeRemaining(1.5);
            setPhase('obstacle');
          }
        } else if (event === 'boost') {
          setBoostPresses(0);
          setBoostTimeRemaining(2);
          setPhase('boost');
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [phase, finishOrder, map.terrain, weatherModifier, raceMapData, racers]);

  // Check for race end
  useEffect(() => {
    if (finishOrder.length === racers.length && racers.length > 0) {
      setPhase('result');
    }
  }, [finishOrder, racers.length]);

  // Obstacle handling
  useEffect(() => {
    if (phase !== 'obstacle' || !currentObstacle) return;

    const interval = setInterval(() => {
      setObstacleTimeRemaining(prev => {
        if (prev <= 0.1) {
          handleObstacleFail();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    const handleObstacleSuccess = () => {
      setCurrentObstacle(null);
      setPhase('racing');
    };

    const handleKey = (e: KeyboardEvent) => {
      if (currentObstacle.qteType === 'jump' && e.code === 'Space') {
        e.preventDefault();
        handleObstacleSuccess();
      } else if (currentObstacle.qteType === 'dodge' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        handleObstacleSuccess();
      } else if (currentObstacle.qteType === 'smash' && e.code === 'Space') {
        e.preventDefault();
        setBoostPresses(prev => {
          if (prev >= 4) {
            handleObstacleSuccess();
            return 0;
          }
          return prev + 1;
        });
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKey);
    };
  }, [phase, currentObstacle]);

  const handleObstacleFail = useCallback(() => {
    setCameraShake(true);
    setTimeout(() => setCameraShake(false), 500);
    
    setRacers(prev => prev.map(r => 
      r.isPlayer ? { ...r, position: Math.max(0, r.position - 5), isHit: true } : r
    ));
    setCurrentObstacle(null);
    setPhase('racing');
  }, []);

  // Boost mashing
  useEffect(() => {
    if (phase !== 'boost') return;

    const interval = setInterval(() => {
      setBoostTimeRemaining(prev => {
        if (prev <= 0.1) {
          const boostPower = boostPresses / 8;
          setRacers(r => r.map(racer => 
            racer.isPlayer ? { 
              ...racer, 
              position: Math.min(100, racer.position + boostPower),
              isBoosting: true,
            } : racer
          ));
          setPhase('racing');
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setBoostPresses(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKey);
    };
  }, [phase, boostPresses]);

  const playerRacer = racers.find(r => r.isPlayer);
  const playerPlacement = finishOrder.indexOf(playerMonster.id) + 1;
  const scrollPosition = (playerRacer?.position || 0) * 10;

  return (
    <div 
      className={`min-h-screen relative overflow-hidden ${cameraShake ? 'animate-shake' : ''}`}
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
          
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 backdrop-blur-sm">
            <span className="text-sm text-muted-foreground">Weather:</span>
            <span className="text-sm font-medium capitalize text-foreground">{weather}</span>
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
                  isPlayer={racer.isPlayer}
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

          {/* Obstacle QTE */}
          {phase === 'obstacle' && currentObstacle && (
            <ObstacleQTE
              obstacle={currentObstacle}
              onSuccess={() => {
                setCurrentObstacle(null);
                setPhase('racing');
              }}
              onFail={handleObstacleFail}
              timeRemaining={obstacleTimeRemaining}
            />
          )}

          {/* Boost */}
          {phase === 'boost' && (
            <div className="absolute inset-0 flex items-center justify-center z-40 bg-background/30 backdrop-blur-sm">
              <div className="bg-card border-2 border-primary rounded-xl p-6 text-center animate-scale-in">
                <h3 className="text-2xl font-orbitron font-bold text-primary mb-2">
                  SPEED BOOST!
                </h3>
                <p className="text-muted-foreground mb-3">Mash SPACE to boost!</p>
                <div className="flex items-center justify-center gap-4">
                  <Zap className="w-8 h-8 text-lightning animate-pulse" />
                  <span className="text-4xl font-orbitron font-bold text-foreground">{boostPresses}</span>
                </div>
                <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-100"
                    style={{ width: `${(boostTimeRemaining / 2) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {phase === 'result' && (
            <div className="absolute inset-0 flex items-center justify-center z-40 bg-background/60 backdrop-blur-sm">
              <div className="text-center animate-scale-in space-y-6 p-6">
                <div className="flex items-center justify-center mb-4">
                  {playerPlacement === 1 && (
                    <Trophy className="w-16 h-16 text-lightning animate-pulse-scale" />
                  )}
                </div>
                
                <h2 className={`text-5xl font-orbitron font-bold ${
                  playerPlacement === 1 ? 'text-lightning text-glow-yellow' : 
                  playerPlacement <= 2 ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {playerPlacement === 1 ? 'VICTORY!' : `#${playerPlacement} PLACE`}
                </h2>
                
                <div className="space-y-2 max-w-xs mx-auto">
                  {finishOrder.map((id, i) => {
                    const racer = racers.find(r => r.monster.id === id);
                    return (
                      <div 
                        key={id}
                        className={`flex items-center justify-center gap-3 py-2 px-4 rounded-lg ${
                          racer?.isPlayer ? 'bg-primary/20 border border-primary' : 'bg-muted/30'
                        }`}
                      >
                        <span className="text-xl font-orbitron font-bold">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                        <span className="font-medium text-foreground">{racer?.monster.name}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => onRaceEnd(playerPlacement === 1, playerPlacement)}
                  className="px-8 py-4 rounded-xl font-orbitron font-bold text-lg bg-primary text-primary-foreground hover:scale-105 transition-transform glow-atomic"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Position indicator */}
        {phase === 'racing' && (
          <div className="relative z-30 p-4">
            <div className="flex items-center gap-2 max-w-md mx-auto">
              <span className="text-sm text-muted-foreground">Progress:</span>
              <div className="flex-1 h-3 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${playerRacer?.position || 0}%` }}
                />
              </div>
              <span className="text-sm font-bold text-foreground">
                {Math.floor(playerRacer?.position || 0)}%
              </span>
            </div>
            
            {/* Mini positions */}
            <div className="flex items-center justify-center gap-4 mt-2">
              {[...racers].sort((a, b) => b.position - a.position).map((racer, i) => (
                <div 
                  key={racer.monster.id}
                  className={`text-xs px-2 py-1 rounded ${
                    racer.isPlayer ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  #{i + 1} {racer.monster.name.split(' ')[0]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
