// Records the board in use: open-board, ack-incident, watch-board. Prints mm:ss marks and ack receipts.
// usage: node scripts/record.mjs <url> <outdir> [watchMinutes]
import { chromium } from 'playwright';
const [url, out, watchMin = '9'] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'en-GB', timezoneId: 'Europe/Berlin', viewport: { width: 1100, height: 620 }, recordVideo: { dir: out, size: { width: 1100, height: 620 } } });
const page = await ctx.newPage();
const t0 = Date.now();
const mark = (what) => { const s = Math.floor((Date.now() - t0) / 1000); const at = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; console.log(JSON.stringify({ at, ...what })); };
page.on('console', (m) => m.text().startsWith('ack') && mark({ console: m.text() }));
await page.goto(url);
mark({ flow: 'open-board', loader: await page.getByTestId('loader').isVisible() });
await page.getByTestId('incident-row').first().waitFor();
const ids = () => page.getByTestId('incident-row').evaluateAll((r) => r.map((x) => x.dataset.id));
const first = await ids();
mark({ flow: 'open-board', rows: first.length, top: first[0], sha: await page.getByTestId('build-sha').textContent() });
await page.waitForTimeout(3000);
const row = page.getByTestId('incident-row').first();
const id = await row.getAttribute('data-id');
await row.getByTestId('ack').click();
await row.getByTestId('acked').waitFor();
mark({ flow: 'ack-incident', clicked: id });
const deadline = Date.now() + Number(watchMin) * 60000;
let top = first[0];
while (Date.now() < deadline) {
  await page.waitForTimeout(1000);
  const now = await ids();
  if (now[0] !== top) { mark({ flow: 'watch-board', newTop: now[0], prevTop: top }); top = now[0]; await page.waitForTimeout(4000); break; }
}
mark({ end: true });
await ctx.close(); await browser.close();
