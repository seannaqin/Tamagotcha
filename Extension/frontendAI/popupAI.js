let updateInterval;

document.addEventListener("DOMContentLoaded", () => {
  loadStateAndRender();

  document.getElementById("start-work-btn").addEventListener("click", () => {
    chrome.storage.local.get(["timers"], (res) => {
      chrome.runtime.sendMessage({ action: "startTimer", type: "work", duration: res.timers.work });
    });
  });

  document.getElementById("start-break-btn").addEventListener("click", () => {
    chrome.storage.local.get(["timers"], (res) => {
      chrome.runtime.sendMessage({ action: "startTimer", type: "break", duration: res.timers.break });
    });
  });

  document.getElementById("stop-timer-btn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stopTimer" });
  });

  document.getElementById("options-btn").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // Listen for storage changes from background script
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      loadStateAndRender();
    }
  });
});

function loadStateAndRender() {
  chrome.storage.local.get(null, (state) => {
    if (!state || !state.pet) return;
    updatePetUI(state.pet);
    updateTimerUI(state.session, state.timers);
  });
}

function updatePetUI(pet) {
  const healthBar = document.getElementById("health-bar");
  const healthValue = document.getElementById("health-value");
  const petImage = document.getElementById("pet-image");
  const statusBadge = document.getElementById("status-indicator");

  const h = Math.round(pet.health);
  healthBar.style.width = Math.min(100, Math.max(0, h)) + "%";
  healthValue.textContent = Math.min(100, Math.max(0, h));

  if (h > 50) {
    healthBar.style.backgroundColor = "var(--health-good)";
  } else if (h > 20) {
    healthBar.style.backgroundColor = "var(--health-ok)";
  } else {
    healthBar.style.backgroundColor = "var(--health-bad)";
  }

  statusBadge.textContent = pet.status.charAt(0).toUpperCase() + pet.status.slice(1);

  if (pet.status === "happy") {
    petImage.src = "assets/pet_healthy.png";
    statusBadge.style.color = "var(--health-good)";
  } else if (pet.status === "sad") {
    petImage.src = "assets/pet_sad.png";
    statusBadge.style.color = "var(--health-ok)";
  } else if (pet.status === "dead") {
    petImage.src = "assets/pet_dead.png";
    statusBadge.style.color = "var(--health-bad)";
  }
}

function updateTimerUI(session, timers) {
  clearInterval(updateInterval);

  const controlsIdle = document.getElementById("controls-idle");
  const controlsActive = document.getElementById("controls-active");
  const sessionInfo = document.getElementById("session-info");
  const timerDisplay = document.getElementById("timer-display");

  if (session && session.isActive) {
    controlsIdle.classList.add("hidden");
    controlsActive.classList.remove("hidden");

    if (session.type === "work") {
      sessionInfo.textContent = "Focus Session Active";
      sessionInfo.style.color = "var(--primary-color)";
    } else {
      sessionInfo.textContent = "Break Session Active";
      sessionInfo.style.color = "var(--secondary-color)";
    }

    updateInterval = setInterval(() => tickTimer(session.endTime), 1000);
    tickTimer(session.endTime);
  } else {
    controlsIdle.classList.remove("hidden");
    controlsActive.classList.add("hidden");
    sessionInfo.textContent = "Ready to work?";
    sessionInfo.style.color = "var(--text-secondary)";

    // Default display shows the work timer length
    timerDisplay.textContent = formatTime(timers.work * 60);
  }
}

function tickTimer(endTime) {
  const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
  document.getElementById("timer-display").textContent = formatTime(remaining);

  if (remaining <= 0) {
    clearInterval(updateInterval);
    document.getElementById("timer-display").textContent = "00:00";
  }
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
