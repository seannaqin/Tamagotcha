let totalTime = 300;
let timeRemaining = totalTime;
let timerInterval = null;
let maxTimerInput = 1440; // 1 day in minutes
let isEditing = false;

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const timerDisplay = document.getElementById('timerDisplay');

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
  timeRemaining = totalTime;
  updateDisplay();
  updateButtonStates();
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
  const hours = Math.floor(timeRemaining / 3600);
  const mins = Math.floor((timeRemaining % 3600) / 60);
  const secs = timeRemaining % 60;
  if (hours > 0) {
    timerDisplay.textContent = 
      `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    timerDisplay.textContent = 
      `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

function updateButtonStates() {
  // Enable Start only if timer is NOT running
  startBtn.disabled = timerInterval !== null;

  // Enable Pause only if timer IS running
  pauseBtn.disabled = timerInterval === null;
}

// Initialize button states on load
updateButtonStates();

timerDisplay.addEventListener('click', () => {
  // Don't edit if timer is running
  if (isEditing || timerInterval !== null) return;
  isEditing = true;

  const input = document.createElement('input');
  input.type = 'text'; // Use text to control formatting
  input.value = '000000'; // Initial internal state
  input.classList.add('timer-input');
  
  // Create a visual display wrapper for the input
  timerDisplay.innerHTML = '';
  timerDisplay.appendChild(input);
  input.focus();

  // Function to format the string 000530 into 00:05:30
  const formatInput = (val) => {
    const padded = val.padStart(6, '0').slice(-6);
    const h = padded.slice(0, 2);
    const m = padded.slice(2, 4);
    const s = padded.slice(4, 6);
    return `${h}:${m}:${s}`;
  };

  // Set initial visual
  input.value = formatInput('');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      // Logic to convert HHMMSS to total seconds
      const raw = input.value.replace(/:/g, '');
      const h = parseInt(raw.slice(0, 2)) || 0;
      const m = parseInt(raw.slice(2, 4)) || 0;
      const s = parseInt(raw.slice(4, 6)) || 0;
      
      const newTotal = (h * 3600) + (m * 60) + s;

      if (newTotal > 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        totalTime = newTotal;
        timeRemaining = totalTime;
        updateButtonStates();
      }
      revert();
    } else if (e.key === 'Escape') {
      revert();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const currentDigits = input.value.replace(/:/g, '');
      const newDigits = currentDigits.slice(0, -1);
      input.value = formatInput(newDigits);
    } else if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const currentDigits = input.value.replace(/:/g, '').replace(/^0+/, '');
      if (currentDigits.length < 6) {
        input.value = formatInput(currentDigits + e.key);
      }
    } else if (e.key.length === 1) {
      // Prevent non-numeric characters
      e.preventDefault();
    }
  });

  input.addEventListener('blur', () => {
    // Small timeout to allow Enter key logic to finish if blurred by Enter
    setTimeout(revert, 100);
  });

  function revert() {
    isEditing = false;
    updateDisplay();
  }
});

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