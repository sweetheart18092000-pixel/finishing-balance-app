let appData = null;
let currentJob = null;
let currentJobCode = null;
let selectedFilterOps = new Set(JSON.parse(localStorage.getItem('finishing_selected_ops') || '[]'));
let recentJobs = JSON.parse(localStorage.getItem('finishing_recent_jobs') || '[]');
let showOnlySelected = false;
let activeStatusFilter = 'all';
let sortKey = 'seq';
let sortDir = 1; // 1 = asc, -1 = desc
let lastRenderedEntries = [];
let homeMode = localStorage.getItem('finishing_home_mode') || 'near'; // 'near' | 'neg'
let nearSortBy = localStorage.getItem('finishing_near_sort') || 'pct'; // 'pct' | 'exf'
let lastHomeItems = [];
let waShareMode = 'job'; // 'job' | 'summary'

const htmlEl = document.documentElement;
const themeToggleBtn = document.getElementById('themeToggleBtn');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

// Theme Setup
function applyTheme(theme) {
  if (theme === 'dark') {
    htmlEl.classList.add('dark');
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  } else {
    htmlEl.classList.remove('dark');
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  }
  localStorage.setItem('finishing_theme', theme);
}

applyTheme(localStorage.getItem('finishing_theme') || 'light');

themeToggleBtn.addEventListener('click', () => {
  const isDark = htmlEl.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
});

const mainJobInput = document.getElementById('mainJobInput');
const jobSuggestions = document.getElementById('jobSuggestions');
const clearJobBtn = document.getElementById('clearJobBtn');
const recentJobsBar = document.getElementById('recentJobsBar');
const recentJobsList = document.getElementById('recentJobsList');

const jobDetailsCard = document.getElementById('jobDetailsCard');
const detailJobCode = document.getElementById('detailJobCode');
const detailPc9 = document.getElementById('detailPc9');
const detailExf = document.getElementById('detailExf');
const detailMax = document.getElementById('detailMax');
const detailCustomer = document.getElementById('detailCustomer');
const detailColor = document.getElementById('detailColor');

const badgeJobs = document.getElementById('badgeJobs');
const allOpsCard = document.getElementById('allOpsCard');
const opsListContainer = document.getElementById('opsListContainer');
const allOpsCount = document.getElementById('allOpsCount');
const syncStatusText = document.getElementById('syncStatusText');

const showSelectedBtn = document.getElementById('showSelectedBtn');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const opSearchInput = document.getElementById('opSearchInput');
const selectAllOpsCheckbox = document.getElementById('selectAllOpsCheckbox');

const nearClosingCard = document.getElementById('nearClosingCard');
const nearClosingList = document.getElementById('nearClosingList');
const nearClosingCount = document.getElementById('nearClosingCount');
const nearOpSelect = document.getElementById('nearOpSelect');
const nearCustomerSelect = document.getElementById('nearCustomerSelect');
const nearPctInput = document.getElementById('nearPctInput');
const nearPctWrapper = document.getElementById('nearPctWrapper');
const nearSortBtn = document.getElementById('nearSortBtn');
const nearRightColHdr = document.getElementById('nearRightColHdr');
const modeNearBtn = document.getElementById('modeNearBtn');
const modeNegBtn = document.getElementById('modeNegBtn');
const nearWhatsappBtn = document.getElementById('nearWhatsappBtn');
const refreshDataBtn = document.getElementById('refreshDataBtn');
const refreshIcon = document.getElementById('refreshIcon');
const backHomeBtn = document.getElementById('backHomeBtn');

const openWhatsappBtn = document.getElementById('openWhatsappBtn');
const waModal = document.getElementById('waModal');
const closeWaModalBtn = document.getElementById('closeWaModalBtn');
const waRemarksInput = document.getElementById('waRemarksInput');
const waPreview = document.getElementById('waPreview');
const waColTodate = document.getElementById('waColTodate');
const waColBuffer = document.getElementById('waColBuffer');
const waColBal = document.getElementById('waColBal');
const copyWaBtn = document.getElementById('copyWaBtn');
const sendWaPersonalBtn = document.getElementById('sendWaPersonalBtn');
const sendWaBusinessBtn = document.getElementById('sendWaBusinessBtn');
const shareNativeBtn = document.getElementById('shareNativeBtn');

function fmtNum(val) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Register Offline Service Worker & Desktop/Mobile PWA Install Prompt
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

let deferredPrompt = null;
const installAppBtn = document.getElementById('installAppBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installAppBtn) installAppBtn.classList.remove('hidden');
});

if (installAppBtn) {
  installAppBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      installAppBtn.classList.add('hidden');
    }
    deferredPrompt = null;
  });
}

window.addEventListener('appinstalled', () => {
  if (installAppBtn) installAppBtn.classList.add('hidden');
  deferredPrompt = null;
});

