import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import './config/firebase-admin.js';
import sequelize, { testConnection } from './config/db.js';
import { configureMercadoPago } from './config/mercadopagoConfig.js';
import mercadopago from 'mercadopago';

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

// Configuración de MercadoPago
console.log("🔧 Configurando MercadoPago...");
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
  integrator_id: process.env.MERCADOPAGO_INTEGRATOR_ID || null
});

// Verificar conexión a MP (opcional)
try {
  await mercadopago.payment.methods();
  console.log("✅ MercadoPago configurado correctamente");
} catch (error) {
  console.error("❌ Configuración de MercadoPago fallida:", error.message);
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const startServer = async () => {
  try {
    console.log("\n🔌 Conectando a la base de datos...");
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('❌ Conexión a la base de datos fallida');
    }
    console.log('✅ Conexión a la base de datos establecida');

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
      
      // Opcional: Verificar planes después de iniciar
      console.log("⚡️ Sistema listo para recibir solicitudes");
    });
  } catch (error) {
    console.error('\n❌ Error crítico al iniciar servidor:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Manejo de cierre limpio
const shutdown = (signal) => {
  console.log(`\n🔻 Recibida señal ${signal}. Cerrando servidor...`);
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();