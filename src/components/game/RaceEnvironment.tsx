import { useMemo } from 'react';
import { GameMap } from '@/types/game';

interface RaceEnvironmentProps {
  map: GameMap;
  scrollPosition: number;
}

interface EnvironmentLayer {
  className: string;
  elements: React.ReactNode[];
  parallaxSpeed: number;
}

export function RaceEnvironment({ map, scrollPosition }: RaceEnvironmentProps) {
  const layers = useMemo(() => getEnvironmentLayers(map, scrollPosition), [map, scrollPosition]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {layers.map((layer, i) => (
        <div
          key={i}
          className={`absolute inset-0 ${layer.className}`}
          style={{
            transform: `translateX(${-scrollPosition * layer.parallaxSpeed}px)`,
          }}
        >
          {layer.elements}
        </div>
      ))}
    </div>
  );
}

function getEnvironmentLayers(map: GameMap, scrollPosition: number): EnvironmentLayer[] {
  switch (map.terrain) {
    case 'ocean':
      return getOceanLayers(scrollPosition);
    case 'city':
      return getCityLayers(scrollPosition);
    case 'volcano':
      return getVolcanoLayers(scrollPosition);
    case 'island':
      return getIslandLayers(scrollPosition);
    case 'ruins':
      return getRuinsLayers(scrollPosition);
    default:
      return getOceanLayers(scrollPosition);
  }
}

