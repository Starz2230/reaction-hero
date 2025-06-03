import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore,
         collection, addDoc,
         query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef",
};

export const app       = initializeApp(firebaseConfig);
export const db        = getFirestore(app);
export const scoresRef = collection(db, "scores");
