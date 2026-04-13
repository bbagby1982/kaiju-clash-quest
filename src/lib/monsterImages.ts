// Centralized monster image utility
// All monster images should be imported and mapped here

import showaGodzilla from '@/assets/monsters/showa-godzilla.png';
import kingKong from '@/assets/monsters/king-kong.png';
import heiseiGodzilla from '@/assets/monsters/heisei-godzilla.png';
import evolvedGodzilla from '@/assets/monsters/evolved-godzilla.png';
import millenniumGodzilla from '@/assets/monsters/millennium-godzilla.png';
import monsterverseGodzilla from '@/assets/monsters/monsterverse-godzilla.png';
import burningGodzilla from '@/assets/monsters/burning-godzilla.png';
import battleKong from '@/assets/monsters/battle-kong.png';
import sharkgera from '@/assets/monsters/sharkgera.png';
import crystalSerpent from '@/assets/monsters/crystal-serpent.png';
import stormTitan from '@/assets/monsters/storm-titan.png';

// Map all monster IDs to their image imports
const monsterImages: Record<string, string> = {
  'showa-godzilla': showaGodzilla,
  'king-kong': kingKong,
  'heisei-godzilla': heiseiGodzilla,
  'evolved-godzilla': evolvedGodzilla,
  'millennium-godzilla': millenniumGodzilla,
  'monsterverse-godzilla': monsterverseGodzilla,
  'burning-godzilla': burningGodzilla,
  'kong-armed': battleKong,
  'sharkgera': sharkgera,
  'crystal-serpent': crystalSerpent,
  'storm-titan': stormTitan,
};

// Category-based emoji fallbacks for monsters without images
const categoryEmojis: Record<string, string> = {
  // Godzilla variants
  godzilla: '🦎',
  // Kong variants
  kong: '🦍',
  // Elemental
  fire: '🔥',
  ice: '❄️',
  lightning: '⚡',
  water: '🌊',
  wind: '🌪️',
  // Ocean creatures
  shark: '🦈',
  octopus: '🐙',
  squid: '🦑',
  whale: '🐋',
  // Mecha/Tech
  mecha: '🤖',
  robot: '⚙️',
  cyber: '🔌',
  // Supernatural
  ghost: '👻',
  undead: '💀',
  demon: '👿',
  // Cosmic
  cosmic: '⭐',
  space: '🌌',
  meteor: '☄️',
  // Nature
  plant: '🌿',
  mushroom: '🍄',
  flower: '🌺',
  // Mythological
  dragon: '🐉',
  phoenix: '🔥',
  griffin: '🦅',
  // Silly/Fun
  sock: '🧦',
  pizza: '🍕',
  party: '🎉',
  // Default
  default: '👹',
};

/**
 * Get the appropriate emoji for a monster based on its ID or name
 */
function getMonsterEmoji(monsterId: string, monsterName?: string): string {
  const searchTerms = [monsterId.toLowerCase(), (monsterName || '').toLowerCase()].join(' ');
  
  for (const [keyword, emoji] of Object.entries(categoryEmojis)) {
    if (searchTerms.includes(keyword)) {
      return emoji;
    }
  }
  
  return categoryEmojis.default;
}

/**
 * Get monster image source by ID
 * Returns bundled image if available, otherwise tries the cloud API
 */
export function getMonsterImage(monsterId: string): string | undefined {
  // First check bundled images (fast, works offline)
  if (monsterImages[monsterId]) {
    return monsterImages[monsterId];
  }
  // For all other monsters, try loading from Netlify Blobs
  return `/api/monster-image/${monsterId}`;
}

/**
 * Check if a monster has a dedicated image
 */
export function hasMonsterImage(monsterId: string): boolean {
  return monsterId in monsterImages;
}

/**
 * Get a fallback emoji for monsters without images
 */
export function getMonsterFallbackEmoji(monsterId: string, monsterName?: string): string {
  return getMonsterEmoji(monsterId, monsterName);
}

/**
 * Get all available monster image IDs
 */
export function getAvailableMonsterImageIds(): string[] {
  return Object.keys(monsterImages);
}

// Default export for convenience
export default monsterImages;
