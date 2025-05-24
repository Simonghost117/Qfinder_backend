import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

let authInstance = null;
let dbInstance = null;

const initializeFirebase = () => {
  try {
    if (!authInstance || !dbInstance) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      // Corrección de formato de la clave privada
      serviceAccount.private_key = serviceAccount.private_key
        .replace(/\\n/g, '\n')
        .replace(/\\\\/g, '\\');

      const app = getApps().length === 0 ? 
        initializeApp({
          credential: cert(serviceAccount),
          databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
        }) : 
        getApp();

      authInstance = getAuth(app);
      dbInstance = getDatabase(app);
      dbInstance.goOnline();
      
      console.log('✅ Firebase Admin inicializado correctamente');
    }
    return { auth: authInstance, db: dbInstance };
  } catch (error) {
    console.error('❌ Error al inicializar Firebase Admin:', error);
    throw error;
  }
};

// Inicializa e importa las instancias
const { auth, db } = initializeFirebase();
export { auth, db };  // Exporta ambos objetos