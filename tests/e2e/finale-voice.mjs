// ── THE WINNER GETS TO FINISH TALKING, AND THE FIGHT STILL ENDS ──────────
//
// Owner, 2026-10-12: "in the godzilla game the voice over keeps getting cut
// off before it moves to the next page after the battle."
//
// The finale used to fire the announcer + the winner's line as
// fire-and-forget and then run a fixed 1300ms step before swapping in the
// results sheet. Two real ElevenLabs clips run 4-8s, so the sheet always
// landed mid-sentence. tests/voiceWait.test.mjs proves the race that fixes
// it; this drives the REAL game in a real browser and answers what a unit
// test cannot: with a wait now standing between the last punch and the
// results, does a child still get to the results AT ALL?
//
// Two runs, because the two failure modes pull in opposite directions:
//   • voice WORKING → the sheet must outlast the clip (the reported bug);
//   • voice DEAD    → the sheet must arrive anyway, fast (the fix's own risk).
//
//   npm run build && node tests/e2e/finale-voice.mjs
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = path.join(root, 'dist');
assert.ok(existsSync(path.join(dist, 'index.html')), 'run `npm run build` first');

const CLIP_SECONDS = 2;
/** A real, playable WAV of a known length — this stands in for the voice over. */
function wav(seconds) {
  const rate = 8000, n = rate * seconds, bytes = n * 2;
  const b = Buffer.alloc(44 + bytes);
  b.write('RIFF', 0); b.writeUInt32LE(36 + bytes, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(bytes, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(3000 * Math.sin(i / 12)), 44 + i * 2);
  return b;
}
const CLIP = wav(CLIP_SECONDS);

const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png',
  '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.json':'application/json',
  '.woff2':'font/woff2', '.ico':'image/x-icon' };

let mode = 'voice';          // 'voice' | 'silent'
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/api/voice') {
    if (mode === 'silent') { res.writeHead(503, { 'content-type': 'application/json' }); return res.end('{}'); }
    res.writeHead(200, { 'content-type': 'audio/wav' }); return res.end(CLIP);
  }
  if (url.startsWith('/api/')) { res.writeHead(503, { 'content-type': 'application/json' }); return res.end('{}'); }
  let f = path.join(dist, url);
  if (!existsSync(f) || url === '/') f = path.join(dist, 'index.html');
  try {
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(readFileSync(f));
  } catch { res.writeHead(404); res.end('nope'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  executablePath: process.env.FHQ_CHROME_PATH || undefined,
  // Let <audio> play and fire real `ended` events without a gesture.
  args: ['--autoplay-policy=no-user-gesture-required'],
});

// IN PRIORITY ORDER. A flat alternation picked "Random Booster …" on the
// booster screen and re-rolled forever, because `random` also names the
// opponent picker two screens earlier. Most specific "go on" first.
const GO = [
  '^fight',                               // "FIGHT!", "Fight without a booster"
  '^battle!',
  '^(confirm|continue|next|start battle)',
  '^(strength|speed|defense|special) battle',
  '^random',                              // the opponent picker, and only it
];
const NAV = '^(home|battle|race|monsters|encyclopedia)$';
// Never tap these while walking forward: they are the way OUT of the flow, and
// tapping one bounces the walk between two screens forever.
const BACKWARDS = '^(go back|back|cancel|close|mute|unmute|sound)';

/**
 * Drive one whole battle. The screens between Home and the arena change often,
 * so rather than script an exact path this walks forward: at each step it taps
 * the first control that looks like "go on", never the bottom nav. Returns how
 * long the results sheet took to appear after the finale stamp.
 */
async function playOneBattle(label) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1800);

  await page.getByRole('button', { name: /^battle$/i }).first().click({ force: true });
  await page.waitForTimeout(900);
  for (let step = 0; step < 16; step++) {
    if (await page.locator('.arena-caption, .arena-bottom').count()) break;
    const picked = await page.evaluate(({ go, nav, back }) => {
      const reNav = new RegExp(nav, 'i'), reBack = new RegExp(back, 'i');
      const label = e => (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      // NOT `main button`: BattleSetup / BattlePreview / BattleFocusSelection
      // each return their own full-screen view instead of rendering inside
      // GameLayout, so there is no <main> on those steps at all.
      const all = [...document.querySelectorAll('button, [role="button"]')]
        .filter(e => e.getBoundingClientRect().height > 0
          && !e.closest('nav') && !e.classList.contains('kq-nav-item')
          && !reNav.test(label(e)) && !reBack.test(label(e)));
      let target = null;
      for (const pat of go) { target = all.find(e => new RegExp(pat, 'i').test(label(e))); if (target) break; }
      if (!target) target = all[0];
      if (!target) return null;
      target.click();
      return label(target).slice(0, 30) || '(unlabelled)';
    }, { go: GO, nav: NAV, back: BACKWARDS });
    if (!picked) await page.waitForTimeout(400); else if (process.env.TRACE) console.log('   tap:', picked);
    await page.waitForTimeout(850);
  }
  assert.ok(await page.locator('.arena-caption, .arena-bottom').count(), `${label}: never reached the arena`);
  await page.waitForTimeout(1200);

  let finaleAt = 0, resultsAt = 0, rounds = 0;
  const start = Date.now();
  while (Date.now() - start < 120000) {
    if (await page.getByRole('button', { name: /continue/i }).first().isVisible().catch(() => false)) {
      resultsAt = Date.now(); break;
    }
    if (!finaleAt) {
      const stamped = await page.evaluate(() =>
        /\b(wins|victory|draw|tie|defeat)\b/i.test(document.body.innerText || '')).catch(() => false);
      if (stamped) finaleAt = Date.now();
    }
    const cmd = page.locator('.arena-cmd').first();
    if (await cmd.isVisible().catch(() => false)) { rounds++; await cmd.click({ force: true }); await page.waitForTimeout(1000); }
    else await page.waitForTimeout(120);
  }
  assert.ok(!errors.length, `${label}: page errors — ${errors.join(' | ')}`);
  assert.ok(rounds >= 1, `${label}: played ${rounds} rounds`);
  assert.ok(resultsAt, `${label}: THE RESULTS SHEET NEVER APPEARED — a child is stuck in a finished fight`);
  await ctx.close();
  return { held: finaleAt ? resultsAt - finaleAt : -1, rounds };
}

console.log('— run 1: the voice works —');
mode = 'voice';
const withVoice = await playOneBattle('with voice');
console.log(`  rounds ${withVoice.rounds} · finale stamp → results sheet: ${withVoice.held}ms (clip is ${CLIP_SECONDS * 1000}ms)`);
assert.ok(withVoice.held >= CLIP_SECONDS * 1000,
  `the results sheet cut the voice off: it arrived ${withVoice.held}ms after the finale stamp, inside a ${CLIP_SECONDS * 1000}ms clip`);
assert.ok(withVoice.held < 15000, `the cap is not holding: ${withVoice.held}ms`);

console.log('— run 2: no voice at all (503, or a muted kid) —');
mode = 'silent';
const silent = await playOneBattle('silent');
console.log(`  rounds ${silent.rounds} · finale stamp → results sheet: ${silent.held}ms`);
assert.ok(silent.held >= 0 && silent.held < 6000,
  `with no voice there is nothing to wait for — the sheet must come straight away, took ${silent.held}ms`);

console.log('\n✅ the winner finishes their line, and the fight still ends either way');
await browser.close();
server.close();
process.exit(0);
