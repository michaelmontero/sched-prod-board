// Records build 2 like a person: aim at a row, a new incident lands mid-aim, click. The panel names the
// incident clicked; if it is not the one meant, pick the meant row again, then Ack in the panel.
// usage: node scripts/record-panel.mjs <url> <outdir> [maxWaitMinutes]
import { chromium } from 'playwright';
const [url, out, maxMin = '10'] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'en-GB', timezoneId: 'Europe/Berlin', viewport: { width: 1280, height: 720 }, recordVideo: { dir: out, size: { width: 1280, height: 720 } } });
const page = await ctx.newPage();
const t0 = Date.now();
const mark = (what) => { const s = Math.floor((Date.now() - t0) / 1000); console.log(JSON.stringify({ at: `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, t: new Date().toISOString(), ...what })); };
page.on('console', (m) => m.text().startsWith('ack') && mark({ console: m.text() }));
await page.goto(url);
await page.getByTestId('incident-row').first().waitFor();
mark({ flow: 'open-board', sha: await page.getByTestId('build-sha').textContent(), rowAck: await page.getByTestId('ack').count() });
const target = page.getByTestId('incident-row').filter({ hasNot: page.getByTestId('acked') }).first();
const meant = await target.getAttribute('data-id');
const box = await target.boundingBox();
const x = box.x + box.width / 2, y = box.y + box.height / 2;
await page.mouse.move(x, y, { steps: 15 });
mark({ flow: 'watch-board', aiming: meant });
const top = await page.getByTestId('incident-row').first().getAttribute('data-id');
await page.waitForFunction((id) => document.querySelector('[data-testid="incident-row"]')?.dataset.id !== id, top, { timeout: Number(maxMin) * 60000, polling: 'raf' });
await page.mouse.click(x, y);
const panelSays = (await page.getByTestId('incident-panel').innerText()).split('\n')[0];
mark({ flow: 'ack-incident', meant, panelNames: panelSays, ackedSoFar: await page.getByTestId('acked').count() });
await page.waitForTimeout(2500);
if (!panelSays.includes(meant)) {
  const row = page.locator(`[data-testid="incident-row"][data-id="${meant}"]`);
  const b = await row.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 });
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  mark({ flow: 'ack-incident', repicked: meant, panelNames: (await page.getByTestId('incident-panel').innerText()).split('\n')[0] });
  await page.waitForTimeout(2000);
}
const pa = await page.getByTestId('panel-ack').boundingBox();
await page.mouse.move(pa.x + pa.width / 2, pa.y + pa.height / 2, { steps: 15 });
await page.mouse.click(pa.x + pa.width / 2, pa.y + pa.height / 2);
await page.locator(`[data-testid="incident-row"][data-id="${meant}"] [data-testid="acked"]`).waitFor();
mark({ flow: 'ack-incident', ackedRow: meant });
await page.waitForTimeout(4000);
mark({ end: true });
await ctx.close(); await browser.close();
