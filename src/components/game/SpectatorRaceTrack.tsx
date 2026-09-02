import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Monster, GameMap } from '@/types/game';
import { Flag, Trophy, Eye, Sparkles } from 'lucide-react';
import { RaceEnvironment } from './RaceEnvironment';
import { RaceWeather, WeatherType, getRandomWeather, getWeatherSpeedModifier } from './RaceWeather';
import { RaceMonster } from './RaceMonster';
import { MonsterSprite } from './MonsterSprite';
import { getRaceMapData } from '@/data/maps';
import '@/styles/race.css';

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

// The camera holds still until the leader is this far along, then pans the
// track left (up to CAMERA_MAX_PAN%) so the finish line stays reachable on a
// narrow phone screen instead of the leader crowding the right edge.
const CAMERA_TRIGGER = 55;
const CAMERA_MAX_PAN = 34;
// Two racers finishing within this many ms of each other count as a photo finish.
const PHOTO_FINISH_WINDOW_MS = 400;

export function SpectatorRaceTrack({ racers: initialRacers, predictedWinner, map, onRaceEnd }: SpectatorRaceTrackProps) {
  const [phase, setPhase] = useState<RacePhase>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [racers, setRacers] = useState<RacerState[]>([]);
  const [finishOrder, setFinishOrder] = useState<Monster[]>([]);
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [commentary, setCommentary] = useState<string>('');
  const finishTimestamps = useRef<Record<string, number>>({});

  const raceMapData = useMemo(() => getRaceMapData(map.id), [map.id]);
  const weatherModifier = useMemo(() => getWeatherSpeedModifier(weather), [weather]);

  // One lane per racer, top to bottom — RaceEnvironment draws exactly `racers.length`
  // lane guides and RaceMonster centres itself in lane `index` of that many.
  const getLane = (index: number, _total: number) => index;

  // Initialize race
  useEffect(() => {
    setWeather(getRandomWeather(map.terrain));
    finishTimestamps.current = {};

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
            finishTimestamps.current[racer.monster.id] = Date.now();
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
        setCommentary('PHOTO FINISH INCOMING!');
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

      const runnerUpId = finishOrder[1]?.id;
      const gap = runnerUpId
        ? Math.abs((finishTimestamps.current[winner.id] ?? 0) - (finishTimestamps.current[runnerUpId] ?? 0))
        : Infinity;

      if (gap < PHOTO_FINISH_WINDOW_MS) {
        setPhase('photo-finish');
        setTimeout(() => setPhase('result'), 1100);
      } else {
        setTimeout(() => setPhase('result'), 1000);
      }
    }
  }, [finishOrder, racers.length, predictedWinner]);

  const winner = finishOrder[0];
  const isPredictionCorrect = winner?.id === predictedWinner.id;
  const leaderPct = racers.length ? Math.max(...racers.map(r => r.position)) : 0;
  const scrollPosition = leaderPct * 10;
  const cameraPan = Math.min(Math.max(leaderPct - CAMERA_TRIGGER, 0), 100 - CAMERA_TRIGGER)
    * (CAMERA_MAX_PAN / (100 - CAMERA_TRIGGER));

  return (
    <div
      className="h-screen w-full relative overflow-hidden flex flex-col"
      style={{
        background: `linear-gradient(180deg, ${map.backgroundColor}, hsl(220 20% 4%))`
      }}
    >
      {/* Environment layers (includes the lane-marked track bed) */}
      <RaceEnvironment map={map} scrollPosition={scrollPosition} laneCount={racers.length} />

      {/* Weather overlay */}
      <RaceWeather weather={weather} />

      {/* Everything else, laid out as a fixed-height column so nothing pushes the page taller than the screen */}
      <div className="relative z-30 flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 p-3 flex items-center justify-between">
          <div
            className="px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-sm"
            style={{
              borderColor: map.accentColor,
              color: map.accentColor,
              background: `${map.accentColor}20`
            }}
          >
            {map.name}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 border border-primary backdrop-blur-sm">
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Spectator</span>
          </div>
        </div>

        {/* Your prediction banner */}
        <div className="shrink-0 px-3">
          <div className="bg-lightning/20 border border-lightning rounded-lg py-1.5 px-2 text-center backdrop-blur-sm">
            <span className="text-xs text-lightning">
              Your pick: <span className="font-bold">{predictedWinner.name}</span>
              {phase === 'racing' && (
                <span className="ml-2 text-[10px] opacity-75">
                  (#{[...racers].sort((a, b) => b.position - a.position).findIndex(r => r.monster.id === predictedWinner.id) + 1})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Commentary strip */}
        <div className="shrink-0 px-3 mt-1.5">
          <div className="bg-card/80 border border-border rounded-lg py-2 px-3 text-center backdrop-blur-sm">
            <p className="text-sm font-medium text-foreground truncate">{commentary}</p>
          </div>
        </div>

        {/* Track — fixed to the remaining space, never taller than the viewport */}
        <div className="flex-1 min-h-0 relative overflow-hidden mt-1.5">
          {/* Countdown */}
          {phase === 'countdown' && (
            <div className="absolute inset-0 flex items-center justify-center z-40">
              <h2
                key={countdown}
                className="race-countdown-stamp text-8xl font-orbitron font-bold text-lightning text-glow-yellow"
              >
                {countdown > 0 ? countdown : 'GO!'}
              </h2>
            </div>
          )}

          {/* Racers + finish line, panned by the camera as the leader closes in */}
          {(phase === 'racing' || phase === 'photo-finish') && (
            <div
              className="race-track-camera absolute inset-0"
              style={{ transform: `translateX(-${cameraPan}%)` }}
            >
              {racers.map((racer) => (
                <RaceMonster
                  key={racer.monster.id}
                  monster={racer.monster}
                  position={racer.position}
                  lane={racer.lane}
                  laneCount={racers.length}
                  isPlayer={racer.monster.id === predictedWinner.id}
                  isBoosting={racer.isBoosting}
                  isHit={racer.isHit}
                  terrain={map.terrain}
                  isWinner={finishOrder[0]?.id === racer.monster.id}
                />
              ))}

              {/* Finish line */}
              <div
                className="absolute right-4 top-[12%] bottom-[8%] w-2 bg-accent flex items-center justify-center"
                style={{ boxShadow: '0 0 20px hsl(var(--accent))' }}
              >
                <Flag className="absolute -left-6 top-0 w-8 h-8 text-accent" />
              </div>
            </div>
          )}

          {/* Photo finish flash */}
          {phase === 'photo-finish' && (
            <>
              <div className="race-photo-flash absolute inset-0 bg-white z-40 pointer-events-none" aria-hidden="true" />
              <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                <span className="race-photo-stamp px-4 py-1.5 rounded-lg border-4 border-destructive text-destructive font-orbitron font-black text-xl sm:text-2xl bg-background/80 -rotate-3">
                  PHOTO FINISH!
                </span>
              </div>
            </>
          )}

          {/* Result */}
          {phase === 'result' && winner && (
            <RaceResult
              winner={winner}
              finishOrder={finishOrder}
              predictedWinner={predictedWinner}
              isPredictionCorrect={isPredictionCorrect}
              onContinue={() => onRaceEnd(winner, finishOrder, isPredictionCorrect)}
            />
          )}
        </div>

        {/* Controls: live positions, always below the track */}
        {phase === 'racing' && (
          <div className="shrink-0 p-3">
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-2.5 border border-border space-y-1.5">
              {[...racers].sort((a, b) => b.position - a.position).map((racer, i) => (
                <div
                  key={racer.monster.id}
                  className={`flex items-center gap-2 ${
                    racer.monster.id === predictedWinner.id ? 'text-lightning' : 'text-foreground'
                  }`}
                >
                  <span className="w-4 text-xs font-bold">{i + 1}</span>
                  <span className="flex-1 text-xs font-medium truncate">{racer.monster.name.split(' ')[0]}</span>
                  <div className="w-16 sm:w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        racer.monster.id === predictedWinner.id ? 'bg-lightning' : 'bg-primary'
                      }`}
                      style={{ width: `${racer.position}%` }}
                    />
                  </div>
                  <span className="w-8 text-[10px] text-right">{Math.floor(racer.position)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RaceResult({
  winner,
  finishOrder,
  predictedWinner,
  isPredictionCorrect,
  onContinue,
}: {
  winner: Monster;
  finishOrder: Monster[];
  predictedWinner: Monster;
  isPredictionCorrect: boolean;
  onContinue: () => void;
}) {
  // Podium display order: 2nd - 1st - 3rd, so the winner sits center and tallest.
  const podium = [finishOrder[1], finishOrder[0], finishOrder[2]].filter((m): m is Monster => !!m);
  const placeOf = (m: Monster) => finishOrder.findIndex(f => f.id === m.id) + 1;
  const placeColor: Record<number, string> = {
    1: 'hsl(var(--lightning-yellow))',
    2: 'hsl(220 10% 70%)',
    3: 'hsl(30 60% 45%)',
  };
  const placeMedal: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <div className="absolute inset-0 z-40 bg-background/70 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="text-center animate-scale-in space-y-4 w-full max-w-sm">
          <div className="flex items-center justify-center">
            <Trophy className="w-12 h-12 text-lightning animate-pulse-scale" />
          </div>

          <h2 className="text-2xl font-orbitron font-bold text-lightning text-glow-yellow">
            {winner.name} Wins!
          </h2>

          {/* Podium */}
          <div className="flex items-end justify-center gap-2">
            {podium.map((monster) => {
              const place = placeOf(monster);
              return (
                <div key={monster.id} className="flex flex-col items-center">
                  <MonsterSprite
                    monster={monster}
                    side="left"
                    state={place === 1 ? 'victory' : 'idle'}
                    size="xs"
                    shadow={false}
                  />
                  <div
                    data-place={place}
                    className="race-podium-step w-16 sm:w-20 rounded-t-lg flex items-start justify-center pt-1 text-base"
                    style={{ background: placeColor[place] ?? placeColor[3] }}
                  >
                    {placeMedal[place] ?? `#${place}`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prediction result */}
          <div className={`p-3 rounded-xl border-2 ${
            isPredictionCorrect
              ? 'bg-primary/20 border-primary'
              : 'bg-destructive/20 border-destructive'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {isPredictionCorrect ? <Sparkles className="w-5 h-5 text-primary" /> : null}
              <span className={`text-lg font-bold ${
                isPredictionCorrect ? 'text-primary' : 'text-destructive'
              }`}>
                {isPredictionCorrect ? 'Prediction Correct!' : 'Wrong Prediction'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isPredictionCorrect
                ? 'Great job! You really know your monsters!'
                : `You picked ${predictedWinner.name}. Keep studying those stats!`
              }
            </p>
          </div>

          {/* Anyone outside the podium */}
          {finishOrder.length > 3 && (
            <div className="space-y-1">
              {finishOrder.slice(3).map((monster, i) => (
                <div key={monster.id} className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span className="font-bold">#{i + 4}</span>
                  <span>{monster.name}</span>
                  {monster.id === predictedWinner.id && <span className="text-lightning">(Your pick)</span>}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onContinue}
            className="px-8 py-3.5 rounded-xl font-orbitron font-bold text-base bg-primary text-primary-foreground hover:scale-105 transition-transform glow-atomic"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
