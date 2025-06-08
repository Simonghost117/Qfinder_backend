import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import './config/firebase-admin.js'; 
// server.js (corrección)
import sequelize, { testConnection, syncModels } from './config/db.js';
import { models } from "./models/index.js";
import { createSubscriptionPlanInternal } from './controllers/paymentController.js';
import { PLANS_MERCADOPAGO } from './config/subscriptions.js';
import './config/db.js';
// import './cron/notificador.js';

// 1. Configuración de entorno (carga .env antes que cualquier otra dependencia)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 2. Validación de variables críticas
const requiredEnvVars = ['NODE_ENV', 'DB_HOST', 'DB_USER', 'DB_PASSWORD'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Faltó la variable de entorno: ${varName}`);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 3000;

// 3. Configuración explícita de SSL para Supabase
const dbConfig = {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Solo para desarrollo, en producción usa un certificado válido
    }
  }
};

const server = http.createServer(app);

const startServer = async () => {
  try {
    // 4. Verificación de conexión
    console.log("🔌 Intentando conectar a la base de datos...");
    const isConnected = await testConnection();
    if (!isConnected) throw new Error('Conexión fallida');

    console.log('✅ Conexión a la base de datos establecida');
    console.log("⏰ Sistema de notificaciones iniciado.");

    // 5. Sincronización segura por entorno
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync();
      console.log("🛠 Base de datos sincronizada (modo desarrollo)");
    } else {
      // En producción, usa migraciones en lugar de sync()
      console.log("🚀 Modo producción: Usar migraciones en lugar de sync()");
    }
// Crear planes al iniciar el servidor
async function initializePlans() {
  try {
    console.log("Inicializando planes de suscripción...");
    for (const planType in PLANS_MERCADOPAGO) {
      if (!PLANS_MERCADOPAGO[planType].id) {
        await createSubscriptionPlanInternal(planType);
      }
    }
    console.log("Planes de suscripción inicializados correctamente");
  } catch (error) {
    console.error("Error inicializando planes:", error);
  }
}

// Llamar después de conectar a la base de datos
initializePlans();
    // 6. Inicio del servidor
    server.listen(PORT, () => {
      console.log(`Entorno: ${process.env.NODE_ENV}`);
    });

    // 7. Manejo de cierre
    process.on('SIGTERM', () => {
      server.close(() => {
        console.log('🛑 Servidor cerrado');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error crítico:', error.message);
    process.exit(1);
  }
};

startServer();