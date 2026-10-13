// ── THERE IS ALWAYS A WAY OUT ─────────────────────────────────────────────
//
// Owner, 2026-10-12: "there is not back button when you are on the monster
// encyclopedia page."
//
// The cause was never the encyclopedia. `overflow-x: hidden` on a full-screen
// root makes that root a scroll container, and a scroll container becomes the
// containing block for every `position: sticky` descendant — so the sticky
// header and the sticky bottom nav had nothing to stick inside and scrolled
// away with the content. On an 11,854px Encyclopedia document a child was
// ~11,000px of scrolling from any way out.
//
// `tests/arenaWiring.test.mjs` guards the CLASS NAMES on those roots, and a
// third audit showed that is not enough: three lines of CSS —
// `.kq-screen-in { overflow-x: hidden }` — put the bug back in full with the
// whole suite, typecheck, lint, build and the finale e2e all green. § 2b of
// that file now cross-checks the stylesheet, and THIS file is the other half:
// it MEASURES the rendered position of the escape control, which is the only
// thing that cannot be fooled by a new spelling.
//
// Run with `npm run test:sticky` (and as part of `npm run test:e2e`).
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const dist = path.join(root, 'dist');
assert.ok(existsSync(path.join(dist, 'index.html')), 'run `npm run build` first');

const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png',
  '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.json':'application/json',
  '.woff2':'font/woff2', '.ico':'image/x-icon' };
