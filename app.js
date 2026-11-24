let appData = null;
let currentJob = null;
let selectedFilterOps = new Set(JSON.parse(localStorage.getItem('finishing_selected_ops') || '[]'));
let showOnlySelected = false;

const htmlEl = document.documentElement;
const themeToggleBtn = document.getElementById('themeToggleBtn');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

// Initialize Theme (Default: Clean Light, Toggleable to Dark)
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
const opSelectWrapper = document.getElementById('opSelectWrapper');
const operationSelect = document.getElementById('operationSelect');

const jobDetailsCard = document.getElementById('jobDetailsCard');
const detailJobCode = document.getElementById('detailJobCode');
const detailPc9 = document.getElementById('detailPc9');
const detailExf = document.getElementById('detailExf');
const detailMax = document.getElementById('detailMax');
const detailCustomer = document.getElementById('detailCustomer');
const detailColor = document.getElementById('detailColor');

const resultCard = document.getElementById('resultCard');
const selectedOpTag = document.getElementById('selectedOpTag');
const opTodate = document.getElementById('opTodate');
const opBuffer = document.getElementById('opBuffer');
const balNumber = document.getElementById('balNumber');

const badgeJobs = document.getElementById('badgeJobs');
const allOpsCard = document.getElementById('allOpsCard');
const opsListContainer = document.getElementById('opsListContainer');
const allOpsCount = document.getElementById('allOpsCount');
const syncStatusText = document.getElementById('syncStatusText');

const showSelectedBtn = document.getElementById('showSelectedBtn');
const clearFilterBtn = document.getElementById('clearFilterBtn');

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

// Fetch data.json (cache-busted so mobile always gets latest GitHub push)
async function loadData() {
  try {
    const response = await fetch('data.json?v=' + Date.now());
    appData = await response.json();
    badgeJobs.textContent = `${appData.total_jobs} Jobs`;
    badgeJobs.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 backdrop-blur-sm';
    if (appData.updated_at) {
      syncStatusText.textContent = `Updated: ${appData.updated_at}`;
    }
  } catch (err) {
    console.error('Failed to load data.json:', err);
    badgeJobs.textContent = 'Sync Error';
    badgeJobs.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/25 text-rose-200 border border-rose-400/30';
  }
}

