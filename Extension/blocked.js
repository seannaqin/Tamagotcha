function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function update() {
  chrome.storage.local.get(['session', 'pet'], (data) => {
    const { session, pet } = data;

    if (pet) {
      if (pet.status === 'dead') {
        document.getElementById('petImg').src = 'assets/pet_dead.png';
      } else if (pet.status === 'sad') {
        document.getElementById('petImg').src = 'assets/pet_sad.png';
      }
    }

    if (!session || !session.isActive) {
      document.getElementById('countdown').textContent = '00:00';
      return;
    }

    const remaining = Math.max(0, Math.floor((session.endTime - Date.now()) / 1000));
    document.getElementById('countdown').textContent = formatTime(remaining);
  });
}

update();
setInterval(update, 1000);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.session) {
    update();
  }
});