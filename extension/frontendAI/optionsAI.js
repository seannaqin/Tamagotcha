document.addEventListener("DOMContentLoaded", () => {
  // Navigation
  const navLinks = document.querySelectorAll('.nav-links li');
  const sections = document.querySelectorAll('.tab-content');

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.forEach(l => l.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      link.classList.add('active');
      document.getElementById(link.dataset.target).classList.add('active');
    });
  });

  loadData();

  // Settings Events
  document.getElementById('save-timers-btn').addEventListener('click', saveTimers);
  document.getElementById('add-site-btn').addEventListener('click', addBannedSite);

  // Storage listener
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      loadData();
    }
  });
});

function loadData() {
  chrome.storage.local.get(null, (state) => {
    if (!state || !state.stats) return;

    // Stats
    document.getElementById('stat-pets-killed').textContent = state.stats.petsKilled;
    document.getElementById('stat-max-lifespan').textContent = state.stats.longestLifespan + ' days';
    document.getElementById('stat-hours-studied').textContent = state.stats.hoursStudied.toFixed(1);

    // Pet Showcase
    const pet = state.pet;
    const petImg = document.getElementById('showcase-pet-img');
    const petStatus = document.getElementById('showcase-pet-status');
    const healthBar = document.getElementById('showcase-health-bar');

    healthBar.style.width = Math.min(100, Math.max(0, pet.health)) + "%";

    petStatus.textContent = pet.status.charAt(0).toUpperCase() + pet.status.slice(1);
    if (pet.status === "happy") {
      petImg.src = "assets/pet_healthy.png";
      petStatus.style.color = "var(--health-good)";
      healthBar.style.backgroundColor = "var(--health-good)";
    } else if (pet.status === "sad") {
      petImg.src = "assets/pet_sad.png";
      petStatus.style.color = "var(--health-ok)";
      healthBar.style.backgroundColor = "var(--health-ok)";
    } else if (pet.status === "dead") {
      petImg.src = "assets/pet_dead.png";
      petStatus.style.color = "var(--health-bad)";
      healthBar.style.backgroundColor = "var(--health-bad)";
    }

    // Settings Loading (don't overwrite if user is currently typing)
    if (state.timers && document.activeElement !== document.getElementById('work-duration')) {
      document.getElementById('work-duration').value = state.timers.work;
    }
    if (state.timers && document.activeElement !== document.getElementById('break-duration')) {
      document.getElementById('break-duration').value = state.timers.break;
    }

    if (state.settings && state.settings.bannedSites) {
      renderBannedSites(state.settings.bannedSites);
    }
  });
}

function saveTimers() {
  const work = parseInt(document.getElementById('work-duration').value);
  const breakTime = parseInt(document.getElementById('break-duration').value);

  if (work > 0 && breakTime > 0) {
    chrome.storage.local.set({
      timers: { work, break: breakTime }
    }, () => {
      const msg = document.getElementById('timer-save-msg');
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 2000);
    });
  }
}

function renderBannedSites(sites) {
  const list = document.getElementById('banned-sites-list');
  list.innerHTML = '';

  sites.forEach(site => {
    const li = document.createElement('li');
    li.textContent = site;

    const rmBtn = document.createElement('button');
    rmBtn.textContent = 'Remove';
    rmBtn.className = 'btn danger';
    rmBtn.onclick = () => removeBannedSite(site);

    li.appendChild(rmBtn);
    list.appendChild(li);
  });
}

function addBannedSite() {
  const input = document.getElementById('new-site-input');
  let site = input.value.trim().toLowerCase();

  if (!site) return;

  try {
    if (site.startsWith('http')) {
      site = new URL(site).hostname;
    }
  } catch (e) { }

  chrome.storage.local.get(['settings'], (state) => {
    const sites = state.settings.bannedSites || [];
    if (!sites.includes(site)) {
      sites.push(site);
      chrome.storage.local.set({
        settings: { ...state.settings, bannedSites: sites }
      }, () => {
        input.value = '';
        renderBannedSites(sites);
      });
    }
  });
}

function removeBannedSite(siteToRemove) {
  chrome.storage.local.get(['settings'], (state) => {
    let sites = state.settings.bannedSites || [];
    sites = sites.filter(s => s !== siteToRemove);
    chrome.storage.local.set({
      settings: { ...state.settings, bannedSites: sites }
    }, () => {
      renderBannedSites(sites);
    });
  });
}
