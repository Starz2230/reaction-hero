import { db, scoresRef } from "./firebase-config.js";
import { addDoc, query, orderBy, limit, getDocs } from
        "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const screen       = document.getElementById('screen');
const resultP      = document.getElementById('result');
const localBoardEl = document.getElementById('localBoard');
const globalBoardEl= document.getElementById('globalBoard');
const nameModal    = document.getElementById('nameModal');
const nameForm     = document.getElementById('nameForm');
const playerInput  = document.getElementById('playerName');

let startTime;

// ---------- Name setup ----------
nameForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = (playerInput.value.trim() || "Anonymous");
  localStorage.setItem('playerName', name);
  localStorage.setItem('playerNameShown', '1');
  nameModal.close();
  startRound();
});
if (localStorage.getItem('playerName')) { nameModal.close(); }

// ---------- Game logic ----------
function startRound() {
  screen.className = 'wait';
  screen.textContent = 'Wait…';
  resultP.textContent = '';
  const delay = 1000 + Math.random() * 3000;
  setTimeout(() => {
    screen.className = 'go';
    screen.textContent = 'Tap NOW!';
    startTime = performance.now();
  }, delay);
}

screen.addEventListener('click', () => {
  if (screen.className !== 'go') return;      // too early
  const time = Math.floor(performance.now() - startTime);
  resultP.textContent = `${time} ms`;
  saveLocalScore(time);
  maybeSendToCloud(time);
  showLocalBoard();
  setTimeout(startRound, 1500);
});

startRound();
showLocalBoard();
loadGlobalBoard();

// ---------- Local storage ----------
function saveLocalScore(time) {
  const list = JSON.parse(localStorage.getItem('scores') || '[]');
  list.push(time);
  list.sort((a, b) => a - b);
  localStorage.setItem('scores', JSON.stringify(list.slice(0, 5)));
}
function showLocalBoard() {
  const list = JSON.parse(localStorage.getItem('scores') || '[]');
  localBoardEl.innerHTML = list.map(t => `<li>${t} ms</li>`).join('');
}

// ---------- Cloud ----------
async function maybeSendToCloud(time) {
  if (!navigator.onLine) return queueOffline(time);
  try {
    await addDoc(scoresRef, {
      name: localStorage.getItem('playerName') || "Anonymous",
      time,
      ts:   Date.now()
    });
    loadGlobalBoard();              // refresh after submit
    flushOfflineQueue();            // in case older scores waited
  } catch (err) { queueOffline(time); }
}

// queue scores while offline
function queueOffline(time) {
  const q = JSON.parse(localStorage.getItem('queued') || '[]');
  q.push(time);
  localStorage.setItem('queued', JSON.stringify(q));
}
async function flushOfflineQueue() {
  const q = JSON.parse(localStorage.getItem('queued') || '[]');
  if (!q.length || !navigator.onLine) return;
  for (const t of q) await maybeSendToCloud(t);
  localStorage.removeItem('queued');
}

async function loadGlobalBoard() {
  try {
    const q = query(scoresRef, orderBy('time'), limit(10));
    const snap = await getDocs(q);
    globalBoardEl.innerHTML =
      snap.docs.map(doc => {
        const d = doc.data();
        return `<li>${d.name}: <strong>${d.time} ms</strong></li>`;
      }).join('');
  } catch {
    globalBoardEl.innerHTML = '<li>Could not load leaderboard.</li>';
  }
}

window.addEventListener('online',  flushOfflineQueue);
