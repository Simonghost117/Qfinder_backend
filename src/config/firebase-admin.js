// firebase-admin.js
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

// Configuración directa (mejor que parsear desde env)
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

const initializeFirebase = () => {
  try {
    const app = getApps().length === 0 ? 
      initializeApp({
        credential: cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      }) : 
      getApp();

    const auth = getAuth(app);
    const db = getDatabase(app);
    
    // Prueba rápida en tu backend

async function testFirebaseConnection() {
  try {
    const ref = db.ref('.info/connected');
    ref.on('value', (snap) => {
      if (snap.val() === true) {
        console.log('✅ Conectado a Firebase');
      } else {
        console.log('❌ No conectado a Firebase');
      }
    });
  } catch (error) {
    console.error('Error de conexión:', error);
  }
}
testFirebaseConnection
    console.log('✅ Firebase Admin inicializado correctamente');
    return { auth, db };
  } catch (error) {
    console.error('❌ Error al inicializar Firebase Admin:', error);
    throw error;
  }
};

export const { auth, db } = initializeFirebase();