// Fetch data.json
async function loadData(isManual = false) {
  if (isManual && refreshIcon) {
    refreshIcon.classList.add('animate-spin');
  }
  try {
    const response = await fetch('data.json?v=' + Date.now());
    appData = await response.json();
    badgeJobs.textContent = `${appData.total_jobs} Jobs`;
    badgeJobs.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30';
    if (appData.updated_at) {
      syncStatusText.textContent = `Updated: ${appData.updated_at}`;
    }
    initNearClosingControls();
    renderRecentJobs();
    if (currentJobCode && appData.jobs[currentJobCode]) {
      selectJob(currentJobCode, true);
    } else {
      renderNearClosingJobs();
    }
  } catch (err) {
    console.error('Failed to load data.json:', err);
    badgeJobs.textContent = 'Offline / Error';
    badgeJobs.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/25 text-rose-200 border border-rose-400/30';
  } finally {
    if (refreshIcon) {
      setTimeout(() => refreshIcon.classList.remove('animate-spin'), 400);
    }
  }
}

refreshDataBtn.addEventListener('click', () => loadData(true));

const MONTHS_MAP = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };

function parseExfDate(str) {
  if (!str || str === '-') return null;
  const parts = str.trim().split('-');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const mon = MONTHS_MAP[parts[1].toUpperCase()];
  const yr = 2000 + parseInt(parts[2], 10);
  if (isNaN(day) || mon === undefined || isNaN(yr)) return null;
  return new Date(yr, mon, day);
}

function getExfBadgeHtml(exfStr) {
  if (!exfStr || exfStr === '-') return `<span class="text-[10px] text-slate-400">-</span>`;
  const shortDate = exfStr.replace(/-\d{2}$/, '');
  const d = parseExfDate(exfStr);
  if (!d) {
    return `<span class="text-[10px] font-bold text-slate-600 dark:text-zinc-300">${escapeHtml(shortDate)}</span>`;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d - today) / 86400000);
  if (diffDays < 0) {
    return `<span class="inline-block px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 leading-tight">${escapeHtml(shortDate)}</span>
            <span class="block text-[8.5px] font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">OVERDUE</span>`;
  }
  if (diffDays <= 7) {
    return `<span class="inline-block px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 leading-tight">${escapeHtml(shortDate)}</span>
            <span class="block text-[8.5px] font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">URGENT</span>`;
  }
  return `<span class="text-[10.5px] font-semibold text-slate-600 dark:text-zinc-300">${escapeHtml(shortDate)}</span>`;
}

function updateHomeModeUI() {
  if (homeMode === 'neg') {
    modeNegBtn.className = 'px-2 py-0.5 rounded-md text-[10px] font-extrabold transition bg-rose-600 text-white shadow-xs';
    modeNearBtn.className = 'px-2 py-0.5 rounded-md text-[10px] font-extrabold transition text-slate-600 dark:text-zinc-300';
    nearClosingCount.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white';
    nearPctWrapper.classList.add('hidden');
    if (nearRightColHdr) nearRightColHdr.textContent = 'NEG BAL';
  } else {
    modeNearBtn.className = 'px-2 py-0.5 rounded-md text-[10px] font-extrabold transition bg-emerald-600 text-white shadow-xs';
    modeNegBtn.className = 'px-2 py-0.5 rounded-md text-[10px] font-extrabold transition text-slate-600 dark:text-zinc-300';
    nearClosingCount.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white';
    nearPctWrapper.classList.remove('hidden');
    if (nearRightColHdr) nearRightColHdr.textContent = 'BAL / MAX';
  }
  nearSortBtn.textContent = nearSortBy === 'exf' ? 'Sort: EXF' : (homeMode === 'neg' ? 'Sort: BAL' : 'Sort: %');
}

function initNearClosingControls() {
  if (!appData) return;
  const ops = appData.operations_list || [];
  const savedOp = localStorage.getItem('finishing_near_op') || (ops.includes('PACKING A') ? 'PACKING A' : (ops[0] || ''));
  const savedPct = localStorage.getItem('finishing_near_pct') || '20';
  const savedCust = localStorage.getItem('finishing_near_cust') || '';

  const opOptions = [`<option value="__ALL__">ALL OPS</option>`].concat(
    ops.map(op => `<option value="${escapeHtml(op)}">${escapeHtml(op)}</option>`)
  );
  nearOpSelect.innerHTML = opOptions.join('');
  nearOpSelect.value = (savedOp === '__ALL__' || ops.includes(savedOp)) ? savedOp : (ops.includes('PACKING A') ? 'PACKING A' : '__ALL__');
  nearPctInput.value = savedPct;

  const customers = Array.from(new Set(
    Object.values(appData.jobs).map(j => (j.customer || '').trim()).filter(Boolean)
  )).sort();
  nearCustomerSelect.innerHTML = `<option value="">All Cust</option>` +
    customers.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  nearCustomerSelect.value = customers.includes(savedCust) ? savedCust : '';

  updateHomeModeUI();
}

