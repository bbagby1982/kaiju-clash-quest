import { GameMap } from '@/types/game';

export const GAME_MAPS: GameMap[] = [
  {
    id: 'tokyo-city',
    name: 'Tokyo Metropolis',
    description: 'A sprawling cityscape of towering skyscrapers and neon lights. Buildings crumble as titans clash.',
    terrain: 'city',
    bonusMonsters: ['showa-godzilla', 'heisei-godzilla', 'millennium-godzilla', 'evolved-godzilla'],
    backgroundColor: 'hsl(220 30% 15%)',
    accentColor: 'hsl(280 80% 50%)',
  },
  {
    id: 'skull-island',
    name: 'Skull Island',
    description: 'A prehistoric jungle paradise filled with ancient ruins and hidden dangers. Kong\'s domain.',
    terrain: 'island',
    bonusMonsters: ['king-kong', 'kong-armed'],
    backgroundColor: 'hsl(120 30% 20%)',
    accentColor: 'hsl(45 80% 50%)',
  },
  {
    id: 'pacific-depths',
    name: 'Pacific Abyss',
    description: 'The deep ocean trenches where Godzilla rests. Dark waters hide ancient secrets.',
    terrain: 'ocean',
    bonusMonsters: ['showa-godzilla', 'monsterverse-godzilla', 'sharkgera'],
    backgroundColor: 'hsl(210 60% 15%)',
    accentColor: 'hsl(180 70% 45%)',
  },
  {
    id: 'hollow-earth-volcano',
    name: 'Hollow Earth Volcano',
    description: 'A massive volcanic cavern in the Hollow Earth. Rivers of lava illuminate the ancient battlefield.',
    terrain: 'volcano',
    bonusMonsters: ['heisei-godzilla', 'burning-godzilla', 'evolved-godzilla'],
    backgroundColor: 'hsl(15 70% 15%)',
    accentColor: 'hsl(30 100% 55%)',
  },
  {
    id: 'boston-ruins',
    name: 'Boston Aftermath',
    description: 'The ruins of a great battle. Shattered buildings and craters mark where titans fought.',
    terrain: 'ruins',
    bonusMonsters: ['monsterverse-godzilla', 'millennium-godzilla', 'kong-armed'],
    backgroundColor: 'hsl(30 20% 15%)',
    accentColor: 'hsl(45 50% 45%)',
  },
  {
    id: 'abyssal-tunnels',
    name: 'Abyssal Tunnels',
    description: 'Ancient underwater caverns with bioluminescent walls. Massive waves surge through narrow passages as titans race through the depths.',
    terrain: 'ocean',
    bonusMonsters: ['sharkgera', 'monsterverse-godzilla', 'showa-godzilla'],
    backgroundColor: 'hsl(200 70% 10%)',
    accentColor: 'hsl(195 100% 50%)',
    obstacles: ['wave_surge', 'tunnel_squeeze', 'whirlpool', 'kelp_tangle', 'pressure_zone'],
    weatherEffects: ['deep_current', 'bioluminescence', 'thermal_vent'],
  },
];

// Race-specific map data for visual rendering
export interface RaceMapData {
  id: string;
  segments: RaceSegment[];
  totalLength: number;
}

export interface RaceSegment {
  type: 'open' | 'tunnel' | 'obstacle_zone';
  name: string;
  startPercent: number;
  endPercent: number;
  obstacles?: RaceObstacle[];
  visualEffect?: string;
}

export interface RaceObstacle {
  type: 'wave' | 'whirlpool' | 'debris' | 'kelp' | 'pressure';
  position: number; // 0-100 within segment
  difficulty: 'easy' | 'medium' | 'hard';
  qteType: 'jump' | 'dodge' | 'smash';
  description: string;
}

export const RACE_MAP_DATA: Record<string, RaceMapData> = {
  'abyssal-tunnels': {
    id: 'abyssal-tunnels',
    totalLength: 100,
    segments: [
      {
        type: 'open',
        name: 'Descent Zone',
        startPercent: 0,
        endPercent: 15,
        visualEffect: 'bubbles',
      },
      {
        type: 'tunnel',
        name: 'Coral Tunnel',
        startPercent: 15,
        endPercent: 30,
        obstacles: [
          { type: 'debris', position: 40, difficulty: 'easy', qteType: 'smash', description: 'Coral debris blocking the path!' },
          { type: 'kelp', position: 80, difficulty: 'easy', qteType: 'dodge', description: 'Thick kelp tangles ahead!' },
        ],
        visualEffect: 'coral_glow',
      },
      {
        type: 'obstacle_zone',
        name: 'Wave Surge Chamber',
        startPercent: 30,
        endPercent: 45,
        obstacles: [
          { type: 'wave', position: 30, difficulty: 'medium', qteType: 'jump', description: 'Massive wave incoming!' },
          { type: 'wave', position: 70, difficulty: 'medium', qteType: 'jump', description: 'Double wave surge!' },
        ],
        visualEffect: 'wave_pulse',
      },
      {
        type: 'tunnel',
        name: 'Bioluminescent Passage',
        startPercent: 45,
        endPercent: 60,
        obstacles: [
          { type: 'pressure', position: 50, difficulty: 'medium', qteType: 'dodge', description: 'Pressure zone - stay centered!' },
        ],
        visualEffect: 'bio_lights',
      },
      {
        type: 'obstacle_zone',
        name: 'Whirlpool Gauntlet',
        startPercent: 60,
        endPercent: 75,
        obstacles: [
          { type: 'whirlpool', position: 25, difficulty: 'hard', qteType: 'dodge', description: 'Massive whirlpool! Dodge left or right!' },
          { type: 'whirlpool', position: 60, difficulty: 'hard', qteType: 'dodge', description: 'Another whirlpool forms!' },
        ],
        visualEffect: 'spiral_water',
      },
      {
        type: 'tunnel',
        name: 'Thermal Vent Tunnel',
        startPercent: 75,
        endPercent: 90,
        obstacles: [
          { type: 'debris', position: 40, difficulty: 'medium', qteType: 'smash', description: 'Hot rocks blocking the way!' },
        ],
        visualEffect: 'thermal_glow',
      },
      {
        type: 'open',
        name: 'Final Sprint',
        startPercent: 90,
        endPercent: 100,
        visualEffect: 'surface_light',
      },
    ],
  },
};

export const getRandomMap = (): GameMap => {
  return GAME_MAPS[Math.floor(Math.random() * GAME_MAPS.length)];
};

export const getMapById = (id: string): GameMap | undefined => {
  return GAME_MAPS.find(m => m.id === id);
};

export const getRaceMapData = (mapId: string): RaceMapData | undefined => {
  return RACE_MAP_DATA[mapId];
};

export const getOceanMaps = (): GameMap[] => {
  return GAME_MAPS.filter(m => m.terrain === 'ocean');
};
