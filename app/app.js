import { fetchIncidents, ack } from './api.js';

const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const panel = document.querySelector('[data-testid="incident-panel"]');
const panelAck = document.querySelector('[data-testid="panel-ack"]');
const acked = new Set();
const byId = new Map(); // id -> incident
let selected = null; // the incident id the panel names

// R5: viewer's locale and zone; en-GB/de give dd/mm, en-US gives mm/dd.
const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function rowFor(i) {
  const li = document.createElement('li');
  li.dataset.testid = 'incident-row';
  li.dataset.id = i.id;
  li.className = `row ${i.severity}`;
  li.tabIndex = 0;
  li.setAttribute('role', 'button');
  li.innerHTML = `<span class="id">${esc(i.id)}</span>
    <span class="sev">${esc(i.severity)}</span>
    <span class="what">${esc(i.service)} · ${esc(i.region)} · ${esc(i.summary)}</span>
    <time datetime="${esc(i.openedAt)}">${fmt.format(new Date(i.openedAt))}</time>
    <span class="state"></span>`;
  return li;
}

// R1 + no shifting surprises: existing rows stay in the DOM; new incidents are inserted above them.
function render(incidents) {
  loader.hidden = true;
  empty.hidden = incidents.length > 0;
  const ids = new Set(incidents.map((i) => i.id));
  for (const li of [...list.children]) if (!ids.has(li.dataset.id)) li.remove(), byId.delete(li.dataset.id);
  let anchor = list.firstElementChild; // incidents arrive in list order, newest first
  for (const i of incidents) {
    byId.set(i.id, i);
    const existing = list.querySelector(`[data-id="${CSS.escape(i.id)}"]`);
    if (existing) anchor = existing.nextElementSibling;
    else list.insertBefore(rowFor(i), anchor);
  }
}

function markAcked(id) {
  const state = list.querySelector(`[data-id="${CSS.escape(id)}"] .state`);
  if (state && !state.firstChild) state.innerHTML = '<span data-testid="acked" class="acked">acked</span>';
}

function openPanel(id) {
  const i = byId.get(id);
  if (!i) return;
  selected = id;
  panel.hidden = false;
  panel.querySelector('.p-id').textContent = i.id;
  panel.querySelector('.p-what').textContent = `${i.severity} · ${i.service} · ${i.region} · ${i.summary}`;
  panel.querySelector('.p-time').textContent = fmt.format(new Date(i.openedAt));
  panelAck.hidden = acked.has(id);
  panelAck.disabled = false;
  panelAck.textContent = `Ack ${i.id}`;
  for (const li of list.children) li.classList.toggle('selected', li.dataset.id === id);
}

// Product decision: a row opens its incident panel; Ack lives in the panel and acks the id the panel names.
list.addEventListener('click', (e) => {
  const li = e.target.closest('[data-testid="incident-row"]');
  if (li) openPanel(li.dataset.id);
});
list.addEventListener('keydown', (e) => {
  const li = e.target.closest('[data-testid="incident-row"]');
  if (li && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(), openPanel(li.dataset.id);
});
panelAck.addEventListener('click', async () => {
  const id = selected;
  panelAck.disabled = true;
  try {
    await ack(id);
    acked.add(id);
    markAcked(id);
    if (selected === id) panelAck.hidden = true;
  } catch (err) {
    console.error(err);
    panelAck.disabled = false;
  }
});
panel.querySelector('.p-close').addEventListener('click', () => {
  panel.hidden = true;
  selected = null;
  for (const li of list.children) li.classList.remove('selected');
});

async function tick() {
  try {
    render((await fetchIncidents()).incidents); // API answers newest first
  } catch (err) {
    console.error(err);
  }
}

await tick();
setInterval(tick, 2000); // R4
