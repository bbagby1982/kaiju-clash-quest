// Headless smoke run: builds are served with `vite preview`, every /api/* call is
// answered by an in-page fake, and the game is driven through a full battle and a
// race at phone / iPad / desktop widths. Screenshots land in tests/e2e/shots/.
//
//   npm run build && npm run test:e2e
//   FAKE_AI=slow npm run test:e2e   → narrator answers after 4s (must not stall the fight)
//   FAKE_AI=down npm run test:e2e   → narrator returns 503 (default)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const shots = path.join(root, 'tests', 'e2e', 'shots');
mkdirSync(shots, { recursive: true });
assert.ok(existsSync(path.join(root, 'dist', 'index.html')), 'run `npm run build` first');

const PORT = 4173 + Math.floor(Math.random() * 500);
const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite preview did not start')), 20000);
  preview.stdout.on('data', (d) => { if (String(d).includes('http')) { clearTimeout(t); resolve(); } });
  preview.stderr.on('data', (d) => process.stderr.write(d));
});
const BASE = `http://localhost:${PORT}`;
const AI_MODE = process.env.FAKE_AI || 'down';

// Fake cloud: three monsters have "Canva art" (we serve one bundled PNG for all of them),
// one custom monster exists, and the narrator behaves per FAKE_AI.
const artPng = readFileSync(path.join(root, 'src/assets/monsters/showa-godzilla.png'));
const CUSTOM = {
  id: 'lava-rex', name: 'Lava Rex', title: 'The Molten Tyrant', era: "Alfred's Lab",
  description: 'A T-rex made of cooling magma. Designed by Alfred.',
  stats: { speed: 55, strength: 88, defense: 70, specialAttack: 77 },
  specialAbility: { name: 'Magma Bite', description: 'A bite hot enough to melt steel.', type: 'melee' },
  terrainBonus: ['volcano'], rarity: 'legendary', imageColor: 'hsl(15 90% 45%)',
  funFacts: ['Sleeps inside volcanoes'], strengths: ['Heat'], weaknesses: ['Ice'], facing: 'right', custom: true,
};
async function installFakes(page) {
  await page.route('**/api/roster', (r) => r.fulfill({ json: { art: { sockzilla: 'e1', mechazord: 'e2', 'king-ghidorah': 'e3', 'lava-rex': 'e4' }, custom: [CUSTOM] } }));
  await page.route('**/api/monster-image/**', (r) => r.fulfill({ body: artPng, contentType: 'image/png' }));
  await page.route('**/api/admin/monsters', (r) => r.fulfill({ json: { monsters: [CUSTOM] } }));
  await page.route('**/api/cloud-save**', (r) => r.fulfill({ status: 404, json: { error: 'No save found', code: 'NOT_FOUND' } }));
  await page.route('**/api/battle', async (r) => {
    if (AI_MODE === 'down') return r.fulfill({ status: 503, json: { error: 'Narrator not configured' } });
    if (AI_MODE === 'slow') await new Promise((res) => setTimeout(res, 4000));
    const body = r.request().postDataJSON();
    return r.fulfill({ json: { narration: `[AI ${body.phase}] The ground SHAKES as the titans clash!`, source: 'ai' } });
  });
}

const VIEWPORTS = { phone: { width: 390, height: 844, isMobile: true, hasTouch: true }, ipad: { width: 820, height: 1180, isMobile: true, hasTouch: true }, desktop: { width: 1366, height: 900 } };
const browser = await chromium.launch();
const failures = [];
const errorsSeen = [];

