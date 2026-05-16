let state = null;
let countdownInterval = null;

// TODO: replace this

const timerDisplay  = document.getElementById('timerDisplay');
const sessionLabel  = document.getElementById('sessionLabel');
const nextInfo      = document.getElementById('nextInfo');
const startBtn      = document.getElementById('startBtn');
const pauseBtn      = document.getElementById('pauseBtn');
const resetBtn      = document.getElementById('resetBtn');
const petImage      = document.getElementById('petImage');
const healthBar     = document.getElementById('healthBar');
const healthPct     = document.getElementById('healthPct');
const statAge       = document.getElementById('statAge');
const statDeceased  = document.getElementById('statDeceased');
const statLongest   = document.getElementById('statLongest');
const statHours     = document.getElementById('statHours');
const statLongestStudy = document.getElementById('statLongestStudy');
const blockedList   = document.getElementById('blockedList');
const toggleAddForm = document.getElementById('toggleAddForm');
const addSiteForm   = document.getElementById('addSiteForm');
const newSiteInput  = document.getElementById('newSiteInput');
const confirmAdd    = document.getElementById('confirmAdd');

// ── Boot ───────────────────────────────────────────────────────────────────
loadState();

function loadState() {
  chrome.runtime.sendMessage({ action: 'getState' }, (result) => {
    state = result;
    renderAll();
    tickCountdown();
  });
}

// ── Render all panels ──────────────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderPet();
  renderTimerPanel();
  renderBlockedSites();
}

function renderStats() {
  const { pet, stats } = state;
  const ageDays = Math.floor((Date.now() - pet.birthDate) / 86400000);
  statAge.textContent       = `${ageDays} day${ageDays !== 1 ? 's' : ''}`;
  statDeceased.textContent  = stats.petsKilled;
  statLongest.textContent   = `${stats.longestLifespan} days`;
  statHours.textContent     = Math.floor(stats.hoursStudied);

  const longestMins = stats.longestSessionMins || 0;
  statLongestStudy.textContent = formatTime(longestMins * 60);
}

function renderPet() {
  const { pet } = state;
  const pct = Math.max(0, Math.min(100, Math.round(pet.health)));
  healthBar.style.width = pct + '%';
  healthPct.textContent = pct + '%';

  if (pet.status === 'dead') {
    petImage.src = 'assets/pet_dead.png';
  } else if (pet.status === 'sad') {
    petImage.src = 'assets/pet_sad.png';
  } else {
    petImage.src = 'assets/pet_healthy.png';
  }
}

function renderTimerPanel() {
  const { session, timers } = state;
  const breakSecs = (timers.break || 5) * 60;
  nextInfo.textContent = `Next: ${formatTime(breakSecs)} break`;

  if (session.isActive) {
    sessionLabel.textContent = session.type === 'break' ? 'Break Time' : 'Study Time';
    startBtn.textContent = 'Stop';
    startBtn.classList.add('running');
    pauseBtn.disabled = false;
    updateCountdownDisplay();
  } else {
    sessionLabel.textContent = 'Study Time';
    startBtn.textContent = 'Start';
    startBtn.classList.remove('running');
    pauseBtn.disabled = true;
    timerDisplay.textContent = formatTime((timers.work || 25) * 60);
  }
}

function renderBlockedSites() {
  const sites = (state.settings && state.settings.bannedSites) || [];
  blockedList.innerHTML = '';
  sites.forEach((site, i) => {
    const li = document.createElement('li');
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '−';
    removeBtn.addEventListener('click', () => removeSite(i));

    li.appendChild(removeBtn);
    li.insertAdjacentHTML('beforeend',
      `<span class="site-bullet">•</span><span class="site-name" title="${site}">${site}</span>`
    );
    blockedList.appendChild(li);
  });
}

// ── Countdown ──────────────────────────────────────────────────────────────
function tickCountdown() {
  clearInterval(countdownInterval);
  if (!state.session.isActive) return;

  countdownInterval = setInterval(() => {
    updateCountdownDisplay();
  }, 1000);
}

function updateCountdownDisplay() {
  const remaining = Math.max(0, Math.floor((state.session.endTime - Date.now()) / 1000));
  timerDisplay.textContent = formatTime(remaining);

  if (remaining <= 0) {
    clearInterval(countdownInterval);
    setTimeout(loadState, 1200);
  }
}

function formatTime(totalSecs) {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ── Timer controls ─────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  if (state.session.isActive) {
    chrome.runtime.sendMessage({ action: 'stopTimer' }, () => {
      clearInterval(countdownInterval);
      loadState();
    });
  } else {
    const duration = state.timers.work || 25;
    chrome.runtime.sendMessage({ action: 'startTimer', type: 'work', duration }, () => {
      loadState();
    });
  }
});

pauseBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'stopTimer' }, () => {
    clearInterval(countdownInterval);
    loadState();
  });
});

resetBtn.addEventListener('click', () => {
  if (state.session.isActive) {
    chrome.runtime.sendMessage({ action: 'stopTimer' }, () => {
      clearInterval(countdownInterval);
      loadState();
    });
  } else {
    loadState();
  }
});

// ── Blocked sites ──────────────────────────────────────────────────────────
toggleAddForm.addEventListener('click', () => {
  const hidden = addSiteForm.classList.toggle('hidden');
  if (!hidden) newSiteInput.focus();
});

confirmAdd.addEventListener('click', addSite);
newSiteInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addSite();
  if (e.key === 'Escape') addSiteForm.classList.add('hidden');
});

function addSite() {
  const raw = newSiteInput.value.trim().toLowerCase();
  if (!raw) return;
  const site = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  if (!site) return;

  const sites = (state.settings && state.settings.bannedSites) || [];
  if (sites.includes(site)) {
    newSiteInput.value = '';
    addSiteForm.classList.add('hidden');
    return;
  }

  state.settings.bannedSites = [...sites, site];
  chrome.storage.local.set({ settings: state.settings }, () => {
    newSiteInput.value = '';
    addSiteForm.classList.add('hidden');
    renderBlockedSites();
  });
}

function removeSite(index) {
  state.settings.bannedSites = state.settings.bannedSites.filter((_, i) => i !== index);
  chrome.storage.local.set({ settings: state.settings }, () => {
    renderBlockedSites();
  });
}