// `vite preview` cannot be spawned in every sandbox; serving dist/ in-process
// is what tests/e2e/finale-voice.mjs does and it works everywhere.
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url.startsWith('/api/')) { res.writeHead(503, { 'content-type': 'application/json' }); return res.end('{}'); }
  let f = path.join(dist, url);
  if (!existsSync(f) || url === '/') f = path.join(dist, 'index.html');
  try {
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(readFileSync(f));
  } catch { res.writeHead(404); res.end('nope'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// Every monster id the game ships, lifted from the data file rather than typed.
const MONSTER_IDS = [...readFileSync(path.join(root, 'src/data/monsters.ts'), 'utf8')
  .matchAll(/^\s*id: '([a-z0-9-]+)'/gm)].map((m) => m[1]);
assert.ok(MONSTER_IDS.length > 50, `lifted the roster ids (${MONSTER_IDS.length})`);

const browser = await chromium.launch({ executablePath: process.env.FHQ_CHROME_PATH || undefined });
let checks = 0;
const ok = (c, m) => { checks++; assert.ok(c, m); console.log('  [ok] ' + m); };

/** Every sticky element's rendered top, plus the lowest escape control. */
const probe = (page) => page.evaluate(() => {
  const vh = innerHeight;
  const sticky = [...document.querySelectorAll('[class*="sticky"]')]
    .filter((e) => getComputedStyle(e).position === 'sticky')
    .map((e) => ({ cls: e.className.slice(0, 40), top: Math.round(e.getBoundingClientRect().top),
                   bottom: Math.round(e.getBoundingClientRect().bottom) }));
  // The way out: a Back/close control, or the bottom nav.
  const out = [...document.querySelectorAll('button, [role="button"], a')]
    .filter((e) => /back|close|home|encyclopedia|arena/i.test(
      (e.getAttribute('aria-label') || e.innerText || '').trim()))
    .map((e) => { const r = e.getBoundingClientRect();
      return { label: ((e.getAttribute('aria-label') || e.innerText || '').trim()).slice(0, 24),
               top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; })
    .filter((r) => r.h > 0);
  const onScreen = out.filter((r) => r.top >= 0 && r.bottom <= vh + 1);
  return { vh, docH: document.documentElement.scrollHeight, scrollY: Math.round(scrollY), sticky, out, onScreen };
});

const tapText = async (page, re) => {
  const hit = await page.evaluate((src) => {
    const r = new RegExp(src, 'i');
    const el = [...document.querySelectorAll('button, [role="button"], a')]
      .find((e) => e.getBoundingClientRect().height > 0 && r.test(((e.innerText || e.getAttribute('aria-label') || '')).trim()));
    if (!el) return null;
    el.click();
    return (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30);
  }, re.source);
  await page.waitForTimeout(700);
  return hit;
};

try {
  for (const width of [320, 390, 820]) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true });
    const page = await ctx.newPage();
    // A FULL ROSTER, or BattleSetup's own document can fit on screen and the
    // assertion below passes vacuously. The ids come from the shipped data
    // file, so this cannot drift out of step with the game.
    await page.addInitScript(([ids]) => {
      try {
        const raw = localStorage.getItem('godzilla-vs-progress');
        const p = raw ? JSON.parse(raw) : {};
        localStorage.setItem('godzilla-vs-progress', JSON.stringify({
          ...p, unlockedMonsters: ids, discoveredEncyclopedia: ids, uniqueMonstersUsed: ids,
        }));
      } catch { /* ignore */ }
    }, [MONSTER_IDS]);
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    // ── 1. The Encyclopedia: the screen the owner reported ────────────────
    const enc = await tapText(page, /encyclopedia/);
    ok(!!enc, `${width}px: reached the Encyclopedia ("${enc}")`);
    await page.evaluate(() => window.scrollTo(0, 99999));
    await page.waitForTimeout(400);
    let r = await probe(page);
    ok(r.docH > r.vh, `${width}px: the Encyclopedia is longer than the screen (${r.docH}px vs ${r.vh}) — otherwise this proves nothing`);
    ok(r.sticky.length > 0, `${width}px: it has sticky chrome (${JSON.stringify(r.sticky)})`);
    ok(r.sticky.every((s) => s.bottom > 0 && s.top < r.vh),
      `${width}px: every sticky element is ON SCREEN at the bottom of the page — this is the owner's bug: ${JSON.stringify(r.sticky)}`);
    ok(r.onScreen.length > 0,
      `${width}px: and a child scrolled to the end can SEE a way out (${JSON.stringify(r.onScreen.slice(0, 3))})`);

    // ── 2. BattleSetup: Alfred passes it on every single battle ───────────
    // The walk MATTERS. An earlier cut tapped the bottom nav's "Battle" and
    // stopped there — still inside GameLayout, so it measured GameLayout's
    // chrome a second time and the `.kq-screen-in` mutation sailed through it.
    // BattleSetup is behind "Start Battle" and renders OUTSIDE GameLayout:
    // no <main>, no <nav>, and its sticky header holds the only way out.
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    ok(!!(await tapText(page, /^battle$/)), `${width}px: opened the Battle tab`);
    ok(!!(await tapText(page, /^start battle/)), `${width}px: tapped into BattleSetup`);
    const where = await page.evaluate(() => ({
      root: ([...document.querySelectorAll('div')].find((d) => /min-h-screen/.test(d.className)) || {}).className || '',
      navs: document.querySelectorAll('nav').length,
      heading: ((document.querySelector('h1, h2') || {}).innerText || '').trim().slice(0, 30),
    }));
    ok(/kq-screen-in/.test(where.root) && where.navs === 0,
      `${width}px: and it really is BattleSetup, outside GameLayout — "${where.heading}", navs ${where.navs}, root "${where.root}"`);
    await page.evaluate(() => window.scrollTo(0, 99999));
    await page.waitForTimeout(400);
    r = await probe(page);
    ok(r.docH > r.vh, `${width}px: with a full roster its document is taller than the screen (${r.docH}px vs ${r.vh})`);
    ok(r.sticky.length > 0, `${width}px: BattleSetup has its sticky header (${JSON.stringify(r.sticky)})`);
    ok(r.sticky.every((s) => s.top >= -1),
      `${width}px: that header — which holds the ONLY way out of this screen — is pinned at the top, not scrolled off: ${JSON.stringify(r.sticky)}`);
    ok(r.onScreen.length > 0,
      `${width}px: and its Back control is inside the viewport at max scroll (${JSON.stringify(r.onScreen.slice(0, 2))})`);
    ok(!errors.length, `${width}px: no page errors (${errors.join(' | ')})`);
    await ctx.close();
  }
  console.log(`\n✅ ALL ${checks} STICKY-ESCAPE CHECKS PASSED`);
} finally {
  await browser.close();
  server.close();
}