function getOceanLayers(scrollPosition: number): EnvironmentLayer[] {
  return [
    // Far background - deep ocean gradient
    {
      className: 'bg-gradient-to-b from-[hsl(210_70%_15%)] via-[hsl(210_80%_10%)] to-[hsl(220_90%_5%)]',
      elements: [
        // Surface light rays
        <div key="rays" className="absolute top-0 left-0 right-0 h-1/3 opacity-20">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full bg-gradient-to-b from-[hsl(195_100%_70%/0.3)] to-transparent animate-pulse-slow"
              style={{
                left: `${i * 15 + 5}%`,
                width: '8%',
                transform: `skewX(-15deg)`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.1,
    },
    // Mid layer - coral formations
    {
      className: '',
      elements: [
        <div key="coral" className="absolute bottom-0 left-0 right-0 h-1/3">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 rounded-t-full"
              style={{
                left: `${(i * 200 + 50) % 2000}px`,
                width: `${40 + Math.random() * 60}px`,
                height: `${60 + Math.random() * 100}px`,
                background: `linear-gradient(180deg, hsl(${330 + Math.random() * 40} 70% 50%), hsl(${320 + Math.random() * 40} 60% 30%))`,
                opacity: 0.6 + Math.random() * 0.3,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.3,
    },
    // Near layer - bubbles
    {
      className: '',
      elements: [
        <div key="bubbles" className="absolute inset-0">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-[hsl(195_100%_80%/0.2)] animate-bubble-rise"
              style={{
                left: `${(i * 100 + scrollPosition * 0.1) % 100}%`,
                bottom: `${-20 + (scrollPosition * 0.5 + i * 50) % 120}%`,
                width: `${8 + Math.random() * 16}px`,
                height: `${8 + Math.random() * 16}px`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.5,
    },
    // Bioluminescent particles
    {
      className: '',
      elements: [
        <div key="biolum" className="absolute inset-0">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${2 + Math.random() * 4}px`,
                height: `${2 + Math.random() * 4}px`,
                background: `hsl(${180 + Math.random() * 40} 100% 70%)`,
                boxShadow: `0 0 ${10 + Math.random() * 10}px hsl(${180 + Math.random() * 40} 100% 60%)`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.2,
    },
  ];
}

function getCityLayers(scrollPosition: number): EnvironmentLayer[] {
  return [
    // Far background - sky with smoke
    {
      className: 'bg-gradient-to-b from-[hsl(220_30%_20%)] via-[hsl(220_25%_15%)] to-[hsl(220_20%_10%)]',
      elements: [
        <div key="smoke" className="absolute inset-0 opacity-30">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-[hsl(0_0%_40%/0.3)] rounded-full blur-xl animate-smoke-drift"
              style={{
                left: `${i * 25}%`,
                top: `${10 + i * 5}%`,
                width: `${100 + Math.random() * 100}px`,
                height: `${60 + Math.random() * 40}px`,
                animationDelay: `${i * 2}s`,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.1,
    },
    // Far buildings - silhouettes
    {
      className: '',
      elements: [
        <div key="far-buildings" className="absolute bottom-0 left-0 right-0 h-2/3">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 bg-[hsl(220_30%_8%)]"
              style={{
                left: `${(i * 150) % 2000}px`,
                width: `${60 + Math.random() * 80}px`,
                height: `${150 + Math.random() * 200}px`,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.2,
    },
    // Near buildings with windows
    {
      className: '',
      elements: [
        <div key="near-buildings" className="absolute bottom-0 left-0 right-0 h-1/2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 bg-[hsl(220_25%_12%)] border-t border-[hsl(220_20%_20%)]"
              style={{
                left: `${(i * 250 + 100) % 2000}px`,
                width: `${80 + Math.random() * 100}px`,
                height: `${100 + Math.random() * 150}px`,
              }}
            >
              {/* Windows */}
              {Array.from({ length: 6 }).map((_, j) => (
                <div
                  key={j}
                  className="absolute bg-[hsl(50_80%_60%/0.6)]"
                  style={{
                    left: `${20 + (j % 2) * 40}%`,
                    top: `${10 + Math.floor(j / 2) * 30}%`,
                    width: '20%',
                    height: '15%',
                  }}
                />
              ))}
            </div>
          ))}
        </div>,
      ],
      parallaxSpeed: 0.4,
    },
    // Debris and fire
    {
      className: '',
      elements: [
        <div key="fires" className="absolute inset-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-pulse"
              style={{
                left: `${(i * 150 + 50) % 1500}px`,
                bottom: `${Math.random() * 30}%`,
                width: `${20 + Math.random() * 30}px`,
                height: `${30 + Math.random() * 40}px`,
                background: `radial-gradient(ellipse at bottom, hsl(30 100% 60%), hsl(0 100% 50%), transparent)`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.5,
    },
  ];
}

function getVolcanoLayers(scrollPosition: number): EnvironmentLayer[] {
  return [
    // Far background - smoky sky
    {
      className: 'bg-gradient-to-b from-[hsl(15_50%_15%)] via-[hsl(10_60%_12%)] to-[hsl(0_70%_8%)]',
      elements: [
        <div key="ash-sky" className="absolute inset-0 opacity-40">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-[hsl(0_0%_30%)] rounded-full animate-ash-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${(scrollPosition * 0.1 + i * 20) % 120 - 20}%`,
                width: `${2 + Math.random() * 4}px`,
                height: `${2 + Math.random() * 4}px`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.1,
    },
    // Lava rivers
    {
      className: '',
      elements: [
        <div key="lava" className="absolute bottom-0 left-0 right-0 h-1/4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 animate-lava-flow"
              style={{
                left: `${(i * 400) % 2000}px`,
                width: `${100 + Math.random() * 150}px`,
                height: `${20 + Math.random() * 30}px`,
                background: `linear-gradient(90deg, hsl(30 100% 50%), hsl(15 100% 55%), hsl(0 100% 45%))`,
                borderRadius: '50%',
                boxShadow: `0 0 30px hsl(30 100% 50%), 0 0 60px hsl(15 100% 50%)`,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.3,
    },
    // Rocky formations
    {
      className: '',
      elements: [
        <div key="rocks" className="absolute bottom-0 left-0 right-0 h-2/5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0"
              style={{
                left: `${(i * 180 + 30) % 2000}px`,
                width: '0',
                height: '0',
                borderLeft: `${30 + Math.random() * 40}px solid transparent`,
                borderRight: `${30 + Math.random() * 40}px solid transparent`,
                borderBottom: `${80 + Math.random() * 100}px solid hsl(${15 + Math.random() * 15} 30% ${10 + Math.random() * 10}%)`,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.4,
    },
  ];
}

function getIslandLayers(scrollPosition: number): EnvironmentLayer[] {
  return [
    // Far background - jungle canopy
    {
      className: 'bg-gradient-to-b from-[hsl(120_40%_20%)] via-[hsl(130_35%_15%)] to-[hsl(140_30%_10%)]',
      elements: [
        <div key="mist" className="absolute inset-0 opacity-30">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-[hsl(120_20%_80%/0.2)] rounded-full blur-2xl"
              style={{
                left: `${i * 20}%`,
                top: `${30 + Math.sin(i) * 20}%`,
                width: `${150 + Math.random() * 100}px`,
                height: `${80 + Math.random() * 60}px`,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.1,
    },
    // Trees
    {
      className: '',
      elements: [
        <div key="trees" className="absolute bottom-0 left-0 right-0 h-3/4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="absolute bottom-0" style={{ left: `${(i * 150) % 2000}px` }}>
              {/* Trunk */}
              <div
                className="absolute bottom-0 bg-[hsl(30_40%_25%)]"
                style={{
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '20px',
                  height: `${60 + Math.random() * 40}px`,
                }}
              />
              {/* Canopy */}
              <div
                className="absolute rounded-full"
                style={{
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bottom: `${50 + Math.random() * 30}px`,
                  width: `${80 + Math.random() * 60}px`,
                  height: `${60 + Math.random() * 40}px`,
                  background: `radial-gradient(ellipse, hsl(${110 + Math.random() * 30} 50% 30%), hsl(${120 + Math.random() * 20} 40% 20%))`,
                }}
              />
            </div>
          ))}
        </div>,
      ],
      parallaxSpeed: 0.3,
    },
    // Leaves floating
    {
      className: '',
      elements: [
        <div key="leaves" className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-[hsl(100_60%_40%)] rounded-full animate-leaf-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${(scrollPosition * 0.2 + i * 30) % 120 - 20}%`,
                width: `${6 + Math.random() * 8}px`,
                height: `${4 + Math.random() * 4}px`,
                transform: `rotate(${Math.random() * 360}deg)`,
                animationDelay: `${Math.random() * 4}s`,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.5,
    },
  ];
}

function getRuinsLayers(scrollPosition: number): EnvironmentLayer[] {
  return [
    // Far background - dusty sky
    {
      className: 'bg-gradient-to-b from-[hsl(35_30%_25%)] via-[hsl(30_25%_18%)] to-[hsl(25_20%_12%)]',
      elements: [
        <div key="dust" className="absolute inset-0 opacity-40">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-[hsl(35_30%_60%/0.3)] rounded-full blur-md animate-dust-drift"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${20 + Math.random() * 40}px`,
                height: `${15 + Math.random() * 25}px`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.1,
    },
    // Ruined pillars
    {
      className: '',
      elements: [
        <div key="pillars" className="absolute bottom-0 left-0 right-0 h-2/3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 bg-[hsl(35_20%_25%)]"
              style={{
                left: `${(i * 200 + 80) % 2000}px`,
                width: `${30 + Math.random() * 20}px`,
                height: `${80 + Math.random() * 120}px`,
                clipPath: `polygon(0 ${Math.random() * 30}%, 100% 0, 100% 100%, 0 100%)`,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.3,
    },
    // Crumbled stones
    {
      className: '',
      elements: [
        <div key="stones" className="absolute bottom-0 left-0 right-0 h-1/4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 bg-[hsl(30_15%_30%)] rounded-sm"
              style={{
                left: `${(i * 100 + 20) % 2000}px`,
                width: `${20 + Math.random() * 40}px`,
                height: `${15 + Math.random() * 25}px`,
                transform: `rotate(${Math.random() * 20 - 10}deg)`,
              }}
            />
          ))}
        </div>,
      ],
      parallaxSpeed: 0.5,
    },
  ];
}
