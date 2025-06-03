import { db, scoresRef } from "./firebase-config.js";
import {
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const screen = document.getElementById("screen");
const resultP = document.getElementById("result");
const localBoardEl = document.getElementById("localBoard");
const globalBoardEl = document.getElementById("globalBoard");
const globalSection = document.getElementById("globalSection");

// Modal-Elemente
const nameModal = document.getElementById("nameModal");
const nameForm = document.getElementById("nameForm");
const playerInput = document.getElementById("playerName");

let startTime;

// ─── 1) Namens-Modal initial anzeigen oder Spiel direkt starten ───
window.addEventListener("load", () => {
  const storedName = localStorage.getItem("playerName");
  if (storedName) {
    // Wenn bereits ein Name gesetzt ist, Modal schließen und direkt Spiel starten
    nameModal.close();
    startRound();
    showLocalBoard();
    // Globale Rangliste wird erst nach dem ersten Spiel geladen, daher hier nicht aufrufen
  } else {
    // Kein Name vorhanden → Modal aufklappen
    nameModal.showModal();
  }
});

// ─── 2) Wenn der Nutzer im Modal auf „Start Game“ klickt ───
nameForm.addEventListener("submit", (e) => {
  e.preventDefault();
  // Name aus dem Feld oder "Anonymous" verwenden
  const name = playerInput.value.trim() || "Anonymous";
  localStorage.setItem("playerName", name);
  localStorage.setItem("playerNameShown", "1");
  nameModal.close();
  // Nach Schließen des Modals Spiel starten + lokale Rangliste anzeigen
  startRound();
  showLocalBoard();
});

// ─── 3) Spiel-Logik ───
function startRound() {
  // Button wieder in Warte-Zustand versetzen
  screen.className = "screen wait";
  screen.textContent = "Wait…";
  resultP.textContent = "";
  // Zufällige Wartezeit zwischen 1 und 4 Sekunden
  const delay = 1000 + Math.random() * 3000;
  setTimeout(() => {
    screen.className = "screen go";
    screen.textContent = "Tap NOW!";
    startTime = performance.now();
  }, delay);
}

// Wenn der Nutzer auf den Button tippt
screen.addEventListener("click", () => {
  if (screen.className !== "screen go") {
    // Hat zu früh geklickt (noch im "wait" Zustand) → ignorieren
    return;
  }
  const time = Math.floor(performance.now() - startTime);
  resultP.textContent = `${time} ms`;

  // 1) In lokale Best-5 aufnehmen
  saveLocalScore(time);
  showLocalBoard();

  // 2) Versuch, in die Cloud zu senden (wenn online)
  maybeSendToCloud(time);

  // 3) Global-Bereich sichtbar machen (falls noch versteckt)
  if (globalSection.style.display === "none") {
    globalSection.style.display = "block";
    // Nach dem Sichtbarmachen direkt aktuelle globale Rangliste laden
    loadGlobalBoard();
  }

  // Nächste Runde nach 1,5 Sekunden erneut starten
  setTimeout(startRound, 1500);
});

// ─── 4) Lokale Rangliste verwalten ───
function saveLocalScore(time) {
  const list = JSON.parse(localStorage.getItem("scores") || "[]");
  list.push(time);
  list.sort((a, b) => a - b);
  localStorage.setItem("scores", JSON.stringify(list.slice(0, 5)));
}

function showLocalBoard() {
  const list = JSON.parse(localStorage.getItem("scores") || "[]");
  localBoardEl.innerHTML = list
    .map((t) => `<li>${t} ms</li>`)
    .join("");
}

// ─── 5) Cloud-Funktion: Nur senden, wenn online ───
async function maybeSendToCloud(time) {
  if (!navigator.onLine) {
    // Versteckter Puffer für offline gespeicherte Zeiten
    queueOffline(time);
    return;
  }
  try {
    await addDoc(scoresRef, {
      name: localStorage.getItem("playerName") || "Anonymous",
      time,
      ts: Date.now(),
    });
    // Wenn erfolgreich gesendet, lade globale Rangliste neu
    loadGlobalBoard();
    // Versuche, gepufferte Offline-Scores ebenfalls zu senden
    flushOfflineQueue();
  } catch {
    // Bei Netzwerkfehlern in Cloud zwischenspeichern
    queueOffline(time);
  }
}

// Offline-Werte zwischenspeichern
function queueOffline(time) {
  const q = JSON.parse(localStorage.getItem("queued") || "[]");
  q.push(time);
  localStorage.setItem("queued", JSON.stringify(q));
}

// Offline-Cache an Cloud nachträglich senden
async function flushOfflineQueue() {
  const q = JSON.parse(localStorage.getItem("queued") || "[]");
  if (!q.length || !navigator.onLine) return;
  // Schleife über alle gepufferten Zeiten
  for (const t of q) {
    await maybeSendToCloud(t);
  }
  localStorage.removeItem("queued");
}

// ─── 6) Globale Rangliste vom Firestore holen ───
async function loadGlobalBoard() {
  try {
    const q = query(scoresRef, orderBy("time"), limit(10));
    const snap = await getDocs(q);
    globalBoardEl.innerHTML = snap.docs
      .map((doc) => {
        const d = doc.data();
        return `<li>${d.name}: <strong>${d.time} ms</strong></li>`;
      })
      .join("");
  } catch {
    globalBoardEl.innerHTML = "<li>Could not load leaderboard.</li>";
  }
}

// Wenn das Gerät wieder online ist, versuche, Offline-Werte zu senden
window.addEventListener("online", flushOfflineQueue);
