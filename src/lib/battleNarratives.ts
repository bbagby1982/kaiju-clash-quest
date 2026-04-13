import { Monster, GameMap, Booster } from '@/types/game';

interface BattleNarrativeContext {
  playerMonster: Monster;
  opponentMonster: Monster;
  trait: keyof Monster['stats'];
  winner: 'player' | 'opponent' | 'tie';
  map?: GameMap;
  booster?: Booster | null;
}

const traitLabels: Record<keyof Monster['stats'], string> = {
  speed: 'Speed',
  strength: 'Strength',
  defense: 'Defense',
  specialAttack: 'Special Attack',
};

const terrainDescriptions: Record<string, string> = {
  city: 'the crumbling cityscape',
  island: 'the tropical island shores',
  ocean: 'the churning ocean waves',
  volcano: 'the fiery volcanic crater',
  ruins: 'the ancient mysterious ruins',
};

const speedOpenings = [
  "The ground trembles as {player} and {opponent} face off!",
  "Lightning crackles in the air as {player} squares up against {opponent}!",
  "The crowd roars as {player} and {opponent} prepare to race into action!",
  "A gust of wind sweeps through as {player} locks eyes with {opponent}!",
];

const strengthOpenings = [
  "The earth SHAKES as {player} and {opponent} collide!",
  "Buildings crumble as {player} charges toward {opponent}!",
  "A thunderous BOOM echoes as {player} faces the mighty {opponent}!",
  "The ground cracks beneath their feet as {player} challenges {opponent}!",
];

const defenseOpenings = [
  "{opponent} launches a devastating attack at {player}!",
  "The battle begins with {opponent} unleashing fury on {player}!",
  "A barrage of attacks rains down as {player} faces {opponent}!",
  "{opponent} goes all-out against {player} from the start!",
];

const specialAttackOpenings = [
  "Energy crackles as {player} and {opponent} power up!",
  "The sky lights up as {player} prepares to face {opponent}!",
  "Sparks fly as {player} and {opponent} charge their ultimate abilities!",
  "A blinding glow surrounds the battlefield as both monsters ready their powers!",
];

const speedActions = {
  playerWin: [
    "{player} moved like a BLUR! 💨 {opponent} couldn't keep up with that incredible speed!",
    "With lightning-fast reflexes, {player} dashed circles around {opponent}! ⚡",
    "{player} was TOO FAST! Before {opponent} could blink, it was all over! 💨",
  ],
  opponentWin: [
    "{opponent} was UNSTOPPABLE! {player} couldn't match that blazing speed! 💨",
    "In a flash, {opponent} outran {player} and struck first! ⚡",
    "{player} tried to keep up, but {opponent} was just TOO QUICK! 💨",
  ],
};

const strengthActions = {
  playerWin: [
    "{player} delivered a CRUSHING blow! 💪 {opponent} went flying across the battlefield!",
    "With unstoppable POWER, {player} slammed {opponent} into the ground! 💥",
    "{player}'s mighty attack sent {opponent} crashing through everything! 💪",
  ],
  opponentWin: [
    "{opponent} unleashed DEVASTATING power! {player} couldn't withstand it! 💥",
    "One mighty swing from {opponent} sent {player} tumbling! 💪",
    "{player} was OVERPOWERED! {opponent}'s strength was too much! 💥",
  ],
};

const defenseActions = {
  playerWin: [
    "{player} stood FIRM like a mountain! 🛡️ Every attack from {opponent} bounced off!",
    "Nothing could break through {player}'s incredible defense! 🛡️ {opponent} exhausted itself trying!",
    "{player} tanked EVERYTHING {opponent} threw and kept standing! 💪🛡️",
  ],
  opponentWin: [
    "{opponent}'s defenses were IMPENETRABLE! {player}'s attacks did nothing! 🛡️",
    "{player} gave it everything, but {opponent} was an UNBREAKABLE wall! 🛡️",
    "No matter how hard {player} tried, {opponent}'s armor held strong! 💪🛡️",
  ],
};

const specialAttackActions = {
  playerWin: [
    "{player} unleashed {ability}! ✨ The DEVASTATING beam overwhelmed {opponent}!",
    "A brilliant flash of {ability} erupted from {player}! 💫 {opponent} didn't stand a chance!",
    "{player}'s {ability} was INCREDIBLE! ⚡ {opponent} was caught in the blast!",
  ],
  opponentWin: [
    "{opponent}'s special attack was OVERWHELMING! {player} couldn't counter it! ✨",
    "A massive blast of energy from {opponent} engulfed {player}! 💫",
    "{opponent} unleashed an UNSTOPPABLE ability! {player} was blown away! ⚡",
  ],
};

