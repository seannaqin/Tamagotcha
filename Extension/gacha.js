// Gacha System Configuration
const GACHA_CONFIG = {
  pets: [
    { name: 'Dragon', rarity: 5, chance: 0.03, imageFile: 'dragon_happy.png' },
    { name: 'Fox', rarity: 4, chance: 0.10, imageFile: 'fox_happy.png' },
    { name: 'Penguin', rarity: 4, chance: 0.10, imageFile: 'penguin_happy.png' },
    { name: 'Mushroom', rarity: 3, chance: 0.385, imageFile: 'mushroom_happy.png' },
    { name: 'Slime', rarity: 3, chance: 0.385, imageFile: 'slime_happy.png' }
  ],
  pity: {
    rare: 10,  // 4-star pity
    legendary: 20  // 5-star pity
  }
};

let state = null;
let gachaState = {
  collection: {},
  rarePity: 0,
  legendaryPity: 0,
  lastRarePulled: 0,
  lastLegendaryPulled: 0
};

// ── Boot ───────────────────────────────────────────────────────────────────
function init() {
  loadGachaState();
}

function loadGachaState() {
  chrome.storage.local.get(['gachaState', 'state'], (data) => {
    state = data.state || {};
    gachaState = data.gachaState || {
      collection: {},
      rarePity: 0,
      legendaryPity: 0,
      lastRarePulled: 0,
      lastLegendaryPulled: 0
    };
    renderAll();
    attachEventListeners();
  });
}

// ── Event Listeners ────────────────────────────────────────────────────────
function attachEventListeners() {
  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'options.html';
  });

  document.getElementById('singlePullBtn').addEventListener('click', () => {
    performPull(1);
  });

  document.getElementById('tenPullBtn').addEventListener('click', () => {
    performPull(10);
  });

  document.getElementById('closeResultsBtn').addEventListener('click', () => {
    closeResults();
  });

  document.getElementById('dropAllBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to drop all pets? This cannot be undone.')) {
      dropAllPets();
    }
  });
}

// ── Gacha Pull Logic ───────────────────────────────────────────────────────
function performPull(count) {
  const results = [];

  for (let i = 0; i < count; i++) {
    const pet = rollPet();
    results.push(pet);
    addToCollection(pet);
  }

  // Save updated state
  chrome.storage.local.set({ gachaState }, () => {
    showResults(results);
    renderAll();
  });
}

function rollPet() {
  const random = Math.random();
  let chance = 0;

  // Legendary (5-star) logic
  if (gachaState.legendaryPity >= GACHA_CONFIG.pity.legendary || random < 0.03) {
    gachaState.legendaryPity = 0;
    gachaState.rarePity = 0;
    gachaState.lastLegendaryPulled = Date.now();
    return GACHA_CONFIG.pets[0]; // Dragon
  }

  // Rare (4-star) logic
  if (gachaState.rarePity >= GACHA_CONFIG.pity.rare || random < 0.23) {
    gachaState.rarePity = 0;
    gachaState.legendaryPity++;
    gachaState.lastRarePulled = Date.now();
    
    // 50/50 between Fox and Penguin
    return Math.random() < 0.5 ? GACHA_CONFIG.pets[1] : GACHA_CONFIG.pets[2];
  }

  // Regular (3-star) logic
  gachaState.rarePity++;
  gachaState.legendaryPity++;
  
  return Math.random() < 0.5 ? GACHA_CONFIG.pets[3] : GACHA_CONFIG.pets[4];
}

function addToCollection(pet) {
  if (!gachaState.collection[pet.name]) {
    gachaState.collection[pet.name] = 0;
  }
  gachaState.collection[pet.name]++;
}

// ── Render Functions ───────────────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderCollection();
  renderPityBars();
}

function renderStats() {
  const total = Object.values(gachaState.collection).reduce((a, b) => a + b, 0);
  const unique = Object.keys(gachaState.collection).length;
  
  document.getElementById('totalPets').textContent = total;
  document.getElementById('uniquePets').textContent = unique;
}

function renderCollection() {
  const grid = document.getElementById('collectionGrid');
  grid.innerHTML = '';

  GACHA_CONFIG.pets.forEach((pet) => {
    const div = document.createElement('div');
    div.className = 'collection-item';
    
    if (gachaState.collection[pet.name]) {
      const img = document.createElement('img');
      img.src = `assets/pets/${pet.imageFile}`;
      img.alt = pet.name;
      div.appendChild(img);

      const count = document.createElement('div');
      count.className = 'collection-count';
      count.textContent = `x${gachaState.collection[pet.name]}`;
      div.appendChild(count);
    } else {
      div.classList.add('empty');
      div.textContent = '?';
    }

    grid.appendChild(div);
  });
}

function renderPityBars() {
  const rarePityEl = document.getElementById('rarePity');
  const legendaryPityEl = document.getElementById('legendaryPity');
  const rarePityBar = document.getElementById('rarePityBar');
  const legendaryPityBar = document.getElementById('legendaryPityBar');

  rarePityEl.textContent = gachaState.rarePity;
  legendaryPityEl.textContent = gachaState.legendaryPity;

  const rarePercentage = (gachaState.rarePity / GACHA_CONFIG.pity.rare) * 100;
  const legendaryPercentage = (gachaState.legendaryPity / GACHA_CONFIG.pity.legendary) * 100;

  rarePityBar.style.width = Math.min(rarePercentage, 100) + '%';
  legendaryPityBar.style.width = Math.min(legendaryPercentage, 100) + '%';
}

// ── Results Display ────────────────────────────────────────────────────────
function showResults(results) {
  const modal = document.getElementById('resultsModal');
  const container = document.getElementById('resultsContainer');
  
  container.innerHTML = '';
  
  // Add class based on number of results for different layouts
  container.className = results.length === 1 ? 'results-container single-pull-results' : 'results-container ten-pull-results';

  // Sort by rarity (highest first) for visual appeal
  const sorted = results.sort((a, b) => b.rarity - a.rarity);

  sorted.forEach((pet) => {
    const div = document.createElement('div');
    div.className = 'result-item';

    const rarityClass = `${pet.rarity}-star`;
    const stars = '★'.repeat(pet.rarity);

    div.innerHTML = `
      <div class="result-image">
        <img src="assets/pets/${pet.imageFile}" alt="${pet.name}">
      </div>
      <div class="result-info">
        <div class="result-name">${pet.name}</div>
        <div class="result-rarity">
          <span class="rarity-badge ${rarityClass}">${stars}</span>
        </div>
      </div>
    `;

    container.appendChild(div);
  });

  modal.classList.remove('hidden');
}

function closeResults() {
  document.getElementById('resultsModal').classList.add('hidden');
}

function dropAllPets() {
  gachaState.collection = {};
  gachaState.rarePity = 0;
  gachaState.legendaryPity = 0;
  
  chrome.storage.local.set({ gachaState }, () => {
    renderAll();
  });
}

// ── Initialization ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