modeNearBtn.addEventListener('click', () => {
  homeMode = 'near';
  localStorage.setItem('finishing_home_mode', homeMode);
  if (nearOpSelect.value === '__ALL__') {
    const ops = appData?.operations_list || [];
    nearOpSelect.value = ops.includes('PACKING A') ? 'PACKING A' : (ops[0] || '');
    localStorage.setItem('finishing_near_op', nearOpSelect.value);
  }
  updateHomeModeUI();
  renderNearClosingJobs();
});

modeNegBtn.addEventListener('click', () => {
  homeMode = 'neg';
  localStorage.setItem('finishing_home_mode', homeMode);
  updateHomeModeUI();
  renderNearClosingJobs();
});

nearOpSelect.addEventListener('change', () => {
  localStorage.setItem('finishing_near_op', nearOpSelect.value);
  renderNearClosingJobs();
});

nearCustomerSelect.addEventListener('change', () => {
  localStorage.setItem('finishing_near_cust', nearCustomerSelect.value);
  renderNearClosingJobs();
});

nearPctInput.addEventListener('input', () => {
  localStorage.setItem('finishing_near_pct', nearPctInput.value);
  renderNearClosingJobs();
});

nearSortBtn.addEventListener('click', () => {
  nearSortBy = nearSortBy === 'exf' ? 'pct' : 'exf';
  localStorage.setItem('finishing_near_sort', nearSortBy);
  updateHomeModeUI();
  renderNearClosingJobs();
});

function renderNearClosingJobs() {
  if (!appData || currentJob) {
    nearClosingCard.classList.add('hidden');
    return;
  }

  const targetOp = nearOpSelect.value || 'PACKING A';
  const targetCust = nearCustomerSelect.value || '';
  const maxPct = parseFloat(nearPctInput.value);
  const threshold = isNaN(maxPct) || maxPct <= 0 ? 20 : maxPct;

  const items = [];
  for (const [mj, j] of Object.entries(appData.jobs)) {
    if (targetCust && (j.customer || '').trim() !== targetCust) continue;
    const mx = j.max || 0;
    const ops = j.operations || {};

    if (homeMode === 'neg') {
      if (targetOp === '__ALL__') {
        const negOps = Object.entries(ops).filter(([, s]) => (s.bal ?? 0) < 0);
        if (negOps.length > 0) {
          negOps.sort((a, b) => a[1].bal - b[1].bal);
          const worstOp = negOps[0][0];
          const worstBal = negOps[0][1].bal;
          items.push({
            mj, color: j.color || '-', pc9: j.pc9 || '', exf: j.first_exf || '',
            cust: j.customer || '', bal: worstBal, mx, pct: 0,
            negLabel: negOps.length > 1 ? `${worstOp} (+${negOps.length - 1} more)` : worstOp
          });
        }
      } else {
        const opObj = ops[targetOp];
        if (opObj && (opObj.bal ?? 0) < 0) {
          items.push({
            mj, color: j.color || '-', pc9: j.pc9 || '', exf: j.first_exf || '',
            cust: j.customer || '', bal: opObj.bal, mx, pct: 0, negLabel: targetOp
          });
        }
      }
    } else {
      if (targetOp === '__ALL__') continue;
      const opObj = ops[targetOp];
      if (opObj && mx > 0) {
        const bal = opObj.bal ?? 0;
        const pct = (bal / mx) * 100;
        if (bal > 0 && pct <= threshold) {
          items.push({
            mj, color: j.color || '-', pc9: j.pc9 || '', exf: j.first_exf || '',
            cust: j.customer || '', bal, mx, pct
          });
        }
      }
    }
  }

  if (nearSortBy === 'exf') {
    items.sort((a, b) => {
      const da = parseExfDate(a.exf);
      const db = parseExfDate(b.exf);
      if (!da && !db) return a.pct - b.pct;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    });
  } else if (homeMode === 'neg') {
    items.sort((a, b) => a.bal - b.bal);
  } else {
    items.sort((a, b) => a.pct - b.pct);
  }

  lastHomeItems = items;
  nearClosingCount.textContent = items.length;

  if (items.length === 0) {
    const emptyMsg = homeMode === 'neg'
      ? 'No jobs with Negative BAL.'
      : (targetOp === '__ALL__' ? 'Please select a specific Operation.' : `No jobs with ${escapeHtml(targetOp)} ≤ ${threshold}%.`);
    nearClosingList.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">${emptyMsg}</div>`;
  } else {
    nearClosingList.innerHTML = items.map(item => `
      <div data-near-job="${escapeHtml(item.mj)}" class="grid grid-cols-[1fr_72px_88px] gap-1.5 items-center px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800/80 cursor-pointer transition even:bg-slate-50/50 dark:even:bg-zinc-950/30">
        <div class="min-w-0">
          <div class="flex items-center space-x-1.5 min-w-0">
            <span class="font-mono font-extrabold text-xs text-blue-700 dark:text-sky-400 shrink-0">${escapeHtml(item.mj)}</span>
            <span class="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 truncate">${escapeHtml(item.pc9)}</span>
            ${item.cust ? `<span class="text-[9px] font-bold px-1 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 shrink-0">${escapeHtml(item.cust)}</span>` : ''}
          </div>
          <div class="text-[11px] font-bold text-slate-800 dark:text-zinc-100 truncate mt-0.5">${escapeHtml(item.color)}</div>
          ${homeMode === 'neg' ? `<div class="text-[9.5px] font-bold text-rose-600 dark:text-rose-400 truncate mt-0.5">${escapeHtml(item.negLabel)}</div>` : ''}
        </div>
        <div class="text-center leading-tight">
          ${getExfBadgeHtml(item.exf)}
        </div>
        <div class="text-right">
          ${homeMode === 'neg'
            ? `<div class="text-sm font-mono font-black text-rose-600 dark:text-rose-400 tabular-nums">${fmtNum(item.bal)}</div>
               <span class="text-[9px] font-bold text-slate-400">Negative</span>`
            : `<div class="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums leading-tight">${fmtNum(item.bal)}<span class="text-[9.5px] font-normal text-slate-400 block">/ ${fmtNum(item.mx)}</span></div>
               <span class="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 tabular-nums">${item.pct.toFixed(1)}% left</span>`
          }
        </div>
      </div>
    `).join('');
  }

  nearClosingCard.classList.remove('hidden');
}

