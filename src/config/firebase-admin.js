import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config(); // Asegúrate de cargar las variables locales si estás en dev

// 👇 Parsear JSON de la variable de entorno
let serviceAccount;
try {
  serviceAccount = process.env.SERVICE_ACCOUNT

  // Arregla el formato del private_key
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
} catch (err) {
  throw new Error('❌ No se pudo parsear SERVICE_ACCOUNT: ' + err.message);
}

// Verificar campos esenciales
const requiredFields = ['project_id', 'private_key', 'client_email'];
const missingFields = requiredFields.filter(field => !serviceAccount[field]);

if (missingFields.length > 0) {
  throw new Error(`Faltan campos esenciales: ${missingFields.join(', ')}`);
}

// Inicialización
let app;
if (!admin.apps.length) {
  app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://qfinder-comunity-default-rtdb.firebaseio.com"
  });
  console.log('✅ Firebase Admin inicializado correctamente');
}

// Exportar servicios
export const auth = getAuth(app);
export const db = getDatabase(app);
