import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('requestfailed', r => console.log('FAIL', r.url().slice(0,90), r.failure()?.errorText));
await p.goto('http://127.0.0.1:4177/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
const info = await p.evaluate(() => {
  const sprite = document.querySelector('.sprite');
  if (!sprite) return 'no sprite';
  const img = sprite.querySelector('img');
  const svg = sprite.querySelector('svg');
  return { hasImg: !!img, src: img?.getAttribute('src'), complete: img?.complete, natural: img?.naturalWidth, hasSvg: !!svg, cutout: sprite.getAttribute('data-cutout') };
});
console.log(JSON.stringify(info));
await b.close();
