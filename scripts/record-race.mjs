// Records the ack race like a person: aim the pointer at the top row's Ack, and click at that spot
// the moment the list shifts. Prints mm:ss marks, the row meant, and the ack receipt.
// usage: node scripts/record-race.mjs <url> <outdir> [maxWaitMinutes]
import { chromium } from 'playwright';
const [url, out, maxMin = '10'] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'en-GB', timezoneId: 'Europe/Berlin', viewport: { width: 1100, height: 620 }, recordVideo: { dir: out, size: { width: 1100, height: 620 } } });
const page = await ctx.newPage();
const t0 = Date.now();
const mark = (what) => { const s = Math.floor((Date.now() - t0) / 1000); console.log(JSON.stringify({ at: `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, t: new Date().toISOString(), ...what })); };
page.on('console', (m) => m.text().startsWith('ack') && mark({ console: m.text() }));
await page.goto(url);
await page.getByTestId('incident-row').first().waitFor();
mark({ flow: 'open-board', sha: await page.getByTestId('build-sha').textContent() });
const top = page.getByTestId('incident-row').first();
const meant = await top.getAttribute('data-id');
const box = await top.getByTestId('ack').boundingBox();
const x = box.x + box.width / 2, y = box.y + box.height / 2;
await page.mouse.move(x, y, { steps: 15 }); // pointer rests on the Ack of the row I mean
mark({ flow: 'watch-board', aiming: meant });
await page.waitForFunction((id) => document.querySelector('[data-testid="incident-row"]')?.dataset.id !== id, meant, { timeout: Number(maxMin) * 60000, polling: 'raf' });
await page.mouse.click(x, y); // a person's click, already on its way, lands where the button was
const landed = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-testid="incident-row"]')?.dataset.id, [x, y]);
mark({ flow: 'ack-incident', meant, rowNowAtPointer: landed });
await page.waitForTimeout(5000);
mark({ end: true, rows: await page.getByTestId('incident-row').evaluateAll((r) => r.slice(0, 3).map((x) => x.dataset.id + (x.querySelector('[data-testid=acked]') ? ' acked' : ''))) });
await ctx.close(); await browser.close();
