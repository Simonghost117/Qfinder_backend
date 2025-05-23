import { initializeApp, cert, getAuth, getDatabase } from 'firebase-admin/app';
import { readFileSync } from 'fs';

const initializeFirebase = () => {
  try {
    // Configuración desde variables de entorno
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    // Corrección de formato de la clave privada
    serviceAccount.private_key = serviceAccount.private_key
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\')
      .replace(/"/g, '');

    // Inicialización de Firebase Admin
    const app = initializeApp({
      credential: cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });

    console.log('✅ Firebase Admin inicializado correctamente');
    return {
      auth: getAuth(app),
      db: getDatabase(app)
    };
  } catch (error) {
    console.error('❌ Error al inicializar Firebase Admin:', error);
    throw error;
  }
};

const { auth, db } = initializeFirebase();
export { auth, db };