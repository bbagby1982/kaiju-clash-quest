import { CustomMonsterInput, Monster } from '@/types/game';
import { MONSTERS } from '@/data/monsters';

export const BLANK_MONSTER_DRAFT: CustomMonsterInput = {
  id: '',
  name: '',
  title: '',
  era: '',
  description: '',
  stats: { speed: 60, strength: 60, defense: 60, specialAttack: 60 },
  specialAbility: { name: '', description: '', type: 'beam' },
  terrainBonus: [],
  rarity: 'rare',
  imageColor: 'hsl(120 40% 25%)',
  funFacts: [],
  strengths: [],
  weaknesses: [],
  facing: 'right',
};

export function draftFromMonster(m: Monster | undefined): CustomMonsterInput {
  if (!m) return BLANK_MONSTER_DRAFT;
  const { custom: _custom, ...rest } = m;
  return {
    ...BLANK_MONSTER_DRAFT,
    ...rest,
    stats: { ...BLANK_MONSTER_DRAFT.stats, ...rest.stats },
    specialAbility: { ...BLANK_MONSTER_DRAFT.specialAbility, ...rest.specialAbility },
  };
}

export function findStaticMonster(id: string): Monster | undefined {
  return MONSTERS.find((m) => m.id === id);
}
