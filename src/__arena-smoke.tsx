import { createRoot } from 'react-dom/client';
import { RosterProvider } from '@/lib/roster';
import { BattleSimulation } from '@/components/game/BattleSimulation';
import { MONSTERS } from '@/data/monsters';
import { GAME_MAPS } from '@/data/maps';
import './index.css';

const q = new URLSearchParams(location.search);
const mapId = q.get('map') || 'tokyo-city';
const map = GAME_MAPS.find(m => m.id === mapId) || GAME_MAPS[0];
const p = MONSTERS.find(m => m.id === (q.get('p') || 'heisei-godzilla')) || MONSTERS[0];
const o = MONSTERS.find(m => m.id === (q.get('o') || 'king-kong')) || MONSTERS[1];

createRoot(document.getElementById('root')!).render(
  <RosterProvider>
    <BattleSimulation
      playerMonster={p}
      opponentMonster={o}
      battleFocus="allOut"
      map={map}
      booster={{ id: 'b', name: 'Atomic Surge', description: 'more special attack', effect: 'attack', power: 12, icon: '⚡', color: '#eab308' }}
      onBattleEnd={(won, id, trait) => { (window as unknown as Record<string, unknown>).__battleEnd = { won, id, trait }; }}
    />
  </RosterProvider>
);
