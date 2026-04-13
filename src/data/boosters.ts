import { Booster, WeatherEffect } from '@/types/game';

export const BOOSTERS: Booster[] = [
  {
    id: 'atomic-surge',
    name: 'Atomic Surge',
    description: '+15 to Special Attack power',
    effect: 'attack',
    power: 15,
    icon: '⚡',
    color: 'hsl(var(--primary))',
  },
  {
    id: 'armor-plating',
    name: 'Armor Plating',
    description: '+15 to Defense',
    effect: 'defense',
    power: 15,
    icon: '🛡️',
    color: 'hsl(var(--electric-blue))',
  },
  {
    id: 'speed-burst',
    name: 'Speed Burst',
    description: '+15 to Speed',
    effect: 'speed',
    power: 15,
    icon: '💨',
    color: 'hsl(var(--lightning))',
  },
  {
    id: 'terrain-mastery',
    name: 'Terrain Mastery',
    description: 'Bonus on any terrain type',
    effect: 'terrain',
    power: 10,
    icon: '🌍',
    color: 'hsl(120 50% 40%)',
    unlockRequirement: { type: 'battles_won', value: 5 },
  },
  {
    id: 'chaos-mode',
    name: 'Chaos Mode',
    description: 'Random effects for both monsters!',
    effect: 'random',
    power: 20,
    icon: '🎲',
    color: 'hsl(280 70% 50%)',
    unlockRequirement: { type: 'battles_won', value: 10 },
  },
];

export const WEATHER_EFFECTS: WeatherEffect[] = [
  {
    id: 'clear',
    name: 'Clear Skies',
    description: 'Perfect racing conditions',
    speedModifier: 1,
    visibilityModifier: 1,
    icon: '☀️',
  },
  {
    id: 'rain',
    name: 'Heavy Rain',
    description: 'Reduced speed and visibility',
    speedModifier: 0.85,
    visibilityModifier: 0.7,
    icon: '🌧️',
  },
  {
    id: 'lightning',
    name: 'Lightning Storm',
    description: 'Unpredictable speed bursts',
    speedModifier: 1.1,
    visibilityModifier: 0.8,
    icon: '⚡',
  },
  {
    id: 'fog',
    name: 'Dense Fog',
    description: 'Very low visibility',
    speedModifier: 0.9,
    visibilityModifier: 0.5,
    icon: '🌫️',
  },
  {
    id: 'volcanic-ash',
    name: 'Volcanic Ash',
    description: 'Reduced speed, fire monsters excel',
    speedModifier: 0.8,
    visibilityModifier: 0.6,
    icon: '🌋',
  },
  {
    id: 'snow',
    name: 'Blizzard',
    description: 'Slippery terrain, reduced speed',
    speedModifier: 0.75,
    visibilityModifier: 0.6,
    icon: '❄️',
  },
];

export const getRandomWeather = (): WeatherEffect => {
  return WEATHER_EFFECTS[Math.floor(Math.random() * WEATHER_EFFECTS.length)];
};

export const getUnlockedBoosters = (progress: { wins: number; unlockedBoosters: string[] }): Booster[] => {
  return BOOSTERS.filter(b => {
    if (!b.unlockRequirement) return true;
    if (b.unlockRequirement.type === 'battles_won') {
      return progress.wins >= b.unlockRequirement.value;
    }
    return progress.unlockedBoosters.includes(b.id);
  });
};
