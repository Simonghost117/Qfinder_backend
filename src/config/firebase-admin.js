import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

// Configuración CORRECTA del service account
const serviceAccount = {
  type: "service_account",
  project_id: "qfinder-comunity", // <-- DEBE coincidir con tu URL de Firebase
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: "firebase-adminsdk-xxxx@qfinder-comunity.iam.gserviceaccount.com",
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

// Verificación explícita de campos requeridos
if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
  throw new Error('❌ Configuración incompleta de Firebase Admin');
}

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://qfinder-comunity-default-rtdb.firebaseio.com/" // <-- Usa tu URL exacta
});

export const auth = getAuth(app);
export const db = getDatabase(app);