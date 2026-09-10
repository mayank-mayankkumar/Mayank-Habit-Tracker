/**
 * pwa.js  v2  —  Habit Tracker PWA Shell
 * ─────────────────────────────────────────────────────────────
 * Injects:  bottom nav bar, swipe-left/right page navigation,
 *           pull-to-refresh indicator, install banner,
 *           haptic feedback, safe-area CSS vars, splash guard.
 *
 * Usage (last <script> before </body>):
 *   <script src="pwa.js"></script>
 *   <script> PWA.init({ page: 'home' }); </script>
 */
(function () {
'use strict';

// ── PAGE REGISTRY ───────────────────────────────────────────
const PAGES = [
  { id:'home',      label:'Today',     emoji:'☀️',  href:'index.html'         },
  { id:'analytics', label:'Stats',     emoji:'📊',  href:'analytics.html'     },
  { id:'reminders', label:'Reminders', emoji:'🔔',  href:'notifications.html' },
  { id:'profile',   label:'Profile',   emoji:'👤',  href:'profile.html'       },
];
const PAGE_ORDER = PAGES.map(p => p.href);

// ── INJECT CSS ──────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
:root {
  --sat:env(safe-area-inset-top,0px);
  --sab:env(safe-area-inset-bottom,0px);
  --sal:env(safe-area-inset-left,0px);
  --sar:env(safe-area-inset-right,0px);
  --nav-h:62px;
}

/* Body padding so content clears the bottom nav */
body { padding-bottom:calc(var(--nav-h) + var(--sab) + 8px) !important; }

/* ── BOTTOM NAV ── */
#pwa-nav {
  position:fixed; bottom:0; left:0; right:0; z-index:9000;
  height:calc(var(--nav-h) + var(--sab));
  padding-bottom:var(--sab);
  background:var(--bg,#f5f2eb);
  border-top:1px solid var(--bdr,#ddd8ce);
  display:flex; align-items:stretch;
  transition:background .3s, border-color .3s;
  -webkit-backdrop-filter:blur(18px); backdrop-filter:blur(18px);
  box-shadow:0 -1px 0 rgba(0,0,0,.06), 0 -4px 20px rgba(0,0,0,.04);
}
[data-theme="dark"] #pwa-nav {
  background:rgba(17,16,16,.92);
  border-top-color:#2e2c2a;
  box-shadow:0 -1px 0 rgba(255,255,255,.06), 0 -4px 20px rgba(0,0,0,.3);
}
.pwa-tab {
  flex:1; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:3px;
  text-decoration:none; color:var(--ink3,#a8a39d);
  -webkit-tap-highlight-color:transparent;
  cursor:pointer; border:none; background:transparent;
  padding:4px 0 2px; position:relative;
  transition:color .2s;
  font-family:inherit;
  -webkit-user-select:none; user-select:none;
}
.pwa-tab:active { transform:scale(.9); }
.pwa-tab.active { color:var(--lime,#7ab522); }
[data-theme="dark"] .pwa-tab.active { color:var(--lime,#a0d840); }
.pwa-tab-icon {
  font-size:22px; line-height:1;
  transition:transform .25s cubic-bezier(.34,1.56,.64,1);
}
.pwa-tab.active .pwa-tab-icon { transform:translateY(-2px) scale(1.12); }
.pwa-tab-label {
  font-size:10px; font-family:'DM Mono',monospace;
  letter-spacing:.04em; text-transform:uppercase;
  transition:opacity .2s;
}
.pwa-tab-pill {
  position:absolute; top:6px;
  width:24px; height:3px; border-radius:2px;
  background:var(--lime,#7ab522);
  transform:scaleX(0);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
}
.pwa-tab.active .pwa-tab-pill { transform:scaleX(1); }
.pwa-badge {
  position:absolute; top:4px; right:calc(50% - 18px);
  min-width:16px; height:16px; border-radius:8px;
  background:#e04830; color:#fff;
  font-size:9px; font-family:'DM Mono',monospace;
  display:flex; align-items:center; justify-content:center;
  padding:0 4px; border:2px solid var(--bg,#f5f2eb);
  transition:border-color .3s;
}
[data-theme="dark"] .pwa-badge { border-color:#111010; }

/* ── INSTALL BANNER ── */
#pwa-install-banner {
  position:fixed; bottom:calc(var(--nav-h) + var(--sab) + 10px);
  left:12px; right:12px; z-index:8999;
  background:var(--ink,#0a0a0a); color:var(--bg,#f5f2eb);
  border-radius:16px; padding:14px 16px;
  display:flex; align-items:center; gap:12px;
  box-shadow:0 8px 32px rgba(0,0,0,.25);
  animation:bannerIn .4s cubic-bezier(.34,1.56,.64,1) both;
  border:1px solid rgba(160,216,64,.25);
}
@keyframes bannerIn {
  from { opacity:0; transform:translateY(20px) scale(.97); }
  to   { opacity:1; transform:none; }
}
#pwa-install-banner.out {
  animation:bannerOut .25s ease both;
}
@keyframes bannerOut {
  to { opacity:0; transform:translateY(12px); }
}
.pib-icon { font-size:28px; flex-shrink:0; }
.pib-text { flex:1; min-width:0; }
.pib-title { font-family:'Syne','Cabinet Grotesk',sans-serif; font-weight:800; font-size:13px; margin-bottom:2px; }
.pib-sub   { font-size:11px; color:rgba(255,255,255,.5); font-family:'DM Mono',monospace; }
.pib-btn {
  background:var(--lime,#a0d840); color:#1a2e00;
  border:none; padding:9px 16px; border-radius:10px;
  font-family:'DM Mono',monospace; font-size:11px;
  font-weight:500; cursor:pointer; white-space:nowrap;
  flex-shrink:0; letter-spacing:.04em;
  transition:filter .15s;
}
.pib-btn:hover { filter:brightness(1.08); }
.pib-close {
  background:none; border:none; color:rgba(255,255,255,.35);
  font-size:18px; cursor:pointer; padding:0 0 0 4px; flex-shrink:0;
  line-height:1;
}
.pib-close:hover { color:rgba(255,255,255,.7); }

/* ── PULL-TO-REFRESH ── */
#pwa-ptr {
  position:fixed; top:calc(var(--sat) + 8px);
  left:50%; transform:translateX(-50%) translateY(-60px);
  background:var(--bg,#f5f2eb); border:1px solid var(--bdr,#ddd8ce);
  border-radius:100px; padding:8px 16px 8px 12px;
  display:flex; align-items:center; gap:8px;
  font-size:12px; font-family:'DM Mono',monospace;
  color:var(--ink2,#6b6660);
  box-shadow:0 4px 16px rgba(0,0,0,.12);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1), background .3s;
  z-index:8998; white-space:nowrap;
  pointer-events:none;
}
[data-theme="dark"] #pwa-ptr { background:#1c1b1a; border-color:#2e2c2a; }
.ptr-spinner {
  width:16px; height:16px; border-radius:50%;
  border:2px solid var(--bdr,#ddd8ce);
  border-top-color:var(--lime,#7ab522);
  animation:spin .6s linear infinite;
}
@keyframes spin { to { transform:rotate(360deg); } }

/* ── PAGE SWIPE TRANSITION ── */
.pwa-page-leaving-left  { animation:leaveLeft  .28s ease both; }
.pwa-page-leaving-right { animation:leaveRight .28s ease both; }
.pwa-page-enter-left    { animation:enterLeft  .28s ease both; }
.pwa-page-enter-right   { animation:enterRight .28s ease both; }
@keyframes leaveLeft  { to { opacity:0; transform:translateX(-18px); } }
@keyframes leaveRight { to { opacity:0; transform:translateX(18px); } }
@keyframes enterLeft  { from { opacity:0; transform:translateX(18px); } }
@keyframes enterRight { from { opacity:0; transform:translateX(-18px); } }

/* ── SWIPE HINT INDICATOR ── */
#pwa-swipe-hint {
  position:fixed; bottom:calc(var(--nav-h) + var(--sab) + 14px);
  right:12px; z-index:8997;
  background:var(--ink,#0a0a0a); color:var(--bg,#f5f2eb);
  border-radius:100px; padding:6px 12px;
  font-size:11px; font-family:'DM Mono',monospace;
  opacity:0; transition:opacity .3s;
  pointer-events:none;
}
#pwa-swipe-hint.show { opacity:1; }

/* ── HAPTIC RIPPLE (visual feedback on mobile) ── */
.pwa-ripple {
  position:absolute; border-radius:50%;
  background:rgba(160,216,64,.25);
  pointer-events:none;
  animation:ripple .5s ease-out both;
}
@keyframes ripple {
  from { width:0; height:0; opacity:1; }
  to   { width:80px; height:80px; margin:-40px; opacity:0; }
}

/* ── MOBILE-FIRST LAYOUT FIXES ── */
@media (max-width:768px) {
  /* Remove sticky/fixed top navs on mobile (replaced by bottom nav) */
  nav:not(#pwa-nav) {
    position:sticky !important;
    padding:10px 16px !important;
  }
  /* Tighten page padding on mobile */
  .page, .shell { padding-left:14px !important; padding-right:14px !important; }
  /* Full-width cards on mobile */
  .card { border-radius:12px !important; }
  /* Tables scroll horizontally */
  .table-wrap { border-radius:10px !important; }
  /* Stack grids to single column on small screens */
  .g2:not(.no-stack), .grid-2:not(.no-stack) {
    grid-template-columns:1fr !important;
  }
  .g4, .grid-4 {
    grid-template-columns:1fr 1fr !important;
  }
  /* Score hero vertical */
  .hero, .score-hero {
    grid-template-columns:1fr !important;
    gap:20px !important;
    padding:24px !important;
  }
  /* Habit table: fixed columns, horizontal scroll */
  .tbl { font-size:11px !important; }
  .tbl td, .tbl th { padding:0 !important; }
  .tbl .habit-cell { min-width:130px !important; padding:6px 8px !important; }
  /* Banner compact */
  .banner { padding:16px !important; gap:16px !important; }
  /* Week cards scroll horizontal */
  .week-row { overflow-x:auto; flex-wrap:nowrap !important; padding-bottom:6px; }
  .wcard { min-width:110px; flex-shrink:0; }
  /* Add row stacks */
  .add-row { flex-direction:column !important; }
  .add-row .add-input { min-width:0 !important; }
  /* Analytics dow/radar stacks */
  .dow-wrap { gap:4px !important; }
  /* Insight grid stacks */
  .ig { grid-template-columns:1fr !important; }
  /* Permission card stacks */
  .perm-card { flex-direction:column !important; padding:22px !important; }
  .quick-grid { grid-template-columns:1fr 1fr !important; }
}
@media (max-width:480px) {
  .g4, .grid-4 { grid-template-columns:1fr 1fr !important; }
  .stats-row   { grid-template-columns:1fr 1fr !important; }
}
`;
document.head.appendChild(style);

// ── INIT ────────────────────────────────────────────────────
const PWA = {};
window.PWA = PWA;

PWA.init = function ({ page = 'home' } = {}) {
  injectBottomNav(page);
  initSwipeNav();
  initPullToRefresh();
  initInstallPrompt();
  registerSW();
  // Animate page in
  document.body.style.opacity = '0';
  requestAnimationFrame(() => {
    document.body.style.transition = 'opacity .22s ease';
    document.body.style.opacity    = '1';
  });
};

// ── BOTTOM NAV ──────────────────────────────────────────────
function injectBottomNav(activePage) {
  const nav = document.createElement('nav');
  nav.id = 'pwa-nav';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Main navigation');

  nav.innerHTML = PAGES.map(p => {
    const isActive = p.id === activePage;
    return `
      <a href="${p.href}" class="pwa-tab ${isActive ? 'active' : ''}"
         role="tab" aria-selected="${isActive}" aria-label="${p.label}"
         data-page="${p.id}">
        <div class="pwa-tab-pill"></div>
        <div class="pwa-tab-icon">${p.emoji}</div>
        <div class="pwa-tab-label">${p.label}</div>
        ${p.id === 'reminders' ? '<div class="pwa-badge" id="notif-badge" style="display:none">!</div>' : ''}
      </a>`;
  }).join('');

  document.body.appendChild(nav);

  // Tab click: ripple + navigate
  nav.querySelectorAll('.pwa-tab').forEach(tab => {
    tab.addEventListener('click', e => {
      e.preventDefault();
      if (tab.classList.contains('active')) return;
      ripple(tab, e);
      haptic('light');
      const currentIdx = PAGE_ORDER.indexOf(location.pathname.split('/').pop() || 'index.html');
      const nextIdx    = PAGE_ORDER.indexOf(tab.getAttribute('href'));
      const dir = nextIdx > currentIdx ? 'left' : 'right';
      navigateTo(tab.getAttribute('href'), dir);
    });
  });

  // Show reminder badge if any enabled reminders exist
  try {
    const rems = JSON.parse(localStorage.getItem('ht_reminders_v2') || '[]');
    if (rems.some(r => r.enabled)) {
      const badge = document.getElementById('notif-badge');
      if (badge) badge.style.display = 'flex';
    }
  } catch {}
}

// ── SWIPE NAVIGATION ────────────────────────────────────────
function initSwipeNav() {
  let startX = 0, startY = 0, startTime = 0;
  const THRESHOLD   = 72;   // px
  const MAX_Y_DRIFT = 50;   // px (cancel if scrolling vertically)
  const MAX_MS      = 400;  // max gesture time

  const hint = document.createElement('div');
  hint.id = 'pwa-swipe-hint';
  document.body.appendChild(hint);

  document.addEventListener('touchstart', e => {
    startX    = e.touches[0].clientX;
    startY    = e.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx   = e.changedTouches[0].clientX - startX;
    const dy   = e.changedTouches[0].clientY - startY;
    const dt   = Date.now() - startTime;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Ignore vertical scrolls, slow gestures, or swipes that started on the nav
    if (e.target.closest('#pwa-nav')) return;
    if (dt > MAX_MS || absDx < THRESHOLD || absDy > MAX_Y_DRIFT) return;

    const current = location.pathname.split('/').pop() || 'index.html';
    const ci      = PAGE_ORDER.indexOf(current);
    if (ci === -1) return;

    if (dx < 0 && ci < PAGE_ORDER.length - 1) {
      // Swipe left → next page
      showHint('Swiped →');
      navigateTo(PAGE_ORDER[ci + 1], 'left');
    } else if (dx > 0 && ci > 0) {
      // Swipe right → previous page
      showHint('← Swiped');
      navigateTo(PAGE_ORDER[ci - 1], 'right');
    }
  }, { passive: true });

  function showHint(txt) {
    hint.textContent = txt;
    hint.classList.add('show');
    setTimeout(() => hint.classList.remove('show'), 800);
  }
}

// ── PAGE TRANSITION ─────────────────────────────────────────
function navigateTo(href, dir = 'left') {
  const body = document.body;
  const cls  = dir === 'left' ? 'pwa-page-leaving-left' : 'pwa-page-leaving-right';
  body.classList.add(cls);
  setTimeout(() => { window.location.href = href; }, 240);
}

// ── PULL-TO-REFRESH ─────────────────────────────────────────
function initPullToRefresh() {
  const el = document.createElement('div');
  el.id = 'pwa-ptr';
  el.innerHTML = '<div class="ptr-spinner"></div><span>Release to refresh</span>';
  document.body.appendChild(el);

  let startY = 0, pulling = false, triggered = false;
  const TRIGGER = 80;

  document.addEventListener('touchstart', e => {
    if (window.scrollY <= 0) {
      startY  = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 10 && dy < TRIGGER + 30) {
      const prog = Math.min(dy / TRIGGER, 1);
      el.style.transform = `translateX(-50%) translateY(${dy * 0.5 - 60}px)`;
      el.querySelector('span').textContent = dy >= TRIGGER ? '✓ Release to refresh' : 'Pull to refresh';
    }
    if (dy >= TRIGGER && !triggered) { triggered = true; haptic('medium'); }
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (triggered) {
      el.style.transform = 'translateX(-50%) translateY(4px)';
      setTimeout(() => window.location.reload(), 400);
    } else {
      el.style.transform = 'translateX(-50%) translateY(-60px)';
    }
    pulling = triggered = false;
  }, { passive: true });
}

// ── INSTALL PROMPT ─────────────────────────────────────────
let deferredPrompt = null;

function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    // Only show banner if not already installed and not dismissed in last 7 days
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed && Date.now() - +dismissed < 7 * 86400000) return;
    setTimeout(() => showInstallBanner(), 3500);
  });

  window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    localStorage.removeItem('pwa_install_dismissed');
    showInstallToast();
  });
}

function showInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.innerHTML = `
    <div class="pib-icon">📲</div>
    <div class="pib-text">
      <div class="pib-title">Add to Home Screen</div>
      <div class="pib-sub">Works offline · No app store needed</div>
    </div>
    <button class="pib-btn" onclick="PWA.install()">Install</button>
    <button class="pib-close" onclick="PWA.dismissInstall()" aria-label="Dismiss">×</button>`;
  document.body.appendChild(banner);
}

function hideInstallBanner() {
  const el = document.getElementById('pwa-install-banner');
  if (!el) return;
  el.classList.add('out');
  setTimeout(() => el.remove(), 300);
}

PWA.install = async function () {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  hideInstallBanner();
  if (outcome === 'accepted') showInstallToast();
};

PWA.dismissInstall = function () {
  localStorage.setItem('pwa_install_dismissed', Date.now());
  hideInstallBanner();
};

function showInstallToast() {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed;bottom:calc(var(--nav-h) + var(--sab) + 12px);
    left:50%;transform:translateX(-50%);
    background:var(--ink,#0a0a0a);color:var(--bg,#f5f2eb);
    padding:12px 20px;border-radius:100px;font-size:13px;
    font-family:'DM Mono',monospace;white-space:nowrap;
    box-shadow:0 4px 20px rgba(0,0,0,.2);z-index:9999;
    animation:bannerIn .4s cubic-bezier(.34,1.56,.64,1) both;
    border:1px solid rgba(160,216,64,.3);`;
  t.textContent = '✅ Installed! Open from home screen';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── SERVICE WORKER ──────────────────────────────────────────
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .catch(() => {}); // Silently fail in dev
}

// ── HAPTIC FEEDBACK ─────────────────────────────────────────
function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  const patterns = { light:[20], medium:[40], heavy:[80], success:[20,40,20] };
  navigator.vibrate(patterns[type] || [20]);
}
PWA.haptic = haptic;

// ── RIPPLE EFFECT ────────────────────────────────────────────
function ripple(el, event) {
  const r   = document.createElement('div');
  r.className = 'pwa-ripple';
  const rect = el.getBoundingClientRect();
  r.style.left = (event.clientX - rect.left - 40) + 'px';
  r.style.top  = (event.clientY - rect.top  - 40) + 'px';
  el.style.overflow = 'hidden';
  el.appendChild(r);
  setTimeout(() => r.remove(), 500);
}

// ── KEYBOARD SHORTCUT (desktop tab navigation) ───────────────
document.addEventListener('keydown', e => {
  if (!e.altKey) return;
  const maps = { '1':'index.html','2':'analytics.html','3':'notifications.html','4':'profile.html' };
  if (maps[e.key]) { e.preventDefault(); window.location.href = maps[e.key]; }
});

})(); // end IIFE
