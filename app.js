(() => {
'use strict';

const sites = [
  { name: "Protofolio", url: "https://marcel533.github.io/Protofolio/" },
  { name: "ZIP-tar.gz-Archiver", url: "https://marcel533.github.io/ZIP-tar.gz-Archiver/" },
  { name: "open-source-picks", url: "https://marcel533.github.io/open-source-picks/" },
  { name: "online-code-editor", url: "https://marcel533.github.io/online-code-editor/" },
  { name: "Name-file-cleaner", url: "https://marcel533.github.io/Name-file-cleaner/" }
];

const T = {
  de: {
    checking: n => `Prüfe ${n} Projekte …`,
    allUp: n => `Alle ${n} Projekte antworten.`,
    noneUp: 'Kein Projekt antwortet. Prüfe deine Verbindung.',
    someUp: (u, n, d) => `${u} von ${n} Projekten antworten. ${d.join(', ')} ${d.length === 1 ? 'antwortet' : 'antworten'} nicht.`,
    online: 'Online', offline: 'Offline', checkingRow: 'Prüft …',
    last: 'Zuletzt geprüft', clock: ' Uhr',
    recheck: 'Erneut prüfen', rechecking: 'Prüft …', locale: 'de-DE'
  },
  en: {
    checking: n => `Checking ${n} projects …`,
    allUp: n => `All ${n} projects are answering.`,
    noneUp: 'No project answers. Check your connection.',
    someUp: (u, n, d) => `${u} of ${n} projects answer. ${d.join(', ')} ${d.length === 1 ? 'does' : 'do'} not.`,
    online: 'Online', offline: 'Offline', checkingRow: 'Checking …',
    last: 'Last checked', clock: '',
    recheck: 'Check again', rechecking: 'Checking …', locale: 'en-GB'
  }
};

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasG = !!window.gsap;
const motion = hasG && !reduce;
if (hasG && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

let lang = 'de';
try { const s = localStorage.getItem('m533-lang'); if (s === 'de' || s === 'en') lang = s; } catch (e) {}

/* ---------- radar geometry ---------- */
const NS = 'http://www.w3.org/2000/svg';
const CX = 480, CY = 320, R = 250;
const R_PENDING = R * 0.96;
const RINGS = [[100, '100 ms'], [300, '300 ms'], [1000, '1 s']];
// log scale: 20 ms sits near the middle, 3000 ms near the edge
const rOf = ms => {
  const c = Math.min(Math.max(ms, 20), 3000);
  return R * (0.16 + 0.80 * (Math.log(c) - Math.log(20)) / (Math.log(3000) - Math.log(20)));
};
const ang = i => (-75 + i * 360 / sites.length) * Math.PI / 180;
const pt = (a, r) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];

const radar = $('#radar');
const list = $('#list');
const verdictEl = $('#verdict');
const lastEl = $('#lastcheck');
const btn = $('#recheck');
const barEl = $('#bar');
const wordEl = $('#word');

const state = sites.map(() => ({ r: R_PENDING, shown: 0, status: 'pending', ms: null }));
let nodes = [], spokes = [], packets = [], groups = [];
const pings = [];
let last = null, running = false;

function buildRadar() {
  let h = `<circle class="edge" cx="${CX}" cy="${CY}" r="${R}"/>`;
  RINGS.forEach(([ms, label]) => {
    const r = rOf(ms);
    h += `<circle class="ring" cx="${CX}" cy="${CY}" r="${r.toFixed(1)}"/>` +
         `<text class="ringlabel" x="${CX}" y="${(CY - r - 6).toFixed(1)}" text-anchor="middle">${label}</text>`;
  });
  sites.forEach((s, i) => {
    const a = ang(i), [fx, fy] = pt(a, R), [lx, ly] = pt(a, R + 20), c = Math.cos(a);
    const anchor = c > 0.25 ? 'start' : c < -0.25 ? 'end' : 'middle';
    h += `<g class="site pending" data-i="${i}">` +
      `<line class="spoke-far" x1="${CX}" y1="${CY}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}"/>` +
      `<line class="spoke" id="sp-${i}" x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY}"/>` +
      `<circle class="packet" id="pk-${i}" r="3.5" cx="${CX}" cy="${CY}"/>` +
      `<g class="node" id="nd-${i}"><circle class="halo" r="15"/><circle class="dot" r="7"/><path class="x" d="M-3 -3L3 3M3 -3L-3 3"/></g>` +
      `<text class="lbl" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}">` +
        `<tspan class="lbl-n" x="${lx.toFixed(1)}">${esc(s.name)}</tspan>` +
        `<tspan class="lbl-s" id="ls-${i}" x="${lx.toFixed(1)}" dy="19">…</tspan></text>` +
      `</g>`;
  });
  h += `<circle class="hub" cx="${CX}" cy="${CY}" r="5" fill="currentColor"/>`;
  radar.innerHTML = h;
  radar.style.color = 'var(--ink)';
  groups = sites.map((_, i) => radar.querySelector(`.site[data-i="${i}"]`));
  nodes = sites.map((_, i) => $('#nd-' + i));
  spokes = sites.map((_, i) => $('#sp-' + i));
  packets = sites.map((_, i) => $('#pk-' + i));
  sites.forEach((_, i) => setNodePos(i, R_PENDING));
}

function setNodePos(i, r) {
  const [x, y] = pt(ang(i), r);
  nodes[i].setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
  spokes[i].setAttribute('x2', x.toFixed(2));
  spokes[i].setAttribute('y2', y.toFixed(2));
}

function setStatus(i, status) {
  state[i].status = status;
  groups[i].setAttribute('class', 'site ' + status + (groups[i].classList.contains('active') ? ' active' : ''));
  const row = $('#row-' + i);
  row.className = 'row ' + status + (row.classList.contains('active') ? ' active' : '');
}

/* ---------- list ---------- */
function renderList() {
  list.innerHTML = sites.map((s, i) => `
    <li class="row pending" id="row-${i}" data-i="${i}">
      <span class="mark" aria-hidden="true"></span>
      <div class="who">
        <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a>
        <span class="url">${esc(s.url.replace(/^https:\/\//, ''))}</span>
      </div>
      <span class="ms" id="ms-${i}">–</span>
      <span class="st" id="st-${i}"></span>
    </li>`).join('');
}

function paintTexts(i) {
  const L = T[lang], st = state[i];
  const ms = Math.round(st.shown);
  $('#st-' + i).textContent = st.status === 'ok' ? L.online : st.status === 'down' ? L.offline : L.checkingRow;
  $('#ms-' + i).textContent = st.status === 'ok' ? ms + ' ms' : '–';
  $('#ls-' + i).textContent = st.status === 'ok' ? ms + ' ms' : st.status === 'down' ? L.offline : '…';
}

function renderVerdict() {
  const L = T[lang], n = sites.length;
  if (!last) { verdictEl.textContent = L.checking(n); return; }
  const down = sites.filter((_, i) => !last.ok[i]).map(s => s.name);
  const up = n - down.length;
  verdictEl.textContent = up === n ? L.allUp(n) : up === 0 ? L.noneUp : L.someUp(up, n, down);
}

function renderLast() {
  const L = T[lang];
  lastEl.textContent = last ? `${L.last}: ${last.time.toLocaleTimeString(L.locale)}${L.clock}` : '';
}

function renderDynamic() {
  const L = T[lang];
  renderVerdict(); renderLast();
  btn.textContent = running ? L.rechecking : L.recheck;
  sites.forEach((_, i) => paintTexts(i));
}

function applyLang(l) {
  lang = l;
  document.documentElement.lang = l;
  document.body.classList.toggle('lang-en', l === 'en');
  document.querySelectorAll('#lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.set === l)));
  try { localStorage.setItem('m533-lang', l); } catch (e) {}
  renderDynamic();
}

/* ---------- ping + settle animation ---------- */
function startPing(i) {
  if (!motion) return;
  const [px, py] = pt(ang(i), R_PENDING);
  if (pings[i]) pings[i].kill();
  pings[i] = gsap.fromTo(packets[i],
    { x: 0, y: 0, opacity: 1 },
    { x: px - CX, y: py - CY, opacity: 0, duration: 1.15, ease: 'power1.in', repeat: -1, repeatDelay: 0.12, delay: i * 0.09 });
}
function stopPing(i) {
  if (pings[i]) { pings[i].kill(); pings[i] = null; }
  if (hasG) gsap.set(packets[i], { opacity: 0, x: 0, y: 0 });
}

function ripple(i) {
  if (!motion || state[i].ms == null) return;
  const [x, y] = pt(ang(i), rOf(state[i].ms));
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('class', 'ripple');
  c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', 7);
  groups[i].insertBefore(c, nodes[i]);
  gsap.fromTo(c, { attr: { r: 7 }, opacity: 0.7 },
    { attr: { r: 36 }, opacity: 0, duration: 0.95, ease: 'power2.out', onComplete: () => c.remove() });
}

function settle(i, res) {
  const st = state[i];
  stopPing(i);
  st.ms = res.ms;
  setStatus(i, res.ok ? 'ok' : 'down');
  if (res.ok) {
    const target = rOf(res.ms);
    if (motion) {
      gsap.to(st, { r: target, duration: 1.1, ease: 'expo.out', overwrite: 'auto',
        onUpdate: () => setNodePos(i, st.r), onComplete: () => ripple(i) });
      gsap.to(st, { shown: res.ms, duration: 0.9, ease: 'power2.out', overwrite: 'auto',
        onUpdate: () => paintTexts(i) });
    } else {
      st.r = target; st.shown = res.ms; setNodePos(i, target);
    }
  } else {
    st.r = R_PENDING; setNodePos(i, R_PENDING);
  }
  paintTexts(i);
}

async function checkSite(s) {
  const t0 = performance.now();
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    await fetch(s.url, { mode: 'no-cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ac.signal });
    return { ok: true, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { ok: false, ms: null };
  } finally {
    clearTimeout(to);
  }
}

async function runChecks() {
  if (running) return;
  running = true; btn.disabled = true; last = null;
  sites.forEach((_, i) => {
    const st = state[i];
    st.ms = null; st.shown = 0;
    setStatus(i, 'pending');
    if (motion) {
      gsap.to(st, { r: R_PENDING, duration: 0.5, ease: 'power2.inOut', overwrite: 'auto', onUpdate: () => setNodePos(i, st.r) });
      startPing(i);
    } else { st.r = R_PENDING; setNodePos(i, R_PENDING); }
  });
  renderDynamic();

  const results = await Promise.all(sites.map(async (s, i) => {
    const t0 = performance.now();
    const res = await checkSite(s);
    if (motion) { // keep the ping visible long enough to read, land nodes in a cascade
      const wait = 900 + i * 70 - (performance.now() - t0);
      if (wait > 0) await sleep(wait);
    }
    settle(i, res);
    return res;
  }));

  last = { ok: results.map(r => r.ok), time: new Date() };
  running = false; btn.disabled = false;
  renderDynamic();
}

/* ---------- cross-highlighting ---------- */
function setActive(i) {
  radar.classList.toggle('has-active', i !== null);
  groups.forEach((g, k) => g.classList.toggle('active', k === i));
  list.querySelectorAll('.row').forEach((r, k) => r.classList.toggle('active', k === i));
}

function bind() {
  list.addEventListener('mouseover', e => { const r = e.target.closest('.row'); if (r) setActive(+r.dataset.i); });
  list.addEventListener('mouseleave', () => setActive(null));
  list.addEventListener('focusin', e => { const r = e.target.closest('.row'); if (r) setActive(+r.dataset.i); });
  list.addEventListener('focusout', () => setActive(null));
  radar.addEventListener('mouseover', e => { const g = e.target.closest('.site'); setActive(g ? +g.dataset.i : null); });
  radar.addEventListener('mouseleave', () => setActive(null));
  btn.addEventListener('click', runChecks);
  $('#lang').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) applyLang(b.dataset.set);
  });
}

/* ---------- wordmark decode ---------- */
function decode(el) {
  const final = el.textContent;
  el.setAttribute('aria-label', final);
  el.style.opacity = '1';
  if (!motion) return Promise.resolve();
  el.textContent = '';
  const spans = [...final].map(ch => {
    const s = document.createElement('span');
    s.className = 'ch'; s.setAttribute('aria-hidden', 'true'); s.textContent = ch;
    el.appendChild(s);
    return s;
  });
  const widths = spans.map(s => s.getBoundingClientRect().width);
  spans.forEach((s, i) => { s.style.width = widths[i] + 'px'; });
  const glyphs = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return new Promise(res => {
    const tl = gsap.timeline({ onComplete: res });
    spans.forEach((s, i) => {
      const o = { p: 0 }; let bucket = -1;
      tl.to(o, { p: 1, duration: 0.55, ease: 'none', onUpdate: () => {
        const b = Math.floor(o.p * 9);
        if (b === bucket) return;
        bucket = b;
        s.textContent = o.p >= 1 ? final[i] : glyphs[(Math.random() * glyphs.length) | 0];
      }, onComplete: () => { s.textContent = final[i]; s.classList.add('on'); } }, i * 0.06);
    });
  });
}

/* ---------- scroll behaviour ---------- */
function setupScroll() {
  if (!(hasG && window.ScrollTrigger)) { barEl.classList.add('show'); return; }
  ScrollTrigger.create({
    trigger: wordEl, start: 'bottom top+=56',
    onEnter: () => barEl.classList.add('show'),
    onLeaveBack: () => barEl.classList.remove('show')
  });
  document.querySelectorAll('.doc section').forEach(sec => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 45%', end: 'bottom 45%',
      onToggle: self => {
        if (!self.isActive) return;
        document.querySelectorAll('.toc a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + sec.id));
      }
    });
  });
}

/* ---------- init ---------- */
async function init() {
  buildRadar(); renderList(); bind(); applyLang(lang); setupScroll();

  const now = new Date(), fmt = { day: '2-digit', month: '2-digit', year: 'numeric' };
  $('#date-de').textContent = now.toLocaleDateString('de-DE', fmt);
  $('#date-en').textContent = now.toLocaleDateString('en-GB', fmt);

  if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, sleep(1500)]);

  if (motion) {
    gsap.from('#radar .edge, #radar .ring', { opacity: 0, scale: 0.82, svgOrigin: `${CX} ${CY}`, duration: 0.9, ease: 'power3.out', stagger: 0.1, clearProps: 'all' });
    gsap.from('#radar .site', { opacity: 0, duration: 0.5, delay: 0.5, stagger: 0.08, clearProps: 'opacity' });
    gsap.from('.row', { opacity: 0, duration: 0.5, delay: 0.6, stagger: 0.07, clearProps: 'opacity' });
    gsap.from('#verdict, .lede', { opacity: 0, duration: 0.6, delay: 0.7, clearProps: 'opacity' });
  }
  decode(wordEl);
  await sleep(motion ? 800 : 0);
  runChecks();
}

init();
})();
