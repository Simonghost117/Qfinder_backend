import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import './config/firebase-admin.js';
import sequelize, { testConnection } from './config/db.js';
import { configureMercadoPago } from './config/mercadopagoConfig.js';
import { initializePlans } from './controllers/paymentController.js';

// Configuración de entorno
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Validación de variables críticas
const requiredEnvVars = [
  'NODE_ENV', 
  'DB_HOST', 
  'DB_USER', 
  'DB_PASSWORD', 
  'MERCADOPAGO_ACCESS_TOKEN',
  'MERCADOPAGO_BACK_URL'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Variable de entorno faltante: ${varName}`);
    process.exit(1);
  }
});

// Configuración de la base de datos
const dbConfig = {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};

// Configurar MercadoPago
console.log("🔧 Configurando MercadoPago...");
if (!configureMercadoPago()) {
  console.error("❌ Configuración de MercadoPago fallida. Verifica:");
  console.error("- MERCADOPAGO_ACCESS_TOKEN en .env");
  console.error("- Permisos de la cuenta MercadoPago");
  process.exit(1);
}
console.log("✅ MercadoPago configurado correctamente");

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const startServer = async () => {
  try {
    console.log("\n🔌 Conectando a la base de datos...");
        mercadopago.configure({
      access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
      integrator_id: process.env.MERCADOPAGO_INTEGRATOR_ID || null
    });
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('❌ Conexión a la base de datos fallida');
    }
    console.log('✅ Conexión a la base de datos establecida');

    // Inicialización de planes
    console.log("\n⚙️ Inicializando planes de suscripción...");
    const plansInitialized = await initializePlans();
    if (!plansInitialized) {
      throw new Error('❌ Fallo al inicializar planes de suscripción');
    }
    console.log("✅ Planes de suscripción listos");

    // Sincronización de la base de datos
    if (process.env.NODE_ENV === 'development') {
      console.log("\n🛠 Sincronizando modelos de base de datos...");
      await sequelize.sync({ alter: true });
      console.log("✅ Base de datos sincronizada (modo desarrollo)");
    } else {
      console.log("\n🚀 Modo producción: Usar migraciones para cambios en la base de datos");
    }

    // Iniciar servidor
    server.listen(PORT, () => {
      console.log(`\n🚀 Servidor escuchando en http://localhost:${PORT}`);
      console.log("⏰ Sistema de notificaciones activo");
      console.log(`🔧 Entorno: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('\n❌ Error crítico al iniciar servidor:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Manejo de cierre limpio
process.on('SIGTERM', () => {
  console.log('\n🔻 Recibida señal SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🔻 Recibida señal SIGINT. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

startServer();