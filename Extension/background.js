// background.js

const DEFAULT_STATE = {
  pet: {
    health: 100,
    status: "happy", // happy, sad, dead
    birthDate: Date.now(),
    lifespan: 0,
    accessories: []
  },
  timers: {
    work: 25, // minutes
    break: 5,
  },
  session: {
    isActive: false,
    type: "none", // "work" or "break"
    startTime: 0,
    endTime: 0,
    violations: 0, // Number of times banned sites visited during current session
    totalWorkMinutes: 0
  },
  settings: {
    bannedSites: ["facebook.com", "instagram.com", "twitter.com", "reddit.com", "tiktok.com", "youtube.com", "clashroyale.com"]
  },
  stats: {
    petsKilled: 0,
    longestLifespan: 0,
    hoursStudied: 0
  },
  lastActive: Date.now()
};

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(null, (result) => {
    if (Object.keys(result).length === 0) {
      chrome.storage.local.set(DEFAULT_STATE);
    }
  });
});

// Update last active time to prevent week-long death
chrome.runtime.onStartup.addListener(() => {
  updateLastActive();
  checkDeathByInactivity();
});

// Listen for messages from popup/options to start/stop timers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startTimer") {
    startTimer(request.type, request.duration);
    sendResponse({ success: true });
  } else if (request.action === "stopTimer") {
    stopTimer(true);
    sendResponse({ success: true });
  } else if (request.action === "getState") {
    chrome.storage.local.get(null, (state) => sendResponse(state));
    return true; // async response
  }
});

// Alarm listener for timers and minute-by-minute checks
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "timerEnd") {
    handleTimerEnd();
  } else if (alarm.name === "minuteTick") {
    checkActiveTab();
  }
});

function startTimer(type, durationMins) {
  chrome.storage.local.get(["session"], (data) => {
    const now = Date.now();
    const endTime = now + durationMins * 60 * 1000;

    // Create alarms
    chrome.alarms.create("timerEnd", { when: endTime });
    chrome.alarms.create("minuteTick", { periodInMinutes: 1 });

    const newSession = {
      isActive: true,
      type: type,
      startTime: now,
      endTime: endTime,
      violations: 0,
      totalWorkMinutes: type === "work" ? durationMins : 0
    };

    chrome.storage.local.set({ session: newSession }, () => {
      updateLastActive();
    });
  });
}

function stopTimer(manual = false) {
  chrome.alarms.clear("timerEnd");
  chrome.alarms.clear("minuteTick");

  chrome.storage.local.get(["session", "pet", "stats"], (data) => {
    if (!data.session.isActive) return;

    let newPet = { ...data.pet };
    let newStats = { ...data.stats };

    // Apply rewards if it was a work timer and finished naturally or mostly finished
    if (data.session.type === "work") {
      const minutesLived = (Date.now() - data.session.startTime) / 60000;

      if (!manual || minutesLived > 5) { // Reward some even if stopped manually after 5 mins
        newStats.hoursStudied += (minutesLived / 60);

        // Reward: log(minutes + 1) * multiplier. 
        // We want reward to be smaller than punishment
        let healthGain = Math.log(minutesLived + 1) * 2;

        // Exponential punishment relative to violations
        let healthLoss = 0;
        if (data.session.violations > 0) {
          healthLoss = Math.pow(1.5, data.session.violations) * 5;
        }

        newPet.health = Math.min(100, Math.max(0, newPet.health + healthGain - healthLoss));
      }
    }

    updatePetStatus(newPet, newStats);

    const newSession = {
      isActive: false,
      type: "none",
      startTime: 0,
      endTime: 0,
      violations: 0,
      totalWorkMinutes: 0
    };

    chrome.storage.local.set({ session: newSession, pet: newPet, stats: newStats });
  });
}

function handleTimerEnd() {
  stopTimer(false);
  // Optional: show Chrome notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "assets/icon.png",
    title: "Timer Finished!",
    message: "Check your pet to see how it's doing."
  });
}

function checkTabUrl(tabId, url) {
  if (!url) return;
  chrome.storage.local.get(["session", "settings", "pet", "stats"], (data) => {
    if (!data.session.isActive || data.session.type !== "work") return;
    if (data.pet.status === "dead") return;

    try {
      const hostname = new URL(url).hostname;
      const isBanned = data.settings.bannedSites.some(site => hostname.includes(site));

      if (isBanned) {
        // Redirection to the extension's dashboard to block the banned site
        chrome.tabs.update(tabId, { url: chrome.runtime.getURL("options.html") });

        // Health logic
        const newViolations = data.session.violations + 1;
        const immediateDrain = 2 * newViolations; // drains faster the more they stay

        let newPet = { ...data.pet };
        newPet.health = Math.max(0, newPet.health - immediateDrain);

        let newStats = { ...data.stats };
        const updatedState = updatePetStatus(newPet, newStats, false);

        chrome.storage.local.set({
          session: { ...data.session, violations: newViolations },
          pet: updatedState.pet,
          stats: updatedState.stats
        });
      }
    } catch (e) {
      // Parsing error (e.g. chrome:// urls)
    }
  });
}

function checkActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    checkTabUrl(tabs[0].id, tabs[0].url);
  });
}

// Track URL changes to catch them the moment they navigate
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    checkTabUrl(tabId, changeInfo.url);
  }
});

function updatePetStatus(pet, stats, save = false) {
  let oldStatus = pet.status;

  if (pet.health <= 0) {
    pet.status = "dead";
    pet.health = 0;
    if (oldStatus !== "dead") {
      stats.petsKilled += 1;
      // Record lifespan
      const lifespanDays = Math.floor((Date.now() - pet.birthDate) / (1000 * 60 * 60 * 24));
      if (lifespanDays > stats.longestLifespan) {
        stats.longestLifespan = lifespanDays;
      }
    }
  } else if (pet.health <= 50) {
    pet.status = "sad";
  } else {
    pet.status = "happy";
  }

  if (save) {
    chrome.storage.local.set({ pet, stats });
  }

  return { pet, stats };
}

function updateLastActive() {
  chrome.storage.local.set({ lastActive: Date.now() });
}

function checkDeathByInactivity() {
  chrome.storage.local.get(["lastActive", "pet", "stats"], (data) => {
    if (data.pet.status === "dead") return;

    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.lastActive > oneWeek) {
      let newPet = { ...data.pet };
      newPet.health = 0;
      let newStats = { ...data.stats };
      const updated = updatePetStatus(newPet, newStats, false);
      chrome.storage.local.set({ pet: updated.pet, stats: updated.stats });
    }
  });
}
