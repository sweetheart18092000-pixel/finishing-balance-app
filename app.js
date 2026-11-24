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

// Fetch data.json
async function loadData() {
  try {
    const response = await fetch('data.json?v=' + Date.now());
    appData = await response.json();
    badgeJobs.textContent = `${appData.total_jobs} Jobs`;
    badgeJobs.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 backdrop-blur-sm';
    if (appData.updated_at) {
      syncStatusText.textContent = `Updated: ${appData.updated_at}`;
    }
    renderRecentJobs();
  } catch (err) {
    console.error('Failed to load data.json:', err);
    badgeJobs.textContent = 'Sync Error';
    badgeJobs.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/25 text-rose-200 border border-rose-400/30';
  }
}

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

function selectJob(jobCode) {
  if (!appData || !appData.jobs[jobCode]) return;

  currentJobCode = jobCode;
  currentJob = appData.jobs[jobCode];
  mainJobInput.value = jobCode;
  clearJobBtn.classList.remove('hidden');
  jobSuggestions.classList.add('hidden');
  opSearchInput.value = '';

  // Fill Job Details
  detailJobCode.textContent = jobCode;
  detailPc9.textContent = currentJob.pc9 || '-';
  detailExf.textContent = currentJob.first_exf || '-';
  detailMax.textContent = fmtNum(currentJob.max);
  detailCustomer.textContent = currentJob.customer || '-';
  detailColor.textContent = currentJob.color || '-';
  jobDetailsCard.classList.remove('hidden');

  addRecentJob(jobCode);
  updateStatusPills();
  updateSortIndicators();
  renderAllOperations();
}

// Clear button
clearJobBtn.addEventListener('click', () => {
  mainJobInput.value = '';
  clearJobBtn.classList.add('hidden');
  jobSuggestions.classList.add('hidden');
  jobDetailsCard.classList.add('hidden');
  allOpsCard.classList.add('hidden');
  currentJob = null;
  currentJobCode = null;
  renderRecentJobs();
});

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

    const borderCls = isChecked
      ? 'border-blue-500 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-1 ring-blue-500/30'
      : 'border-slate-200/80 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/70 hover:bg-blue-50/40 dark:hover:bg-zinc-800/80';

    return `
      <div data-op-row="${escapeHtml(op)}" class="grid grid-cols-12 gap-1 items-center px-2 py-1.5 rounded-lg cursor-pointer transition border ${borderCls} text-[11px]">
        <div class="col-span-5 flex items-center space-x-1.5 min-w-0">
          <input type="checkbox" data-op-check="${escapeHtml(op)}" ${isChecked ? 'checked' : ''} class="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0" />
          <span class="font-semibold text-slate-800 dark:text-zinc-200 truncate" title="${escapeHtml(op)}">${escapeHtml(op)}</span>
        </div>
        <div class="col-span-2 text-right font-mono font-medium text-blue-700 dark:text-sky-400 text-[10.5px] tabular-nums">${fmtNum(stats.todate)}</div>
        <div class="col-span-2 text-right font-mono font-medium text-amber-600 dark:text-amber-400 text-[10.5px] tabular-nums">${fmtNum(stats.buffer)}</div>
        <div class="col-span-3 text-right font-mono font-extrabold ${balColor} text-[11px] tabular-nums">${fmtNum(bal)}</div>
      </div>
    `;
  }).join('');

  allOpsCard.classList.remove('hidden');
}

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

function buildWhatsAppMessage() {
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

openWhatsappBtn.addEventListener('click', () => {
  if (!currentJob) return;
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
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  window.location.href = `whatsapp://send?text=${encodeURIComponent(text)}`;
});

// Initial load
loadData();