nearClosingList.addEventListener('click', (e) => {
  const row = e.target.closest('[data-near-job]');
  if (!row) return;
  selectJob(row.getAttribute('data-near-job'));
});

function addRecentJob(jobCode) {
  recentJobs = [jobCode, ...recentJobs.filter(j => j !== jobCode)].slice(0, 5);
  localStorage.setItem('finishing_recent_jobs', JSON.stringify(recentJobs));
  renderRecentJobs();
}

function renderRecentJobs() {
  if (!appData || recentJobs.length === 0) {
    recentJobsBar.classList.add('hidden');
    return;
  }
  const valid = recentJobs.filter(j => appData.jobs[j]);
  if (valid.length === 0) {
    recentJobsBar.classList.add('hidden');
    return;
  }
  recentJobsList.innerHTML = valid.map(j => {
    const active = j === currentJobCode;
    const cls = active
      ? 'bg-blue-600 text-white border-blue-600'
      : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-blue-50';
    return `<button type="button" data-recent-job="${escapeHtml(j)}" class="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border transition shrink-0 ${cls}">${escapeHtml(j)}</button>`;
  }).join('');
  recentJobsBar.classList.remove('hidden');
}

recentJobsList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-recent-job]');
  if (!btn) return;
  selectJob(btn.getAttribute('data-recent-job'));
});

