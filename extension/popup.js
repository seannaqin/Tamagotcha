// popup.js
// This script runs when the user opens the popup (clicks the extension icon).
// It handles the UI: showing the blocked sites list, adding, and removing sites.

// Wait for the HTML to fully load before we try to access any elements
document.addEventListener("DOMContentLoaded", async () => {

  // Grab references to the HTML elements we'll be working with
  const input     = document.getElementById("site-input");
  const addBtn    = document.getElementById("add-btn");
  const siteList  = document.getElementById("site-list");
  const emptyMsg  = document.getElementById("empty-msg");

  // STEP 1: Load the current blocked sites from Chrome's storage and render them
  // chrome.storage.sync saves data tied to the user's Google account,
  // so blocked sites persist across devices. The { blockedSites: [] } is a
  // default — if nothing is saved yet, we get back an empty array.
  const { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  renderList(blockedSites);

  // STEP 2: Handle the "Add" button click
  addBtn.addEventListener("click", async () => {
    // Normalize the input so "https://youtube.com/" and "youtube.com" both become "youtube.com"
    // .replace strips "https://", "http://", and any trailing slashes
    const site = input.value.trim().toLowerCase()
      .replace(/^https?:\/\//, "")   // remove protocol
      .replace(/\/+$/, "");          // remove trailing slashes

    // Basic validation — don't add empty strings
    if (!site) return;

    // Load the current list fresh from storage before modifying it
    const { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });

    // Don't add duplicates
    if (blockedSites.includes(site)) {
      input.value = "";
      return;
    }

    // Add the new site to the list
    const updated = [...blockedSites, site];

    // Save the updated list back to storage
    await chrome.storage.sync.set({ blockedSites: updated });

    // Tell the service worker to rebuild its blocking rules with the new list
    await notifyServiceWorker(updated);

    // Clear the input and re-render the list in the popup
    input.value = "";
    renderList(updated);
  });

  // Also let the user press Enter to add a site instead of clicking the button
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addBtn.click();
  });
  // FUNCTION: renderList
  // Clears and redraws the <ul> list of blocked sites in the popup.
  function renderList(sites) {
    // Clear whatever is currently in the list
    siteList.innerHTML = "";

    // Show or hide the "No sites blocked yet" message
    emptyMsg.style.display = sites.length === 0 ? "block" : "none";

    // Create one <li> for each blocked site
    sites.forEach(site => {
      const li = document.createElement("li");

      // The site name as text
      const span = document.createElement("span");
      span.textContent = site;

      // A remove button (×) on the right
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "×";
      removeBtn.title = "Remove";

      // When the remove button is clicked, remove this site
      removeBtn.addEventListener("click", async () => {
        const { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });

        // Filter out the site we want to remove
        const updated = blockedSites.filter(s => s !== site);

        // Save and sync
        await chrome.storage.sync.set({ blockedSites: updated });
        await notifyServiceWorker(updated);
        renderList(updated);
      });

      li.appendChild(span);
      li.appendChild(removeBtn);
      siteList.appendChild(li);
    });
  }
  // FUNCTION: notifyServiceWorker
  // Sends a message to service_worker.js with the updated list.
  // The service worker is the one that actually changes the Chrome blocking rules.
  async function notifyServiceWorker(sites) {
    // chrome.runtime.sendMessage sends a message to the background service worker
    await chrome.runtime.sendMessage({
      type: "UPDATE_BLOCKED_SITES",
      sites: sites
    });
  }

});
