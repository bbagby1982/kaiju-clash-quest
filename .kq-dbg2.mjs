import { chromium } from 'playwright';
const OUT='/tmp/claude-0/-home-user/d87a2eef-19a6-55a9-a60c-ae88c3ba022b/scratchpad';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://127.0.0.1:4177/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
await p.locator('.kq-stage').first().screenshot({ path: `${OUT}/stage-crop.png` });
await b.close();
