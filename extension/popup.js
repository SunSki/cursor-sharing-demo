const codeEl = document.getElementById('roomCode');
const nameEl = document.getElementById('userName');
const genEl = document.getElementById('gen');
const statusEl = document.getElementById('status');
const markerPicker = document.getElementById('markerPicker');

const MAX = 20;

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });
  codeEl.placeholder = chrome.i18n.getMessage('placeholderRoomCode');
  nameEl.placeholder = chrome.i18n.getMessage('placeholderUserName');
}

function updateStatus() {
  const code = codeEl.value.trim();
  if (code) {
    statusEl.className = 'status on';
    statusEl.textContent = chrome.i18n.getMessage('statusOn', code);
  } else {
    statusEl.className = 'status off';
    statusEl.textContent = chrome.i18n.getMessage('statusOff');
  }
}

function setActiveMarker(style) {
  markerPicker.querySelectorAll('.marker-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.style === style);
  });
}

applyI18n();

chrome.storage.sync.get(['roomCode', 'userName', 'markerStyle'], (cfg) => {
  codeEl.value = cfg.roomCode || '';
  nameEl.value = cfg.userName || '';
  setActiveMarker(cfg.markerStyle || 'dot');
  updateStatus();
});

function generateCode() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < buf.length; i++) {
    s += alphabet[buf[i] % alphabet.length];
    if (i === 3) s += '-';
  }
  return s;
}

let saveTimer = null;
function saveCode() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    chrome.storage.sync.set({ roomCode: codeEl.value.trim().slice(0, MAX) });
  }, 300);
}

codeEl.addEventListener('input', () => { updateStatus(); saveCode(); });

genEl.addEventListener('click', () => {
  codeEl.value = generateCode();
  updateStatus();
  chrome.storage.sync.set({ roomCode: codeEl.value });
});

markerPicker.addEventListener('click', (e) => {
  const btn = e.target.closest('.marker-btn');
  if (!btn) return;
  const style = btn.dataset.style;
  setActiveMarker(style);
  chrome.storage.sync.set({ markerStyle: style });
});

let nameTimer = null;
nameEl.addEventListener('input', () => {
  clearTimeout(nameTimer);
  nameTimer = setTimeout(() => {
    chrome.storage.sync.set({ userName: nameEl.value.trim().slice(0, MAX) });
  }, 300);
});
