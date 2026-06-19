const codeEl = document.getElementById('roomCode');
const nameEl = document.getElementById('userName');
const genEl = document.getElementById('gen');
const statusEl = document.getElementById('status');

const MAX = 20;

function updateStatus() {
  const code = codeEl.value.trim();
  if (code) {
    statusEl.className = 'status on';
    statusEl.textContent = 'ON — ルーム「' + code + '」';
  } else {
    statusEl.className = 'status off';
    statusEl.textContent = 'OFF — ルームコード未設定';
  }
}

// Load current settings.
chrome.storage.sync.get(['roomCode', 'userName'], (cfg) => {
  codeEl.value = cfg.roomCode || '';
  nameEl.value = cfg.userName || '';
  updateStatus();
});

// Generate a readable random code (8 chars, no ambiguous letters).
function generateCode() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no i/l/o/0/1
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < buf.length; i++) {
    s += alphabet[buf[i] % alphabet.length];
    if (i === 3) s += '-';
  }
  return s; // e.g. "a3f9-k2m7"
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

let nameTimer = null;
nameEl.addEventListener('input', () => {
  clearTimeout(nameTimer);
  nameTimer = setTimeout(() => {
    chrome.storage.sync.set({ userName: nameEl.value.trim().slice(0, MAX) });
  }, 300);
});
