import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

// Configuración optimizada para Firebase Admin
const initializeFirebase = () => {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    // Corrección de formato de la clave privada
    serviceAccount.private_key = serviceAccount.private_key
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\')
      .replace(/"/g, '');

    // Configuración con manejo de conexiones
    const app = initializeApp({
      credential: cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      databaseAuthVariableOverride: {
        uid: 'backend-server',
        backendAuth: true
      }
    });

    console.log('✅ Firebase Admin inicializado correctamente');
    
    const db = getDatabase(app);
    db.goOnline(); // Asegurar que la conexión esté activa
    
    return { db };
  } catch (error) {
    console.error('❌ Error al inicializar Firebase Admin:', error);
    throw error;
  }
};

const { db } = initializeFirebase();
export { db };
const { auth } = initializeFirebase();
export { auth };