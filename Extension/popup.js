let state = null;
let countdownInterval = null;
let maxTimerInput = 86400; // 1 day in seconds
let isEditing = false;
let customDuration = null; // User edited duration in seconds

const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const timerDisplay = document.getElementById('timerDisplay');
const reviveBtn = document.getElementById('reviveBtn');

function loadState() {
  chrome.runtime.sendMessage({ action: 'getState' }, (result) => {
    state = result;
    updateButtonStates();

    chrome.storage.local.get('pet', (data) => {
      if (data.pet) updatePetUI(data.pet);
    });

    if (state.session.isActive) {
      clearInterval(countdownInterval);
      countdownInterval = setInterval(updateDisplay, 1000);
      updateDisplay();
    } else {
      clearInterval(countdownInterval);
      updateDisplay();
    }
  });
}

pauseBtn.addEventListener('click', () => {
  if (!state) return;

  if (state.session.isActive) {
    chrome.runtime.sendMessage({ action: 'pauseTimer' }, () => {
      loadState();
    });
  } else if (state.session.pausedRemaining) {
    chrome.runtime.sendMessage({ action: 'resumeTimer' }, () => {
      loadState();
    });
  } else {
    const durationSecs = customDuration || ((state.timers.work || 25) * 60);
    chrome.runtime.sendMessage({ action: 'startTimer', type: 'work', duration: durationSecs / 60 }, () => {
      loadState();
    });
  }
});

resetBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'stopTimer' }, () => {
    loadState();
  });
});

