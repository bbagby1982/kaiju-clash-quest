import { chromium } from 'playwright';

const OUT = '/tmp/claude-0/-home-user/d87a2eef-19a6-55a9-a60c-ae88c3ba022b/scratchpad';
const URL = 'http://127.0.0.1:4177/';

const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'ipad', width: 820, height: 1180 },
  { name: 'desktop', width: 1280, height: 900 },
];

const browser = await chromium.launch();
const errors = [];

for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${vp.name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${vp.name} console: ${m.text().slice(0, 160)}`); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const overflow = async (tag) => {
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    if (r.sw > r.cw + 1) errors.push(`H-SCROLL ${vp.name}/${tag}: ${r.sw} > ${r.cw}`);
  };

  await page.screenshot({ path: `${OUT}/${vp.name}-home.png`, fullPage: true });
  await overflow('home');

  // small tap targets check on home
  const small = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('button, a[href]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44)) {
        out.push(`${el.className.toString().slice(0, 40)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    });
    return out;
  });
  if (small.length) errors.push(`SMALL TAP ${vp.name}/home: ${small.join(' | ')}`);

  for (const tab of ['Battle', 'Race', 'Monsters', 'Encyclopedia']) {
    await page.getByRole('button', { name: tab, exact: true }).click({ force: true });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${vp.name}-${tab.toLowerCase()}.png`, fullPage: true });
    await overflow(tab);
  }

  // Drill the battle flow: Battle tab -> Start Battle -> pick -> random -> confirm
  await page.getByRole('button', { name: 'Battle', exact: true }).click({ force: true });
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Start Battle/i }).first().click({ force: true });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${vp.name}-setup-player.png`, fullPage: true });
  await overflow('setup-player');

  const cards = page.locator('.kq-card');
  if (await cards.count()) {
    await cards.first().click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${vp.name}-setup-opponent.png`, fullPage: true });
    await overflow('setup-opponent');

    await page.getByRole('button', { name: /Random/i }).first().click({ force: true });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${vp.name}-setup-confirm.png`, fullPage: true });
    await overflow('setup-confirm');

    await page.getByRole('button', { name: /Continue/i }).first().click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${vp.name}-booster.png`, fullPage: true });
    await overflow('booster');

    await page.getByRole('button', { name: /Fight Without Booster/i }).first().click({ force: true });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${vp.name}-focus.png`, fullPage: true });
    await overflow('focus');

    await page.getByRole('button', { name: /All-Out Brawl/i }).first().click({ force: true });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${vp.name}-focus-preview.png`, fullPage: true });
    await overflow('focus-preview');

    await page.getByRole('button', { name: /^Battle!/i }).first().click({ force: true });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${vp.name}-preview.png`, fullPage: true });
    await overflow('preview');
  }

  // Monster profile
  await ctx.close();
}

// Profile shot on phone only
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.getByRole('button', { name: 'Monsters', exact: true }).click({ force: true });
await page.waitForTimeout(600);
await page.locator('.kq-card').first().click({ force: true });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/phone-profile.png`, fullPage: true });
await ctx.close();

await browser.close();
console.log(errors.length ? 'ISSUES:\n' + errors.join('\n') : 'clean');
