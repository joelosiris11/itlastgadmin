// ===================================================================
// CONFIGURACIÓN DE FIREBASE
// ===================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBCSghpdjS6UyqIjZrh8Lx3b0BdunMlDZs",
  authDomain: "itlastg25.firebaseapp.com",
  projectId: "itlastg25",
  storageBucket: "itlastg25.firebasestorage.app",
  messagingSenderId: "166443905167",
  appId: "1:166443905167:web:472ec92225a62ef45c80fa"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Exportar instancias
export { db, storage, firebaseConfig }; 