// Autocomplete logic
mainJobInput.addEventListener('input', () => {
  const query = mainJobInput.value.trim().toUpperCase();
  clearJobBtn.classList.toggle('hidden', query.length === 0);

  if (!appData || query.length === 0) {
    jobSuggestions.classList.add('hidden');
    return;
  }

  if (appData.jobs[query]) {
    selectJob(query);
    return;
  }

  const jobs = Object.keys(appData.jobs);
  const matches = jobs.filter(j => {
    const info = appData.jobs[j];
    return j.toUpperCase().includes(query) ||
      (info.pc9 && info.pc9.toUpperCase().includes(query)) ||
      (info.color && info.color.toUpperCase().includes(query));
  }).slice(0, 20);

  if (matches.length === 0) {
    jobSuggestions.innerHTML = '<li class="p-3 text-xs text-slate-400 dark:text-zinc-500 text-center">No matching M_Job, PC9, or Color found</li>';
    jobSuggestions.classList.remove('hidden');
    return;
  }

  jobSuggestions.innerHTML = matches.map(m => {
    const jobInfo = appData.jobs[m];
    return `
      <li data-job="${escapeHtml(m)}" class="p-3 hover:bg-blue-50 dark:hover:bg-zinc-800 cursor-pointer transition flex items-center justify-between">
        <div class="min-w-0 pr-2">
          <div class="flex items-center space-x-2">
            <span class="font-extrabold text-slate-900 dark:text-white font-mono text-sm">${escapeHtml(m)}</span>
            ${jobInfo.customer ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-sky-500/15 text-blue-700 dark:text-sky-300">${escapeHtml(jobInfo.customer)}</span>` : ''}
          </div>
          <span class="text-xs text-slate-500 dark:text-zinc-400 block truncate mt-0.5">${escapeHtml(jobInfo.pc9 || '')} ${jobInfo.color ? '• ' + escapeHtml(jobInfo.color) : ''}</span>
        </div>
        <span class="text-[10px] font-bold shrink-0 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700">
          ${Object.keys(jobInfo.operations).length} Ops
        </span>
      </li>
    `;
  }).join('');

  jobSuggestions.classList.remove('hidden');
});

mainJobInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const firstLi = jobSuggestions.querySelector('li[data-job]');
    if (firstLi) {
      selectJob(firstLi.getAttribute('data-job'));
    }
  }
});

jobSuggestions.addEventListener('click', (e) => {
  const li = e.target.closest('li[data-job]');
  if (!li) return;
  selectJob(li.getAttribute('data-job'));
});

function selectJob(jobCode, fromPopState = false) {
  if (!appData || !appData.jobs[jobCode]) return;

  if (currentJobCode !== jobCode) {
    selectedFilterOps.clear();
    showOnlySelected = false;
    activeStatusFilter = 'all';
    localStorage.setItem('finishing_selected_ops', JSON.stringify([]));
  }

  currentJobCode = jobCode;
  currentJob = appData.jobs[jobCode];
  mainJobInput.value = jobCode;
  clearJobBtn.classList.remove('hidden');
  jobSuggestions.classList.add('hidden');
  opSearchInput.value = '';

  if (!fromPopState) {
    history.pushState({ job: jobCode }, '', `#job=${encodeURIComponent(jobCode)}`);
  }

  // Fill Job Details
  detailJobCode.textContent = jobCode;
  detailPc9.textContent = currentJob.pc9 || '-';
  detailExf.textContent = currentJob.first_exf || '-';
  detailMax.textContent = fmtNum(currentJob.max);
  detailCustomer.textContent = currentJob.customer || '-';
  detailColor.textContent = currentJob.color || '-';
  jobDetailsCard.classList.remove('hidden');

  addRecentJob(jobCode);
  nearClosingCard.classList.add('hidden');
  updateStatusPills();
  updateSortIndicators();
  renderAllOperations();
}

function resetToHome(fromPopState = false) {
  mainJobInput.value = '';
  clearJobBtn.classList.add('hidden');
  jobSuggestions.classList.add('hidden');
  jobDetailsCard.classList.add('hidden');
  allOpsCard.classList.add('hidden');
  selectedFilterOps.clear();
  showOnlySelected = false;
  activeStatusFilter = 'all';
  opSearchInput.value = '';
  localStorage.setItem('finishing_selected_ops', JSON.stringify([]));
  currentJob = null;
  currentJobCode = null;
  renderRecentJobs();
  renderNearClosingJobs();
  if (!fromPopState && window.location.hash.startsWith('#job=')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

// Clear & Back buttons (always reset immediately, and clean history)
clearJobBtn.addEventListener('click', () => {
  resetToHome();
});

backHomeBtn.addEventListener('click', () => {
  resetToHome();
});

function handleRouteBack() {
  if (!waModal.classList.contains('hidden')) {
    waModal.classList.add('hidden');
    return;
  }
  const hash = window.location.hash;
  if (hash.startsWith('#job=')) {
    const code = decodeURIComponent(hash.slice(5));
    if (appData && appData.jobs[code]) {
      selectJob(code, true);
      return;
    }
  }
  resetToHome(true);
}

window.addEventListener('popstate', handleRouteBack);
window.addEventListener('hashchange', handleRouteBack);

// Status Filter Pills
function updateStatusPills() {
  document.querySelectorAll('.status-pill').forEach(btn => {
    const active = btn.getAttribute('data-status-filter') === activeStatusFilter;
    if (active) {
      btn.className = 'status-pill px-2 py-0.5 rounded-full text-[10px] font-bold border transition shrink-0 bg-blue-600 text-white border-blue-600 shadow-sm';
    } else {
      btn.className = 'status-pill px-2 py-0.5 rounded-full text-[10px] font-bold border transition shrink-0 bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-100';
    }
  });
}

document.querySelectorAll('.status-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    activeStatusFilter = btn.getAttribute('data-status-filter');
    selectedFilterOps.clear();
    showOnlySelected = false;
    localStorage.setItem('finishing_selected_ops', JSON.stringify([]));
    updateStatusPills();
    renderAllOperations();
  });
});

// Operation Name Search
opSearchInput.addEventListener('input', () => {
  renderAllOperations();
});

// Column Sorting
function updateSortIndicators() {
  document.querySelectorAll('.sort-ind').forEach(el => {
    const key = el.getAttribute('data-ind');
    el.textContent = key === sortKey ? (sortDir === 1 ? '▲' : '▼') : '';
  });
}

