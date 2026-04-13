import { useMemo } from 'react';

export type WeatherType = 'clear' | 'rain' | 'storm' | 'fog' | 'ash' | 'blizzard';

interface RaceWeatherProps {
  weather: WeatherType;
  intensity?: number;
}

export function RaceWeather({ weather, intensity = 1 }: RaceWeatherProps) {
  const weatherElements = useMemo(() => {
    switch (weather) {
      case 'rain':
        return <RainEffect intensity={intensity} />;
      case 'storm':
        return <StormEffect intensity={intensity} />;
      case 'fog':
        return <FogEffect intensity={intensity} />;
      case 'ash':
        return <AshEffect intensity={intensity} />;
      case 'blizzard':
        return <BlizzardEffect intensity={intensity} />;
      default:
        return null;
    }
  }, [weather, intensity]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {weatherElements}
    </div>
  );
}

function RainEffect({ intensity }: { intensity: number }) {
  const dropCount = Math.floor(50 * intensity);
  
  return (
    <>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[hsl(210_50%_10%/0.3)]" />
      
      {/* Rain drops */}
      {Array.from({ length: dropCount }).map((_, i) => (
        <div
          key={i}
          className="absolute w-0.5 bg-gradient-to-b from-transparent via-[hsl(200_80%_70%/0.4)] to-[hsl(200_80%_70%/0.1)] animate-rain-fall"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 20}%`,
            height: `${30 + Math.random() * 50}px`,
            animationDuration: `${0.3 + Math.random() * 0.3}s`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}
      
      {/* Splash effects at bottom */}
      {Array.from({ length: Math.floor(dropCount / 3) }).map((_, i) => (
        <div
          key={`splash-${i}`}
          className="absolute bottom-0 w-2 h-1 rounded-full bg-[hsl(200_80%_80%/0.3)] animate-splash"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 1}s`,
          }}
        />
      ))}
    </>
  );
}

function StormEffect({ intensity }: { intensity: number }) {
  return (
    <>
      <RainEffect intensity={intensity * 1.5} />
      
      {/* Lightning flashes */}
      <div className="absolute inset-0 animate-lightning-flash">
        <div className="absolute inset-0 bg-[hsl(60_100%_95%/0.15)]" />
      </div>
      
      {/* Additional lightning bolts */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-lightning-bolt"
          style={{
            left: `${20 + i * 30}%`,
            top: 0,
            width: '3px',
            height: '40%',
            background: `linear-gradient(180deg, hsl(60 100% 90%), hsl(60 100% 70%), transparent)`,
            opacity: 0,
            animationDelay: `${i * 2 + Math.random() * 2}s`,
          }}
        />
      ))}
      
      {/* Storm clouds */}
      <div className="absolute top-0 left-0 right-0 h-1/3 opacity-60">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-[hsl(220_40%_20%)] rounded-full blur-xl animate-cloud-drift"
            style={{
              left: `${i * 25 - 10}%`,
              top: `${Math.random() * 20}%`,
              width: `${150 + Math.random() * 100}px`,
              height: `${80 + Math.random() * 40}px`,
              animationDelay: `${i * 2}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}

function FogEffect({ intensity }: { intensity: number }) {
  return (
    <>
      {/* Fog layers */}
      <div 
        className="absolute inset-0 animate-fog-drift"
        style={{
          background: `radial-gradient(ellipse at center, transparent 20%, hsl(200 20% 80% / ${0.4 * intensity}) 60%, hsl(200 15% 70% / ${0.6 * intensity}) 100%)`,
        }}
      />
      
      {/* Moving fog patches */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute bg-[hsl(200_15%_85%)] rounded-full blur-3xl animate-fog-patch"
          style={{
            left: `${i * 15 - 10}%`,
            top: `${30 + Math.sin(i) * 20}%`,
            width: `${200 + Math.random() * 150}px`,
            height: `${100 + Math.random() * 80}px`,
            opacity: 0.3 * intensity,
            animationDelay: `${i * 1.5}s`,
          }}
        />
      ))}
      
      {/* Visibility gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, hsl(200 20% 80% / ${0.5 * intensity}) 0%, transparent 30%, transparent 70%, hsl(200 20% 80% / ${0.5 * intensity}) 100%)`,
        }}
      />
    </>
  );
}

function AshEffect({ intensity }: { intensity: number }) {
  const particleCount = Math.floor(80 * intensity);
  
  return (
    <>
      {/* Orange tint overlay */}
      <div className="absolute inset-0 bg-[hsl(25_60%_20%/0.25)]" />
      
      {/* Ash particles */}
      {Array.from({ length: particleCount }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-ash-fall"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${-10 + (Date.now() * 0.01 + i * 20) % 120}%`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            background: `hsl(${20 + Math.random() * 20} ${30 + Math.random() * 20}% ${30 + Math.random() * 30}%)`,
            animationDuration: `${4 + Math.random() * 3}s`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}
      
      {/* Heat shimmer effect */}
      <div className="absolute inset-0 animate-heat-shimmer opacity-20">
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(30_100%_50%/0.1)] to-transparent" />
      </div>
    </>
  );
}

function BlizzardEffect({ intensity }: { intensity: number }) {
  const snowCount = Math.floor(100 * intensity);
  
  return (
    <>
      {/* White tint overlay */}
      <div className="absolute inset-0 bg-[hsl(200_30%_95%/0.2)]" />
      
      {/* Snow particles */}
      {Array.from({ length: snowCount }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-snow-fall"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${-10 + Math.random() * 10}%`,
            width: `${3 + Math.random() * 5}px`,
            height: `${3 + Math.random() * 5}px`,
            opacity: 0.6 + Math.random() * 0.4,
            animationDuration: `${2 + Math.random() * 3}s`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
      
      {/* Wind streaks */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={`streak-${i}`}
          className="absolute h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-wind-streak"
          style={{
            left: `-20%`,
            top: `${10 + i * 8}%`,
            width: `${50 + Math.random() * 100}px`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
      
      {/* Visibility reduction */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent 30%, hsl(200 30% 90% / ${0.4 * intensity}) 100%)`,
        }}
      />
    </>
  );
}

export function getRandomWeather(terrain: string): WeatherType {
  const weatherByTerrain: Record<string, WeatherType[]> = {
    ocean: ['clear', 'rain', 'storm', 'fog'],
    city: ['clear', 'rain', 'fog'],
    volcano: ['clear', 'ash'],
    island: ['clear', 'rain', 'fog'],
    ruins: ['clear', 'fog', 'ash'],
  };

  const options = weatherByTerrain[terrain] || ['clear'];
  return options[Math.floor(Math.random() * options.length)];
}

export function getWeatherSpeedModifier(weather: WeatherType): number {
  switch (weather) {
    case 'rain':
      return 0.95;
    case 'storm':
      return 0.85;
    case 'fog':
      return 0.9;
    case 'ash':
      return 0.92;
    case 'blizzard':
      return 0.8;
    default:
      return 1;
  }
}
