// service_worker.js
// This is the "background script" for the extension.
// It runs silently in the background even when the popup is closed.
// Its job is to manage the blocking rules that Chrome enforces.

// LISTENER: fires when the extension is first installed or updated
chrome.runtime.onInstalled.addListener(async () => {
  // On install, load any previously saved blocked sites from storage
  // and immediately apply them as blocking rules.
  const { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  await updateBlockingRules(blockedSites);
});
// LISTENER: listens for messages sent from popup.js
// When the user adds or removes a site in the popup, popup.js sends a message
// here so we can update the blocking rules.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_BLOCKED_SITES") {
    // message.sites is the full updated list of blocked sites
    updateBlockingRules(message.sites).then(() => {
      sendResponse({ success: true });
    });

    // Returning true tells Chrome we will call sendResponse asynchronously
    return true;
  }
});


// FUNCTION: updateBlockingRules
// Takes the full list of blocked sites and rebuilds all Chrome blocking rules.
async function updateBlockingRules(blockedSites) {
  // Step 1: Get the IDs of all currently active dynamic rules so we can remove them.
  // We always do a full rebuild (remove all, add all) to keep things simple.
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existingRules.map(rule => rule.id);

  // Step 2: Build a new rule for each blocked site.
  // Each rule is a plain object that tells Chrome what to block and how.
  const newRules = blockedSites.map((site, index) => ({
    id: index + 1,           // Rules need a unique numeric ID. We use the array index + 1.
    priority: 1,             // Priority matters when rules conflict. 1 is fine here.
    action: {
      type: "block"          // "block" tells Chrome to cancel the request entirely.
    },
    condition: {
      // Wrapping with * on both sides makes this an explicit wildcard substring match.
      // e.g. "*youtube.com*" matches "https://www.youtube.com/watch?v=..."
      // Without the wildcards, Chrome can be strict about the pattern format and silently skip it.
      urlFilter: `*${site}*`,
      resourceTypes: ["main_frame"]       // "main_frame" means top-level page navigations only.
                                          // This prevents blocking images/scripts on other sites
                                          // that happen to load from the blocked domain.
    }
  }));

  // Step 3: Apply the changes atomically — remove old rules and add new ones in one call.
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: newRules
  });
}
