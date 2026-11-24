let appData = null;
let currentJob = null;

const mainJobInput = document.getElementById('mainJobInput');
const jobSuggestions = document.getElementById('jobSuggestions');
const clearJobBtn = document.getElementById('clearJobBtn');
const operationSelect = document.getElementById('operationSelect');
const resultCard = document.getElementById('resultCard');
const balNumber = document.getElementById('balNumber');
const selectedOpTag = document.getElementById('selectedOpTag');
const detailStyle = document.getElementById('detailStyle');
const detailCut = document.getElementById('detailCut');
const detailWash = document.getElementById('detailWash');
const badgeJobs = document.getElementById('badgeJobs');
const allOpsCard = document.getElementById('allOpsCard');
const opsListContainer = document.getElementById('opsListContainer');
const allOpsCount = document.getElementById('allOpsCount');

// Fetch data.json
async function loadData() {
  try {
    const response = await fetch('data.json');
    appData = await response.json();
    badgeJobs.textContent = `${appData.total_jobs} M_Jobs`;
    badgeJobs.className = 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  } catch (err) {
    console.error('Failed to load data.json:', err);
    badgeJobs.textContent = 'Sync Error';
    badgeJobs.className = 'px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30';
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
      <li data-job="${m}" class="p-3 hover:bg-slate-800 cursor-pointer transition flex items-center justify-between">
        <div>
          <span class="font-bold text-white font-mono text-sm">${m}</span>
          <span class="text-xs text-slate-400 block">${jobInfo.style || ''} ${jobInfo.wash ? '• ' + jobInfo.wash : ''}</span>
        </div>
        <span class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
          ${Object.keys(jobInfo.operations).length} Ops
        </span>
      </li>
    `;
  }).join('');

  jobSuggestions.classList.remove('hidden');
});

// Select job
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

  // Fill details
  detailStyle.textContent = currentJob.style || '-';
  detailCut.textContent = currentJob.cut != null ? Number(currentJob.cut).toLocaleString() : '-';
  detailWash.textContent = currentJob.wash || '-';

  // Populate Operations Select
  const ops = Object.keys(currentJob.operations).sort();
  operationSelect.innerHTML = '<option value="">-- Choose Operation (' + ops.length + ') --</option>' + 
    ops.map(op => `<option value="${op}">${op}</option>`).join('');
  
  operationSelect.disabled = false;

  // Render all operations preview list
  renderAllOperations(currentJob.operations);

  // If there are operations, select first or reset result card
  resultCard.classList.add('hidden');
}

// Clear button
clearJobBtn.addEventListener('click', () => {
  mainJobInput.value = '';
  clearJobBtn.classList.add('hidden');
  jobSuggestions.classList.add('hidden');
  operationSelect.innerHTML = '<option value="">-- Choose Job First --</option>';
  operationSelect.disabled = true;
  resultCard.classList.add('hidden');
  allOpsCard.classList.add('hidden');
  currentJob = null;
});

// Operation Change
operationSelect.addEventListener('change', () => {
  const selectedOp = operationSelect.value;
  if (!currentJob || !selectedOp) {
    resultCard.classList.add('hidden');
    return;
  }

  const bal = currentJob.operations[selectedOp] ?? 0;
  balNumber.textContent = Number(bal).toLocaleString(undefined, { maximumFractionDigits: 2 });
  selectedOpTag.textContent = selectedOp;

  if (bal < 0) {
    balNumber.className = 'text-5xl font-black tracking-tight text-rose-400';
  } else if (bal === 0) {
    balNumber.className = 'text-5xl font-black tracking-tight text-emerald-400';
  } else {
    balNumber.className = 'text-5xl font-black tracking-tight text-white';
  }

  resultCard.classList.remove('hidden');
});

// Render all operations
function renderAllOperations(opsMap) {
  const entries = Object.entries(opsMap).sort((a, b) => a[0].localeCompare(b[0]));
  allOpsCount.textContent = `${entries.length} Total`;

  opsListContainer.innerHTML = entries.map(([op, bal]) => {
    let balColor = 'text-slate-200';
    if (bal < 0) balColor = 'text-rose-400';
    if (bal === 0) balColor = 'text-emerald-400';

    return `
      <div onclick="pickOp('${op.replace(/'/g, "\\'")}')" class="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-700/60 cursor-pointer transition border border-slate-800/80">
        <span class="text-xs font-medium text-slate-300 truncate pr-2">${op}</span>
        <span class="text-xs font-bold font-mono ${balColor}">${Number(bal).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      </div>
    `;
  }).join('');

  allOpsCard.classList.remove('hidden');
}

window.pickOp = function(opName) {
  operationSelect.value = opName;
  operationSelect.dispatchEvent(new Event('change'));
  window.scrollTo({ top: 180, behavior: 'smooth' });
};

// Close autocomplete when clicking outside
document.addEventListener('click', (e) => {
  if (!mainJobInput.contains(e.target) && !jobSuggestions.contains(e.target)) {
    jobSuggestions.classList.add('hidden');
  }
});

// Initial load
loadData();
