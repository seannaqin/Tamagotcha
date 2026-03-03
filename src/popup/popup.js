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