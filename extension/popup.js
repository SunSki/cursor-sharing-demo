const enabledEl = document.getElementById('enabled');
const nameEl = document.getElementById('userName');

// Load current settings.
chrome.storage.sync.get(['enabled', 'userName'], (cfg) => {
  enabledEl.checked = cfg.enabled !== false; // default on
  nameEl.value = cfg.userName || '';
});

enabledEl.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: enabledEl.checked });
});

let nameTimer = null;
nameEl.addEventListener('input', () => {
  clearTimeout(nameTimer);
  nameTimer = setTimeout(() => {
    chrome.storage.sync.set({ userName: nameEl.value.trim() });
  }, 300);
});
