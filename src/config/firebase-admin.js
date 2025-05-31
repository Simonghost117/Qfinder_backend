import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import admin from 'firebase-admin';
// import dotenv from 'dotenv';
// dotenv.config();

// Configuración desde variables de entorno
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Reemplaza los \n por saltos de línea reales
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  databaseURL: process.env.FIREBASE_DATABASE_URL,

};

// Verificación de campos obligatorios
const requiredFields = ['project_id', 'private_key', 'client_email'];
const missingFields = requiredFields.filter(field => !serviceAccount[field]);

if (missingFields.length > 0) {
  throw new Error(`Faltan campos esenciales en la configuración de Firebase: ${missingFields.join(', ')}`);
}
const databaseURL = "https://qfinder-comunity-default-rtdb.firebaseio.com/"
// Inicialización de Firebase
const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: databaseURL 
});

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://qfinder-community-default-rtdb.firebaseio.com"
  });
}

// Exporta los servicios
export const auth = admin.auth();
export const db = getDatabase(app);
export const messaging = admin.messaging();
console.log('✅ Firebase Admin inicializado correctamente');