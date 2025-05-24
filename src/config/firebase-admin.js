// src/config/firebase-admin.js
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

const serviceAccount = {
  // ... tu configuración existente
};

// Inicialización corregida
const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://qfinder-comunity-default-rtdb.firebaseio.com/'
});

// Exporta los objetos correctamente
const auth = getAuth(app);
const db = getDatabase(app);

export { auth, db };  // <-- Exportación nombrada explícita