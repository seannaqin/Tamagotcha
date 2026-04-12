let timeRemaining = 300;
let timerInterval = null;

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const setBtn = document.getElementById('setBtn');
const timerDisplay = document.getElementById('timerDisplay');
const customTimeInput = document.getElementById('customTime');

startBtn.addEventListener('click', () => {
  if (!timerInterval) {
    timerInterval = setInterval(tick, 1000);
    updateButtonStates();
  }
});

pauseBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval = null;
  updateButtonStates();
});

resetBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval = null;
  timeRemaining = 300;
  updateDisplay();
  updateButtonStates();
});

setBtn.addEventListener('click', () => {
  const mins = parseInt(customTimeInput.value);
  if (mins > 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    timeRemaining = mins * 60;
    updateDisplay();
    updateButtonStates();
  }
});

function tick() {
  timeRemaining--;
  updateDisplay();

  if (timeRemaining <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    updateButtonStates();
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Timer Complete',
      message: 'Your timer has finished!'
    });
  }
}

function updateDisplay() {
  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  timerDisplay.textContent =
    `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateButtonStates() {
  // Enable Start only if timer is NOT running
  startBtn.disabled = timerInterval !== null;

  // Enable Pause only if timer IS running
  pauseBtn.disabled = timerInterval === null;
}

// Initialize button states on load
updateButtonStates();

const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const signedInDiv = document.getElementById('signedIn');
const signedOutDiv = document.getElementById('signedOut');
const userName = document.getElementById('userName');

signInBtn.addEventListener('click', () => {
  chrome.identity.getAuthToken({ interactive: true }, async (token) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }

    const response = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const user = await response.json();
    userName.textContent = `Signed in as ${user.name}`;
    signedOutDiv.style.display = 'none';
    signedInDiv.style.display = 'block';

    // Store user info for later use
    chrome.storage.local.set({ user });
  });
});

signOutBtn.addEventListener('click', () => {
  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    if (token) {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        chrome.storage.local.remove('user');
        signedInDiv.style.display = 'none';
        signedOutDiv.style.display = 'block';
      });
    }
  });
});

// Check if already signed in on load
chrome.storage.local.get('user', (data) => {
  if (data.user) {
    userName.textContent = `Signed in as ${data.user.name}`;
    signedOutDiv.style.display = 'none';
    signedInDiv.style.display = 'block';
  }
});