// src/config/firebase-admin.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const initializeFirebase = () => {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not defined');
    }

    // 1. Parsear el JSON config
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // 2. Corregir formato de la clave privada (CRUCIAL)
    serviceAccount.private_key = serviceAccount.private_key
      .replace(/\\n/g, '\n')          // Convertir \\n a saltos reales
      .replace(/\\\\/g, '\\')         // Manejar barras escapadas
      .replace(/"/g, '');             // Eliminar comillas sobrantes

    // 3. Inicializar Firebase
    const app = initializeApp({
      credential: cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });

    const db = getDatabase(app);
    console.log('✅ Firebase initialized successfully');
    return db;
    
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error);
    throw error;
  }
};

const db = initializeFirebase();
export { db };