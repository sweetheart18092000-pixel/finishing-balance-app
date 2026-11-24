let appData = null;
let currentJob = null;
let selectedFilterOps = new Set(JSON.parse(localStorage.getItem('finishing_selected_ops') || '[]'));

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

const toggleFilterBtn = document.getElementById('toggleFilterBtn');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const filterChipsPanel = document.getElementById('filterChipsPanel');
const filterChipsContainer = document.getElementById('filterChipsContainer');
const selectedChipsCount = document.getElementById('selectedChipsCount');

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
    badgeJobs.textContent = `${appData.total_jobs} M_Jobs`;
    badgeJobs.className = 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    if (appData.updated_at) {
      syncStatusText.textContent = `Updated: ${appData.updated_at}`;
    }
  } catch (err) {
    console.error('Failed to load data.json:', err);
    badgeJobs.textContent = 'Sync Error';
    badgeJobs.className = 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30';
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

  // Exact match auto-select if user types full M_Job
  if (appData.jobs[query]) {
    selectJob(query);
    return;
  }

  const jobs = Object.keys(appData.jobs);
  const matches = jobs.filter(j => j.toUpperCase().includes(query)).slice(0, 15);

  if (matches.length === 0) {
    jobSuggestions.innerHTML = '<li class="p-3 text-xs text-slate-400 text-center">No M_Job found</li>';
    jobSuggestions.classList.remove('hidden');
    return;
  }

  jobSuggestions.innerHTML = matches.map(m => {
    const jobInfo = appData.jobs[m];
    return `
      <li data-job="${escapeHtml(m)}" class="p-3 hover:bg-slate-800 cursor-pointer transition flex items-center justify-between">
        <div class="min-w-0 pr-2">
          <div class="flex items-center space-x-2">
            <span class="font-bold text-white font-mono text-sm">${escapeHtml(m)}</span>
            ${jobInfo.customer ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/25">${escapeHtml(jobInfo.customer)}</span>` : ''}
          </div>
          <span class="text-xs text-slate-400 block truncate">${escapeHtml(jobInfo.pc9 || '')} ${jobInfo.color ? '• ' + escapeHtml(jobInfo.color) : ''}</span>
        </div>
        <span class="text-[10px] shrink-0 bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
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

  // Render Filter Chips & Operations Table
  renderFilterChips(ops);
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
    balNumber.className = 'text-lg font-black font-mono text-rose-400 mt-0.5 block';
  } else if (opData.bal === 0) {
    balNumber.className = 'text-lg font-black font-mono text-emerald-400 mt-0.5 block';
  } else {
    balNumber.className = 'text-lg font-black font-mono text-white mt-0.5 block';
  }

  resultCard.classList.remove('hidden');
  highlightActiveRow(selectedOp);
});

function highlightActiveRow(activeOp) {
  const rows = opsListContainer.querySelectorAll('[data-op-row]');
  rows.forEach(row => {
    const isMatch = row.getAttribute('data-op-row') === activeOp;
    row.classList.toggle('ring-2', isMatch);
    row.classList.toggle('ring-indigo-500', isMatch);
    row.classList.toggle('bg-indigo-950/50', isMatch);
  });
}

// Filter Chips toggle & multi-select
toggleFilterBtn.addEventListener('click', () => {
  filterChipsPanel.classList.toggle('hidden');
});

clearFilterBtn.addEventListener('click', () => {
  selectedFilterOps.clear();
  localStorage.setItem('finishing_selected_ops', JSON.stringify([]));
  if (currentJob) {
    renderFilterChips(Object.keys(currentJob.operations).sort());
    renderAllOperations();
  }
});

function renderFilterChips(ops) {
  const activeInJob = ops.filter(op => selectedFilterOps.has(op));
  selectedChipsCount.textContent = `${selectedFilterOps.size} selected`;
  clearFilterBtn.classList.toggle('hidden', selectedFilterOps.size === 0);

  filterChipsContainer.innerHTML = ops.map(op => {
    const isSelected = selectedFilterOps.has(op);
    const cls = isSelected
      ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700';
    return `
      <button type="button" data-chip-op="${escapeHtml(op)}" class="px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${cls}">
        ${isSelected ? '✓ ' : ''}${escapeHtml(op)}
      </button>
    `;
  }).join('');
}

filterChipsContainer.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-chip-op]');
  if (!btn || !currentJob) return;
  const op = btn.getAttribute('data-chip-op');

  if (selectedFilterOps.has(op)) {
    selectedFilterOps.delete(op);
  } else {
    selectedFilterOps.add(op);
  }

  localStorage.setItem('finishing_selected_ops', JSON.stringify(Array.from(selectedFilterOps)));
  renderFilterChips(Object.keys(currentJob.operations).sort());
  renderAllOperations();
});

// Render Operations Table (TODATE, BUFFER, BAL)
function renderAllOperations() {
  if (!currentJob) return;

  let entries = Object.entries(currentJob.operations).sort((a, b) => a[0].localeCompare(b[0]));
  const totalOps = entries.length;

  if (selectedFilterOps.size > 0) {
    const filtered = entries.filter(([op]) => selectedFilterOps.has(op));
    entries = filtered;
    allOpsCount.textContent = `Showing ${entries.length} of ${totalOps} (Filtered)`;
  } else {
    allOpsCount.textContent = `${totalOps} Operations`;
  }

  if (entries.length === 0) {
    opsListContainer.innerHTML = `
      <div class="p-4 text-center text-xs text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
        No matching operations in current filter. <button onclick="clearFilterBtn.click()" class="text-indigo-400 underline ml-1">Show All</button>
      </div>
    `;
    allOpsCard.classList.remove('hidden');
    return;
  }

  opsListContainer.innerHTML = entries.map(([op, stats]) => {
    const bal = stats.bal ?? 0;
    let balColor = 'text-slate-100';
    if (bal < 0) balColor = 'text-rose-400';
    if (bal === 0) balColor = 'text-emerald-400';

    return `
      <div data-op-row="${escapeHtml(op)}" class="grid grid-cols-12 gap-1 items-center px-2.5 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-700/60 cursor-pointer transition border border-slate-800/80 text-xs">
        <div class="col-span-5 font-medium text-slate-200 truncate pr-1" title="${escapeHtml(op)}">${escapeHtml(op)}</div>
        <div class="col-span-2 text-right font-mono text-sky-300 text-[11px]">${fmtNum(stats.todate)}</div>
        <div class="col-span-2 text-right font-mono text-amber-300 text-[11px]">${fmtNum(stats.buffer)}</div>
        <div class="col-span-3 text-right font-mono font-bold ${balColor}">${fmtNum(bal)}</div>
      </div>
    `;
  }).join('');

  allOpsCard.classList.remove('hidden');
  if (operationSelect.value) {
    highlightActiveRow(operationSelect.value);
  }
}

// Click row to view selected operation card
opsListContainer.addEventListener('click', (e) => {
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
