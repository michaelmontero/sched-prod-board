import { fetchIncidents, ack } from './api.js';

const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const acked = new Set();

// R5: viewer's locale and zone; en-GB/de give dd/mm, en-US gives mm/dd.
const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function render(incidents) {
  loader.hidden = true;
  empty.hidden = incidents.length > 0;
  list.innerHTML = incidents
    .map(
      (i) => `<li data-testid="incident-row" data-id="${esc(i.id)}" class="row ${esc(i.severity)}">
        <span class="id">${esc(i.id)}</span>
        <span class="sev">${esc(i.severity)}</span>
        <span class="what">${esc(i.service)} · ${esc(i.region)} · ${esc(i.summary)}</span>
        <time datetime="${esc(i.openedAt)}">${fmt.format(new Date(i.openedAt))}</time>
        ${acked.has(i.id)
          ? '<span data-testid="acked" class="acked">acked</span>'
          : '<button data-testid="ack" type="button">Ack</button>'}
      </li>`,
    )
    .join('');
}

// R2: one delegated listener survives re-renders.
list.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-testid="ack"]');
  if (!btn) return;
  const id = btn.closest('[data-testid="incident-row"]').dataset.id;
  btn.disabled = true;
  await ack(id);
  acked.add(id);
  render(last);
});

let last = [];
async function tick() {
  try {
    last = (await fetchIncidents()).incidents; // R1: API answers newest first
    render(last);
  } catch (err) {
    console.error(err);
  }
}

await tick();
setInterval(tick, 2000); // R4