// Autocomplete logic
mainJobInput.addEventListener('input', () => {
  const query = mainJobInput.value.trim().toUpperCase();
  clearJobBtn.classList.toggle('hidden', query.length === 0);

  if (!appData || query.length === 0) {
    jobSuggestions.classList.add('hidden');
    return;
  }

  // Exact match auto-select
  if (appData.jobs[query]) {
    selectJob(query);
    return;
  }

  const jobs = Object.keys(appData.jobs);
  const matches = jobs.filter(j => j.toUpperCase().includes(query)).slice(0, 15);

  if (matches.length === 0) {
    jobSuggestions.innerHTML = '<li class="p-3 text-xs text-slate-400 dark:text-zinc-500 text-center">No M_Job found</li>';
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

// Select job from suggestions
jobSuggestions.addEventListener('click', (e) => {
  const li = e.target.closest('li[data-job]');
  if (!li) return;
  selectJob(li.getAttribute('data-job'));
});

function selectJob(jobCode) {
  if (!appData || !appData.jobs[jobCode]) return;

  currentJob = appData.jobs[jobCode];
  mainJobInput.value = jobCode;
  clearJobBtn.classList.remove('hidden');
  jobSuggestions.classList.add('hidden');

  // Fill Job Details immediately
  detailJobCode.textContent = jobCode;
  detailPc9.textContent = currentJob.pc9 || '-';
  detailExf.textContent = currentJob.first_exf || '-';
  detailMax.textContent = fmtNum(currentJob.max);
  detailCustomer.textContent = currentJob.customer || '-';
  detailColor.textContent = currentJob.color || '-';
  jobDetailsCard.classList.remove('hidden');

  // Populate Quick Operations Select
  const ops = Object.keys(currentJob.operations).sort();
  operationSelect.innerHTML = '<option value="">-- Choose Operation (' + ops.length + ') --</option>' +
    ops.map(op => `<option value="${escapeHtml(op)}">${escapeHtml(op)}</option>`).join('');
  opSelectWrapper.classList.remove('hidden');

  resultCard.classList.add('hidden');

  // Render Operations Table
  renderAllOperations();
}

// Clear button
clearJobBtn.addEventListener('click', () => {
  mainJobInput.value = '';
  clearJobBtn.classList.add('hidden');
  jobSuggestions.classList.add('hidden');
  opSelectWrapper.classList.add('hidden');
  jobDetailsCard.classList.add('hidden');
  resultCard.classList.add('hidden');
  allOpsCard.classList.add('hidden');
  currentJob = null;
});

// Operation Change
operationSelect.addEventListener('change', () => {
  const selectedOp = operationSelect.value;
  if (!currentJob || !selectedOp || !currentJob.operations[selectedOp]) {
    resultCard.classList.add('hidden');
    highlightActiveRow(null);
    return;
  }

  const opData = currentJob.operations[selectedOp];
  selectedOpTag.textContent = selectedOp;
  opTodate.textContent = fmtNum(opData.todate);
  opBuffer.textContent = fmtNum(opData.buffer);
  balNumber.textContent = fmtNum(opData.bal);

  if (opData.bal < 0) {
    balNumber.className = 'text-lg font-black font-mono text-rose-300 mt-0.5 block tabular-nums';
  } else if (opData.bal === 0) {
    balNumber.className = 'text-lg font-black font-mono text-emerald-300 mt-0.5 block tabular-nums';
  } else {
    balNumber.className = 'text-lg font-black font-mono text-white mt-0.5 block tabular-nums';
  }

  resultCard.classList.remove('hidden');
  highlightActiveRow(selectedOp);
});

function highlightActiveRow(activeOp) {
  const rows = opsListContainer.querySelectorAll('[data-op-row]');
  rows.forEach(row => {
    const isMatch = row.getAttribute('data-op-row') === activeOp;
    row.classList.toggle('ring-2', isMatch);
    row.classList.toggle('ring-blue-500', isMatch);
    row.classList.toggle('bg-blue-50', isMatch);
    row.classList.toggle('dark:bg-blue-950/40', isMatch);
  });
}

function updateFilterButtons(totalOps) {
  const checkedInJob = currentJob
    ? Object.keys(currentJob.operations).filter(op => selectedFilterOps.has(op)).length
    : 0;

  if (selectedFilterOps.size > 0) {
    showSelectedBtn.classList.remove('hidden');
    clearFilterBtn.classList.remove('hidden');
    if (showOnlySelected) {
      showSelectedBtn.textContent = `Show All (${totalOps})`;
      showSelectedBtn.className = 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-700 hover:bg-slate-800 text-white shadow-sm transition';
    } else {
      showSelectedBtn.textContent = `Selected Only (${checkedInJob})`;
      showSelectedBtn.className = 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition';
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

// Render Operations Table (Checkboxes + TODATE, BUFFER, BAL)
function renderAllOperations() {
  if (!currentJob) return;

  let entries = Object.entries(currentJob.operations).sort((a, b) => a[0].localeCompare(b[0]));
  const totalOps = entries.length;

  updateFilterButtons(totalOps);

  if (showOnlySelected && selectedFilterOps.size > 0) {
    entries = entries.filter(([op]) => selectedFilterOps.has(op));
    allOpsCount.textContent = `Showing ${entries.length} of ${totalOps} Selected`;
  } else {
    allOpsCount.textContent = `${totalOps} Operations (Check ✓ to filter)`;
  }

  if (entries.length === 0) {
    opsListContainer.innerHTML = `
      <div class="p-4 text-center text-xs text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800">
        No checked operations in this job. <button onclick="showSelectedBtn.click()" class="text-blue-600 dark:text-sky-400 font-bold underline ml-1">Show All</button>
      </div>
    `;
    allOpsCard.classList.remove('hidden');
    return;
  }

  opsListContainer.innerHTML = entries.map(([op, stats]) => {
    const bal = stats.bal ?? 0;
    const isChecked = selectedFilterOps.has(op);
    let balColor = 'text-slate-900 dark:text-zinc-100';
    if (bal < 0) balColor = 'text-rose-600 dark:text-rose-400';
    if (bal === 0) balColor = 'text-emerald-600 dark:text-emerald-400';

    return `
      <div data-op-row="${escapeHtml(op)}" class="grid grid-cols-12 gap-1 items-center px-2.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/70 hover:bg-blue-50/70 dark:hover:bg-zinc-800 cursor-pointer transition border ${isChecked ? 'border-blue-400 dark:border-blue-600 bg-blue-50/40 dark:bg-blue-950/20' : 'border-slate-200/70 dark:border-zinc-800'} text-xs">
        <div class="col-span-5 flex items-center space-x-2 min-w-0">
          <input type="checkbox" data-op-check="${escapeHtml(op)}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0" />
          <span class="font-semibold text-slate-800 dark:text-zinc-200 truncate" title="${escapeHtml(op)}">${escapeHtml(op)}</span>
        </div>
        <div class="col-span-2 text-right font-mono font-medium text-blue-700 dark:text-sky-400 text-[11px] tabular-nums">${fmtNum(stats.todate)}</div>
        <div class="col-span-2 text-right font-mono font-medium text-amber-600 dark:text-amber-400 text-[11px] tabular-nums">${fmtNum(stats.buffer)}</div>
        <div class="col-span-3 text-right font-mono font-extrabold ${balColor} tabular-nums">${fmtNum(bal)}</div>
      </div>
    `;
  }).join('');

  allOpsCard.classList.remove('hidden');
  if (operationSelect.value) {
    highlightActiveRow(operationSelect.value);
  }
}

// Handle checkbox toggle OR row click
opsListContainer.addEventListener('click', (e) => {
  const checkbox = e.target.closest('input[data-op-check]');
  if (checkbox) {
    e.stopPropagation();
    const opName = checkbox.getAttribute('data-op-check');
    if (checkbox.checked) {
      selectedFilterOps.add(opName);
    } else {
      selectedFilterOps.delete(opName);
    }
    localStorage.setItem('finishing_selected_ops', JSON.stringify(Array.from(selectedFilterOps)));
    renderAllOperations();
    return;
  }

  const row = e.target.closest('[data-op-row]');
  if (!row) return;
  const opName = row.getAttribute('data-op-row');
  operationSelect.value = opName;
  operationSelect.dispatchEvent(new Event('change'));
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// Close autocomplete when clicking outside
document.addEventListener('click', (e) => {
  if (!mainJobInput.contains(e.target) && !jobSuggestions.contains(e.target)) {
    jobSuggestions.classList.add('hidden');
  }
});

// Initial load
loadData();
