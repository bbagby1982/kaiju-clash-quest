// Executable proof for src/lib/battleEngine.ts — run with `npm test`.
// Transpiles the TS module with esbuild (already a Vite dependency) and asserts behaviour.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'node_modules', '.cache', 'battleEngine.test.mjs');
await build({
  entryPoints: [path.join(root, 'src/lib/battleEngine.ts'), path.join(root, 'src/data/monsters.ts'), path.join(root, 'src/data/maps.ts')],
  bundle: true, format: 'esm', platform: 'node', outdir: path.dirname(out), outbase: path.join(root, 'src'),
  alias: { '@': path.join(root, 'src') },
  loader: { '.png': 'dataurl', '.webp': 'dataurl' },
  logLevel: 'silent',
});
const engine = await import(path.join(path.dirname(out), 'lib/battleEngine.js'));
const { MONSTERS } = await import(path.join(path.dirname(out), 'data/monsters.js'));
const { GAME_MAPS } = await import(path.join(path.dirname(out), 'data/maps.js'));

const { resolveRound, seededRng, MAX_ROUNDS, MAX_HP, traitForFocus, chooseOpponentMove, choiceDescriptions, CHOICES } = engine;
const byId = (id) => MONSTERS.find((m) => m.id === id);
const showa = byId('showa-godzilla'), kong = byId('king-kong'), ghidorah = byId('king-ghidorah'), sock = byId('sockzilla');
const city = GAME_MAPS.find((m) => m.terrain === 'city');
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

// 1. Reproducible with a seed
{
  const a = resolveRound({ player: showa, opponent: kong, playerChoice: 'attack', trait: 'strength', map: city, round: 1, playerHP: 100, opponentHP: 100, rng: seededRng(7) });
  const b = resolveRound({ player: showa, opponent: kong, playerChoice: 'attack', trait: 'strength', map: city, round: 1, playerHP: 100, opponentHP: 100, rng: seededRng(7) });
  ok(JSON.stringify(a) === JSON.stringify(b), 'same seed → same round');
}

// 2. HP stays in [0,100], beats are well-formed, every choice works, every trait works
for (const choice of CHOICES) for (const trait of ['speed', 'strength', 'defense', 'specialAttack']) for (let s = 0; s < 40; s++) {
  const r = resolveRound({ player: showa, opponent: ghidorah, playerChoice: choice, trait, map: city, round: 2, playerHP: 60, opponentHP: 45, rng: seededRng(s * 31 + 1) });
  ok(r.playerHP >= 0 && r.playerHP <= MAX_HP && r.opponentHP >= 0 && r.opponentHP <= MAX_HP, 'HP bounded');
  ok(r.beats.length >= 1 && r.beats.length <= 2, 'one or two beats');
  ok(r.beats.every((b) => typeof b.text === 'string' && b.text.length > 10), 'every beat has a caption');
  ok(r.beats.every((b) => b.damage >= 0 && b.damage <= 40 && b.counter >= 0), 'damage bounded');
  ok(r.beats.every((b) => (b.action === 'special') === (typeof b.abilityName === 'string')), 'special beats carry ability name');
  if (r.playerChoice === 'defend') ok(r.beats.find((b) => b.actor === 'player').damage === 0, 'defend deals no damage');
  ok(!r.over || r.winner !== null, 'over ⇒ winner set');
}

// 3. Round limit ends the fight; KO ends the fight early; second beat skipped after a KO
{
  const r = resolveRound({ player: showa, opponent: kong, playerChoice: 'defend', opponentChoice: 'defend', trait: 'defense', map: city, round: MAX_ROUNDS, playerHP: 50, opponentHP: 40, rng: seededRng(3) });
  ok(r.over && r.winner === 'player', 'final round with more HP → player wins');
  const tie = resolveRound({ player: showa, opponent: kong, playerChoice: 'defend', opponentChoice: 'defend', trait: 'defense', map: city, round: MAX_ROUNDS, playerHP: 50, opponentHP: 50, rng: seededRng(3) });
  ok(tie.over && tie.winner === 'tie', 'equal HP on the last round → tie');
  let koSeen = false;
  for (let s = 0; s < 200 && !koSeen; s++) {
    const k = resolveRound({ player: ghidorah, opponent: sock, playerChoice: 'special', opponentChoice: 'attack', trait: 'specialAttack', map: city, round: 1, playerHP: 100, opponentHP: 8, rng: seededRng(s) });
    if (k.opponentHP === 0) { koSeen = true; ok(k.over && k.winner === 'player', 'KO ends the fight'); if (k.playerFirst) ok(k.beats.length === 1, 'no second beat after a KO'); }
  }
  ok(koSeen, 'a KO can happen');
}

// 4. Balance: a legendary should beat a common most of the time, but not always (kids need wins)
function fight(p, o, seed) {
  const rng = seededRng(seed); let php = 100, ohp = 100;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const choice = CHOICES[Math.floor(rng() * 4)];
    const r = resolveRound({ player: p, opponent: o, playerChoice: choice, trait: 'strength', map: city, round, playerHP: php, opponentHP: ohp, rng });
    php = r.playerHP; ohp = r.opponentHP;
    if (r.over) return r.winner;
  }
  return 'tie';
}
{
  let strong = 0, n = 600;
  for (let s = 0; s < n; s++) if (fight(ghidorah, sock, s) === 'player') strong++;
  const rate = strong / n;
  ok(rate > 0.65 && rate < 0.97, `legendary vs common win rate ${rate.toFixed(2)} in (0.65, 0.97)`);
  let even = 0;
  for (let s = 0; s < n; s++) if (fight(showa, kong, s) === 'player') even++;
  const evenRate = even / n;
  ok(evenRate > 0.3 && evenRate < 0.7, `even matchup win rate ${evenRate.toFixed(2)} in (0.3, 0.7)`);
  let rounds = 0, fights = 0;
  for (let s = 0; s < 200; s++) {
    const rng = seededRng(s + 5000); let php = 100, ohp = 100;
    for (let round = 1; round <= MAX_ROUNDS; round++) {
      const r = resolveRound({ player: showa, opponent: kong, playerChoice: 'attack', trait: 'strength', map: city, round, playerHP: php, opponentHP: ohp, rng });
      php = r.playerHP; ohp = r.opponentHP; rounds++;
      if (r.over) break;
    }
    fights++;
  }
  const avg = rounds / fights;
  ok(avg >= 3 && avg <= 5, `average fight length ${avg.toFixed(2)} rounds in [3, 5]`);
}

// 5. Helpers
ok(traitForFocus('fireVsIce') === 'specialAttack' && traitForFocus('allOut') === 'strength' && traitForFocus('focusVsDistraction') === 'defense', 'focus → trait mapping kept');
ok(['speed', 'strength', 'defense', 'specialAttack'].includes(traitForFocus('random', seededRng(1))), 'random focus picks a trait');
ok(CHOICES.includes(chooseOpponentMove(kong, showa, city, 100, seededRng(2))), 'opponent brain returns a choice');
const descs = choiceDescriptions(showa, city);
ok(descs.special.includes(showa.specialAbility.name) && descs.terrain.includes('city'), 'choice descriptions mention ability and terrain');

console.log(`battleEngine: ${checks} checks passed`);