function updateDisplay() {
  if (!state) return;

  let secs = 0;
  if (state.session.isActive) {
    secs = Math.max(0, Math.floor((state.session.endTime - Date.now()) / 1000));
  } else if (state.session.pausedRemaining) {
    secs = state.session.pausedRemaining;
  } else {
    secs = customDuration || ((state.timers.work || 25) * 60);
  }

  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  if (hours > 0) {
    timerDisplay.textContent = `${hours}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  } else {
    timerDisplay.textContent = `${mins}:${s.toString().padStart(2, '0')}`;
  }
}

function updateButtonStates() {
  if (!state) return;

  if (state.session.isActive) {
    pauseBtn.disabled = false;
    pauseBtn.textContent = '⏸';
  } else {
    pauseBtn.disabled = false;
    pauseBtn.textContent = '▶';
  }
}

// Initial fetch
loadState();

// Restore custom timer duration
chrome.storage.local.get('customDuration', (data) => {
  if (data.customDuration) {
    customDuration = data.customDuration;
    updateDisplay();
  }
});

timerDisplay.addEventListener('click', () => {
  if (isEditing || !state || state.session.isActive || state.session.pausedRemaining) return;

  isEditing = true;
  document.getElementById('pauseBtn').style.display = 'none';
  document.getElementById('resetBtn').style.display = 'none';

  const input = document.createElement('input');
  input.type = 'text';
  input.classList.add('timer-input');

  const formatInput = (val) => {
    const padded = val.padStart(6, '0').slice(-6);
    return `${padded.slice(0, 2)}:${padded.slice(2, 4)}:${padded.slice(4, 6)}`;
  };

  // digits starts empty — first keypress begins a fresh entry
  let digits = '';
  input.value = formatInput(digits); // shows 00:00:00 as placeholder

  timerDisplay.innerHTML = '';
  timerDisplay.appendChild(input);
  input.focus();

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const padded = digits.padStart(6, '0').slice(-6);
      const h = parseInt(padded.slice(0, 2)) || 0;
      const m = parseInt(padded.slice(2, 4)) || 0;
      const s = parseInt(padded.slice(4, 6)) || 0;
      const newTotal = Math.min((h * 3600) + (m * 60) + s, maxTimerInput);

      if (newTotal > 0) {
        customDuration = newTotal;
        chrome.storage.local.set({ customDuration: newTotal });
      }
      revert();
    } else if (e.key === 'Escape') {
      revert();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      digits = digits.slice(0, -1);
      input.value = formatInput(digits);
    } else if (/^\d$/.test(e.key)) {
      e.preventDefault();
      if (digits.length < 6) {
        digits += e.key;
      }
      input.value = formatInput(digits);
    } else if (e.key.length === 1) {
      e.preventDefault();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(revert, 100);
  });

  function revert() {
    isEditing = false;
    document.getElementById('pauseBtn').style.display = '';
    document.getElementById('resetBtn').style.display = '';
    updateDisplay();
  }
});


const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const signedInDiv = document.getElementById('signedIn');
const signedOutDiv = document.getElementById('signedOut');
const userName = document.getElementById('userName');
const errorMsg = document.getElementById('error-msg');

// Open extension options from popup
const optionsBtn = document.getElementById('optionsBtn');
if (optionsBtn) {
  optionsBtn.addEventListener('click', () => {
    // Preferred API
    if (chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else if (chrome.runtime && chrome.runtime.getURL) {
      // Fallback
      window.open(chrome.runtime.getURL('options.html'));
    }
  });
}

async function getAuthToken(retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(token);
        });
      });
      return token;
    } catch (err) {
      if (i === retries - 1) throw err; // last attempt, give up
      await new Promise(r => setTimeout(r, 500)); // wait 500ms before retry
    }
  }
}

signInBtn.addEventListener('click', async () => {
  try {
    const token = await getAuthToken();
    const response = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const user = await response.json();
    chrome.storage.local.set({ user, token });
    userName.textContent = `Signed in as ${user.name}`;
    signedOutDiv.style.display = 'none';
    signedInDiv.style.display = 'block';

  }
  catch (err) {
    errorMsg.textContent = `Sign in failed: ${err.message}`;
    errorMsg.style.display = 'block';
  }
});


signOutBtn.addEventListener('click', async () => {
  const { token } = await chrome.storage.local.get("token");
  if (token) {
    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
    await new Promise(r => chrome.identity.removeCachedAuthToken({ token }, r));
    await new Promise(r => chrome.identity.clearAllCachedAuthTokens(r));
  }
  await chrome.storage.local.remove(["user", "token"]);
  signedInDiv.style.display = 'none';
  signedOutDiv.style.display = 'block';
});

// Check if already signed in on load
chrome.storage.local.get('user', (data) => {
  if (data.user) {
    userName.textContent = `Signed in as ${data.user.name}`;
    signedOutDiv.style.display = 'none';
    signedInDiv.style.display = 'block';
  }
});

function updatePetUI(pet) {
  if (!pet) return;

  const health = Math.floor(pet.health);
  const healthText = document.getElementById('healthText');
  const healthBarFill = document.getElementById('healthBarFill');

  if (healthBarFill) {
    healthBarFill.style.width = `${health}%`;
    healthBarFill.classList.remove('high', 'medium', 'low');
    if (health > 50) {
      healthBarFill.classList.add('high');
    } else if (health > 0) {
      healthBarFill.classList.add('medium');
    } else {
      healthBarFill.classList.add('low');
    }
  }

  if (pet.status === 'dead') {
    petImage.src = 'assets/pet_dead.png';
    if (reviveBtn) reviveBtn.style.display = 'inline-block';
  } else if (pet.status === 'sad') {
    petImage.src = 'assets/pet_sad.png';
    if (reviveBtn) reviveBtn.style.display = 'none';
  } else {
    petImage.src = 'assets/happy_pet.jpg';
    if (reviveBtn) reviveBtn.style.display = 'none';
  }
}

if (reviveBtn) {
  reviveBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'revivePet' }, () => {
      chrome.storage.local.get('pet', (data) => updatePetUI(data.pet));
    });
  });
}

// Listen for storage changes to update live
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pet && changes.pet.newValue) {
    updatePetUI(changes.pet.newValue);
  }
  if (area === 'local' && changes.session) {
    loadState();
  }
});