async function snap(page, name) { await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false }); }
async function tapText(page, re, opts = {}) {
  const loc = page.getByRole('button', { name: re }).first();
  await loc.waitFor({ state: 'visible', timeout: opts.timeout ?? 8000 });
  // force: the big CTAs pulse forever, which Playwright reads as 'not stable'
  await loc.click({ force: true });
}

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errorsSeen.push(`${vpName}: pageerror ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errorsSeen.push(`${vpName}: console ${m.text()}`); });
  await installFakes(page);
  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await snap(page, `${vpName}-01-home`);
    // No horizontal scroll anywhere
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `${vpName}: page scrolls sideways by ${overflow}px`);

    // Roster: the fake cloud art must make sockzilla / mechazord / king-ghidorah / lava-rex playable
    await page.getByRole('button', { name: /my monsters/i }).first().click();
    await page.waitForTimeout(500);
    await snap(page, `${vpName}-02-monsters`);
    const rosterText = await page.locator('main').innerText();
    for (const n of ['Showa Godzilla', 'King Kong']) assert.ok(rosterText.includes(n), `${vpName}: starter ${n} missing from My Monsters`);

    // Encyclopedia must list the custom monster
    await page.getByRole('button', { name: /encyclopedia/i }).first().click();
    await page.waitForTimeout(500);
    const encText = await page.locator('main').innerText();
    assert.ok(/Lava Rex|\?\?\?/.test(encText), `${vpName}: encyclopedia shows neither Lava Rex nor a locked entry`);
    await snap(page, `${vpName}-03-encyclopedia`);

    // Battle: home → battle → pick Showa → random opponent → confirm → booster → focus → preview → fight
    await page.getByRole('button', { name: /^battle$/i }).first().click();
    await page.waitForTimeout(400);
    await tapText(page, /start battle|battle now|fight/i);
    await page.waitForTimeout(400);
    await snap(page, `${vpName}-04-setup`);
    await page.getByText('Showa Godzilla', { exact: false }).first().click();
    await page.waitForTimeout(400);
    await tapText(page, /random/i);
    await page.waitForTimeout(400);
    await snap(page, `${vpName}-05-confirm`);
    await tapText(page, /confirm|next|continue|battle/i);
    await page.waitForTimeout(400);
    // booster: continue without or with one
    await tapText(page, /continue|no booster|skip|confirm|start/i);
    await page.waitForTimeout(400);
    await snap(page, `${vpName}-06-focus`);
    await page.getByText(/strength battle/i).first().click();
    await page.waitForTimeout(400);
    await snap(page, `${vpName}-07-preview`);
    await tapText(page, /fight|start battle|begin/i);
    // Arena
    await page.waitForTimeout(1500);
    await snap(page, `${vpName}-08-arena-intro`);
    const arenaStart = Date.now();
    let rounds = 0;
    while (Date.now() - arenaStart < 90000) {
      const continueBtn = page.getByRole('button', { name: /continue/i }).first();
      if (await continueBtn.isVisible().catch(() => false)) break;
      const special = page.getByRole('button', { name: /special|attack/i }).first();
      if (await special.isVisible().catch(() => false)) {
        rounds++;
        if (rounds === 1) await snap(page, `${vpName}-09-arena-menu`);
        await special.click();
        await page.waitForTimeout(1200);
        if (rounds === 1) await snap(page, `${vpName}-10-arena-hit`);
      } else {
        await page.waitForTimeout(500);
      }
    }
    assert.ok(rounds >= 1 && rounds <= 5, `${vpName}: played ${rounds} rounds (expected 1..5)`);
    await snap(page, `${vpName}-11-results`);
    await tapText(page, /continue/i, { timeout: 30000 });
    await page.waitForTimeout(600);

    // Race: race tab → set up → pick 2 → predict → start → wait for finish
    await page.getByRole('button', { name: /^race$/i }).first().click();
    await page.waitForTimeout(400);
    await tapText(page, /set up race|race setup|start race|new race/i);
    await page.waitForTimeout(400);
    await snap(page, `${vpName}-12-race-setup`);
    const cards = page.getByText(/Showa Godzilla|King Kong/);
    await cards.nth(0).click(); await page.waitForTimeout(200);
    await cards.nth(1).click(); await page.waitForTimeout(200);
    await tapText(page, /next|predict|continue|choose winner/i);
    await page.waitForTimeout(400);
    await page.getByText('Showa Godzilla', { exact: false }).first().click();
    await page.waitForTimeout(300);
    await tapText(page, /start race|go|race!/i);
    await page.waitForTimeout(2500);
    await snap(page, `${vpName}-13-race`);
    await tapText(page, /continue|back|done|finish|home/i, { timeout: 60000 });
    await snap(page, `${vpName}-14-after-race`);
  } catch (err) {
    failures.push(`${vpName}: ${err.message}`);
    await snap(page, `${vpName}-FAIL`).catch(() => {});
  } finally {
    await ctx.close();
  }
}

await browser.close();
preview.kill();
if (errorsSeen.length) console.log('Console/page errors:\n  ' + errorsSeen.join('\n  '));
if (failures.length) { console.error('FAILURES:\n  ' + failures.join('\n  ')); process.exit(1); }
console.log(`e2e smoke: ${Object.keys(VIEWPORTS).length} viewports passed, screenshots in tests/e2e/shots/`);
