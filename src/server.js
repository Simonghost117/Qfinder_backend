import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import './config/firebase-admin.js';
import sequelize, { testConnection } from './config/db.js';
import { configureMercadoPago } from './config/mercadopagoConfig.js';
import { initializePlans } from './controllers/paymentController.js';

// 1. Configuración de entorno
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 2. Validación de variables críticas
const requiredEnvVars = ['NODE_ENV', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'MERCADOPAGO_ACCESS_TOKEN'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Faltó la variable de entorno: ${varName}`);
    process.exit(1);
  }
});

// 3. Configuración explícita de SSL para Supabase
const dbConfig = {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};

// 4. Configurar MercadoPago antes de cualquier otra cosa
if (!configureMercadoPago()) {
  console.error("❌ No se pudo configurar MercadoPago. Verifica el access token");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const startServer = async () => {
  try {
    // 5. Verificación de conexión a DB
    console.log("🔌 Intentando conectar a la base de datos...");
    const isConnected = await testConnection();
    if (!isConnected) throw new Error('Conexión fallida');
    console.log('✅ Conexión a la base de datos establecida');

    // 6. Inicializar planes de suscripción
    console.log("⚙️ Inicializando planes de suscripción...");
    await initializePlans();
    console.log("✅ Planes de suscripción inicializados correctamente");

    // 7. Sincronización segura por entorno
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync();
      console.log("🛠 Base de datos sincronizada (modo desarrollo)");
    } else {
      console.log("🚀 Modo producción: Usar migraciones en lugar de sync()");
    }

    // 8. Iniciar servidor
    server.listen(PORT, () => {
      console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
      console.log("⏰ Sistema de notificaciones iniciado.");
    });
  } catch (error) {
    console.error('❌ Error crítico al iniciar servidor:', error);
    process.exit(1);
  }
};

// Iniciar el servidor
startServer();