document.querySelectorAll('button[data-sort]').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-sort');
    if (sortKey === key) {
      sortDir *= -1;
    } else {
      sortKey = key;
      sortDir = key === 'op' ? 1 : -1;
    }
    updateSortIndicators();
    renderAllOperations();
  });
});

// Selected Checkboxes Filter Buttons
function updateFilterButtons(totalOps) {
  const checkedInJob = currentJob
    ? Object.keys(currentJob.operations).filter(op => selectedFilterOps.has(op)).length
    : 0;

  if (selectedFilterOps.size > 0) {
    showSelectedBtn.classList.remove('hidden');
    clearFilterBtn.classList.remove('hidden');
    if (showOnlySelected) {
      showSelectedBtn.textContent = `Show All (${totalOps})`;
      showSelectedBtn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-700 hover:bg-slate-800 text-white shadow-sm transition';
    } else {
      showSelectedBtn.textContent = `Selected (${checkedInJob})`;
      showSelectedBtn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition';
    }
  } else {
    showOnlySelected = false;
    showSelectedBtn.classList.add('hidden');
    clearFilterBtn.classList.add('hidden');
  }
}

showSelectedBtn.addEventListener('click', () => {
  showOnlySelected = !showOnlySelected;
  renderAllOperations();
});

clearFilterBtn.addEventListener('click', () => {
  selectedFilterOps.clear();
  showOnlySelected = false;
  localStorage.setItem('finishing_selected_ops', JSON.stringify([]));
  renderAllOperations();
});

// Render Operations Table
function renderAllOperations() {
  if (!currentJob) return;

  let entries = Object.entries(currentJob.operations);
  const totalOps = entries.length;

  updateFilterButtons(totalOps);

  // Filter: Checked Only
  if (showOnlySelected && selectedFilterOps.size > 0) {
    entries = entries.filter(([op]) => selectedFilterOps.has(op));
  }

  // Filter: Status Pill
  if (activeStatusFilter === 'pending') {
    entries = entries.filter(([, s]) => (s.bal ?? 0) > 0);
  } else if (activeStatusFilter === 'done') {
    entries = entries.filter(([, s]) => (s.bal ?? 0) === 0);
  } else if (activeStatusFilter === 'excess') {
    entries = entries.filter(([, s]) => (s.bal ?? 0) < 0);
  }

  // Filter: Search Query
  const opQuery = opSearchInput.value.trim().toUpperCase();
  if (opQuery) {
    entries = entries.filter(([op]) => op.toUpperCase().includes(opQuery));
  }

  // Sort
  entries.sort((a, b) => {
    if (sortKey === 'seq') {
      return ((a[1].seq ?? 9999) - (b[1].seq ?? 9999)) * sortDir;
    }
    if (sortKey === 'op') {
      return a[0].localeCompare(b[0]) * sortDir;
    }
    const va = a[1][sortKey] ?? 0;
    const vb = b[1][sortKey] ?? 0;
    return (va - vb) * sortDir;
  });

  allOpsCount.textContent = `Showing ${entries.length} of ${totalOps} Operations`;
  lastRenderedEntries = entries;

  if (selectAllOpsCheckbox) {
    const visibleCheckedCount = entries.filter(([op]) => selectedFilterOps.has(op)).length;
    selectAllOpsCheckbox.checked = entries.length > 0 && visibleCheckedCount === entries.length;
    selectAllOpsCheckbox.indeterminate = visibleCheckedCount > 0 && visibleCheckedCount < entries.length;
  }

  if (entries.length === 0) {
    opsListContainer.innerHTML = `
      <div class="p-4 text-center text-xs text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800">
        No operations match this filter.
      </div>
    `;
    allOpsCard.classList.remove('hidden');
    return;
  }

  opsListContainer.innerHTML = entries.map(([op, stats]) => {
    const bal = stats.bal ?? 0;
    const isChecked = selectedFilterOps.has(op);
    let balColor = 'text-slate-900 dark:text-zinc-100';
    let rowAccent = '';
    if (bal < 0) {
      balColor = 'text-rose-600 dark:text-rose-400';
    } else if (bal === 0) {
      balColor = 'text-emerald-600 dark:text-emerald-400';
    }

    const rowCls = isChecked
      ? 'bg-blue-50/90 dark:bg-blue-950/35'
      : 'bg-white dark:bg-zinc-900 even:bg-slate-50/60 dark:even:bg-zinc-950/40 hover:bg-blue-50/40 dark:hover:bg-zinc-800/70';

    return `
      <div data-op-row="${escapeHtml(op)}" class="grid grid-cols-[1fr_66px_58px_68px] gap-1 items-center px-2.5 py-2 cursor-pointer transition ${rowCls} text-xs">
        <div class="flex items-center space-x-2 min-w-0">
          <input type="checkbox" data-op-check="${escapeHtml(op)}" ${isChecked ? 'checked' : ''} class="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0" />
          <span class="font-semibold text-slate-800 dark:text-zinc-200 truncate" title="${escapeHtml(op)}">${escapeHtml(op)}</span>
        </div>
        <div class="text-right font-mono font-bold text-blue-700 dark:text-sky-400 text-[13px] tabular-nums">${fmtNum(stats.todate)}</div>
        <div class="text-right font-mono font-bold text-amber-600 dark:text-amber-400 text-[13px] tabular-nums">${fmtNum(stats.buffer)}</div>
        <div class="text-right font-mono font-extrabold ${balColor} text-[13.5px] tabular-nums">${fmtNum(bal)}</div>
      </div>
    `;
  }).join('');

  allOpsCard.classList.remove('hidden');
}

