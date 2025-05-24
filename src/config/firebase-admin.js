import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const initializeFirebase = () => {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
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

            const db = getDatabase(app);
            db.goOnline(); // Mantener conexión activa
            
            console.log('✅ Firebase Admin inicializado correctamente');
            return db;
        }
        throw new Error("FIREBASE_SERVICE_ACCOUNT no configurado");
    } catch (error) {
        console.error('❌ Error al inicializar Firebase Admin:', error);
        throw error;
    }
};

export const db = initializeFirebase();