const victoryConclusionsPlayer = [
  "🏆 VICTORY for {player}! The crowd goes WILD!",
  "🎉 {player} WINS! What an incredible battle!",
  "🏆 {player} is the CHAMPION! {opponent} retreats in defeat!",
  "🎉 The winner is {player}! An epic showdown!",
];

const defeatConclusionsOpponent = [
  "💔 {opponent} claims victory... but {player} will be back stronger!",
  "😔 {player} falls to {opponent}, but this isn't over!",
  "💔 {opponent} wins this round... {player} vows revenge!",
  "😔 Tough loss for {player}, but tomorrow is another day!",
];

const tieConclusionsNeutral = [
  "⚖️ It's a TIE! Both monsters are perfectly matched!",
  "🤝 Neither could defeat the other! A legendary draw!",
  "⚖️ STALEMATE! These titans are equals!",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function replacePlaceholders(
  template: string, 
  player: string, 
  opponent: string, 
  ability?: string
): string {
  return template
    .replace(/{player}/g, player)
    .replace(/{opponent}/g, opponent)
    .replace(/{ability}/g, ability || 'special power');
}

export function generateBattleStory(context: BattleNarrativeContext): string {
  const { playerMonster, opponentMonster, trait, winner, map, booster } = context;
  const player = playerMonster.name;
  const opponent = opponentMonster.name;
  const playerAbility = playerMonster.specialAbility.name;

  let story = '';

  // Opening based on terrain or generic
  const terrain = map ? terrainDescriptions[map.terrain] : 'the battlefield';
  
  // Pick opening based on trait
  let openings: string[];
  switch (trait) {
    case 'speed':
      openings = speedOpenings;
      break;
    case 'strength':
      openings = strengthOpenings;
      break;
    case 'defense':
      openings = defenseOpenings;
      break;
    case 'specialAttack':
      openings = specialAttackOpenings;
      break;
    default:
      openings = speedOpenings;
  }
  
  story += replacePlaceholders(pickRandom(openings), player, opponent) + ' ';

  // Add terrain flavor if present
  if (map) {
    const terrainBonusPlayer = playerMonster.terrainBonus?.includes(map.terrain);
    const terrainBonusOpponent = opponentMonster.terrainBonus?.includes(map.terrain);
    
    if (terrainBonusPlayer) {
      story += `${player} feels right at home in ${terrain}! 🌟 `;
    } else if (terrainBonusOpponent) {
      story += `${opponent} has the terrain advantage in ${terrain}! `;
    }
  }

  // Add booster flavor
  if (booster) {
    story += `${player}'s ${booster.name} booster kicks in! ${booster.icon} `;
  }

  // Action based on trait and winner
  let actions: { playerWin: string[]; opponentWin: string[] };
  switch (trait) {
    case 'speed':
      actions = speedActions;
      break;
    case 'strength':
      actions = strengthActions;
      break;
    case 'defense':
      actions = defenseActions;
      break;
    case 'specialAttack':
      actions = specialAttackActions;
      break;
    default:
      actions = speedActions;
  }

  if (winner === 'player') {
    story += replacePlaceholders(pickRandom(actions.playerWin), player, opponent, playerAbility) + ' ';
    story += replacePlaceholders(pickRandom(victoryConclusionsPlayer), player, opponent);
  } else if (winner === 'opponent') {
    story += replacePlaceholders(pickRandom(actions.opponentWin), player, opponent, playerAbility) + ' ';
    story += replacePlaceholders(pickRandom(defeatConclusionsOpponent), player, opponent);
  } else {
    story += `Both monsters gave it their ALL in the ${traitLabels[trait].toLowerCase()} showdown! `;
    story += replacePlaceholders(pickRandom(tieConclusionsNeutral), player, opponent);
  }

  return story;
}

export function getTraitEmoji(trait: keyof Monster['stats']): string {
  switch (trait) {
    case 'speed':
      return '💨';
    case 'strength':
      return '💪';
    case 'defense':
      return '🛡️';
    case 'specialAttack':
      return '✨';
    default:
      return '⚔️';
  }
}