// Select All / Deselect All visible operations
selectAllOpsCheckbox.addEventListener('change', () => {
  if (!currentJob || lastRenderedEntries.length === 0) return;
  if (selectAllOpsCheckbox.checked) {
    lastRenderedEntries.forEach(([op]) => selectedFilterOps.add(op));
  } else {
    lastRenderedEntries.forEach(([op]) => selectedFilterOps.delete(op));
  }
  localStorage.setItem('finishing_selected_ops', JSON.stringify(Array.from(selectedFilterOps)));
  renderAllOperations();
});

// Tap anywhere on row (or checkbox) to check/uncheck operation
opsListContainer.addEventListener('click', (e) => {
  const row = e.target.closest('[data-op-row]');
  if (!row) return;
  const opName = row.getAttribute('data-op-row');

  if (selectedFilterOps.has(opName)) {
    selectedFilterOps.delete(opName);
  } else {
    selectedFilterOps.add(opName);
  }

  localStorage.setItem('finishing_selected_ops', JSON.stringify(Array.from(selectedFilterOps)));
  renderAllOperations();
});

// Close autocomplete when clicking outside
document.addEventListener('click', (e) => {
  if (!mainJobInput.contains(e.target) && !jobSuggestions.contains(e.target)) {
    jobSuggestions.classList.add('hidden');
  }
});

// WhatsApp Share Logic
const savedWaCols = JSON.parse(localStorage.getItem('finishing_wa_cols') || '{"todate":false,"buffer":false,"bal":true}');
waColTodate.checked = !!savedWaCols.todate;
waColBuffer.checked = !!savedWaCols.buffer;
waColBal.checked = savedWaCols.bal !== false;

function saveWaCols() {
  localStorage.setItem('finishing_wa_cols', JSON.stringify({
    todate: waColTodate.checked,
    buffer: waColBuffer.checked,
    bal: waColBal.checked
  }));
  updateWaPreview();
}

[waColTodate, waColBuffer, waColBal].forEach(cb => cb.addEventListener('change', saveWaCols));

function buildWhatsAppSummaryMessage() {
  const targetOp = nearOpSelect.value === '__ALL__' ? 'ALL OPS' : (nearOpSelect.value || 'PACKING A');
  const cust = nearCustomerSelect.value || 'All Customers';
  const threshold = nearPctInput.value || '20';
  const title = homeMode === 'neg'
    ? `*NEGATIVE BAL ALERT (${targetOp} | ${cust})*`
    : `*NEAR CLOSING JOBS (${targetOp} ≤ ${threshold}% | ${cust})*`;

  const lines = [title, ``];
  if (lastHomeItems.length === 0) {
    lines.push('(No jobs found)');
  } else {
    lastHomeItems.forEach((item, idx) => {
      if (homeMode === 'neg') {
        lines.push(`${idx + 1}. *${item.mj}* (${item.pc9 || '-'}) — ${item.color}`);
        lines.push(`   ${item.negLabel}: *${fmtNum(item.bal)}* | EXF: ${item.exf || '-'}`);
      } else {
        lines.push(`${idx + 1}. *${item.mj}* (${item.pc9 || '-'}) — ${item.color}`);
        lines.push(`   BAL: *${fmtNum(item.bal)}* / ${fmtNum(item.mx)} (${item.pct.toFixed(1)}%) | EXF: ${item.exf || '-'}`);
      }
    });
  }

  const remarks = waRemarksInput.value.trim();
  if (remarks) {
    lines.push(``);
    lines.push(`*Status / Remarks:*`);
    lines.push(remarks);
  }
  return lines.join('\n');
}

function buildWhatsAppMessage() {
  if (waShareMode === 'summary') {
    return buildWhatsAppSummaryMessage();
  }
  if (!currentJob || !currentJobCode) return '';

  const showTodate = waColTodate.checked;
  const showBuffer = waColBuffer.checked;
  const showBal = waColBal.checked;

  const lines = [
    `*FINISHING STATUS - ${currentJobCode}*`,
    `PC9: ${currentJob.pc9 || '-'}`,
    `1st EXF: ${currentJob.first_exf || '-'} | MAX: ${fmtNum(currentJob.max)}`,
    `Customer: ${currentJob.customer || '-'}`,
    `Color: ${currentJob.color || '-'}`,
    ``,
    `*Operations:*`
  ];

  let opsToSend = lastRenderedEntries;
  if (selectedFilterOps.size > 0) {
    const checkedEntries = Object.entries(currentJob.operations)
      .filter(([op]) => selectedFilterOps.has(op))
      .sort((a, b) => (a[1].seq ?? 9999) - (b[1].seq ?? 9999));
    if (checkedEntries.length > 0) {
      opsToSend = checkedEntries;
    }
  }

  if (opsToSend.length === 0) {
    lines.push(`(No operations shown)`);
  } else {
    opsToSend.forEach(([op, s]) => {
      const parts = [];
      if (showTodate) parts.push(`TODATE: ${fmtNum(s.todate)}`);
      if (showBuffer) parts.push(`BUF: ${fmtNum(s.buffer)}`);
      if (showBal) parts.push(`BAL: *${fmtNum(s.bal)}*`);

      if (parts.length === 0) {
        lines.push(`• ${op}`);
      } else if (parts.length === 1) {
        lines.push(`• ${op} — ${parts[0]}`);
      } else {
        lines.push(`• *${op}*`);
        lines.push(`  ${parts.join(' | ')}`);
      }
    });
  }

  const remarks = waRemarksInput.value.trim();
  if (remarks) {
    lines.push(``);
    lines.push(`*Status / Remarks:*`);
    lines.push(remarks);
  }

  return lines.join('\n');
}

function updateWaPreview() {
  waPreview.textContent = buildWhatsAppMessage();
}

const waColsBlock = waColBal.closest('.space-y-3 > div');

openWhatsappBtn.addEventListener('click', () => {
  if (!currentJob) return;
  waShareMode = 'job';
  if (waColsBlock) waColsBlock.classList.remove('hidden');
  updateWaPreview();
  waModal.classList.remove('hidden');
});

nearWhatsappBtn.addEventListener('click', () => {
  if (!appData) return;
  waShareMode = 'summary';
  if (waColsBlock) waColsBlock.classList.add('hidden');
  updateWaPreview();
  waModal.classList.remove('hidden');
});

closeWaModalBtn.addEventListener('click', () => {
  waModal.classList.add('hidden');
});

waModal.addEventListener('click', (e) => {
  if (e.target === waModal) {
    waModal.classList.add('hidden');
  }
});

waRemarksInput.addEventListener('input', updateWaPreview);

copyWaBtn.addEventListener('click', async () => {
  const text = buildWhatsAppMessage();
  try {
    await navigator.clipboard.writeText(text);
    const old = copyWaBtn.textContent;
    copyWaBtn.textContent = 'Copied!';
    setTimeout(() => { copyWaBtn.textContent = old; }, 1500);
  } catch (err) {
    console.error('Copy failed:', err);
  }
});

function resetAfterSend() {
  waModal.classList.add('hidden');
  waRemarksInput.value = '';
  if (waShareMode === 'summary') {
    return;
  }
  selectedFilterOps.clear();
  showOnlySelected = false;
  activeStatusFilter = 'all';
  opSearchInput.value = '';
  localStorage.setItem('finishing_selected_ops', JSON.stringify([]));
  clearJobBtn.click();
  mainJobInput.focus();
}

function openWhatsAppPackage(pkg) {
  const text = buildWhatsAppMessage();
  const encoded = encodeURIComponent(text);
  const waMeUrl = `https://wa.me/?text=${encoded}`;
  const isAndroid = /Android/i.test(navigator.userAgent);

  if (isAndroid) {
    const fallback = encodeURIComponent(waMeUrl);
    window.location.href = `intent://send?text=${encoded}#Intent;scheme=whatsapp;package=${pkg};S.browser_fallback_url=${fallback};end`;
  } else {
    window.open(waMeUrl, '_blank');
  }

  setTimeout(resetAfterSend, 300);
}

sendWaPersonalBtn.addEventListener('click', () => {
  openWhatsAppPackage('com.whatsapp');
});

sendWaBusinessBtn.addEventListener('click', () => {
  openWhatsAppPackage('com.whatsapp.w4b');
});

shareNativeBtn.addEventListener('click', async () => {
  const text = buildWhatsAppMessage();
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Finishing Status - ${currentJobCode || ''}`,
        text: text
      });
      resetAfterSend();
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  window.location.href = `whatsapp://send?text=${encodeURIComponent(text)}`;
  setTimeout(resetAfterSend, 300);
});

// Initial load
loadData();
