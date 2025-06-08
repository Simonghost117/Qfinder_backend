import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import './config/firebase-admin.js';
import sequelize, { testConnection } from './config/db.js';
import { MercadoPagoConfig } from 'mercadopago';

// Configuración de entorno
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Validación de variables críticas
const requiredEnvVars = [
  'NODE_ENV',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'MERCADOPAGO_ACCESS_TOKEN'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Variable de entorno faltante: ${varName}`);
    process.exit(1);
  }
});

// Configuración de MercadoPago (esto debería estar en mercadopagoConfig.js)
export const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID || undefined
  }
});

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const startServer = async () => {
  try {
    // 1. Configurar MercadoPago primero
    console.log("🔧 Configurando MercadoPago...");
    // Aquí deberías verificar que la configuración es válida
    if (!client.accessToken || client.accessToken.length < 30) {
      throw new Error('❌ Configuración de MercadoPago inválida');
    }
    console.log('✅ MercadoPago configurado correctamente');

    // 2. Conectar a la base de datos
    console.log("\n🔌 Conectando a la base de datos...");
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('❌ Conexión a la base de datos fallida');
    }
    console.log('✅ Conexión a la base de datos establecida');

    // 3. Sincronizar modelos (solo desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log("\n🛠 Sincronizando modelos de base de datos...");
      await sequelize.sync({ alter: false});
      console.log("✅ Base de datos sincronizada (modo desarrollo)");
    }

    // 4. Iniciar servidor
    server.listen(PORT, () => {
      console.log(`\n🚀 Servidor escuchando en http://localhost:${PORT}`);
      console.log(`🔧 Entorno: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('\n❌ Error al iniciar servidor:', error.message);
    process.exit(1);
  }
};

// Manejo de cierre
const gracefulShutdown = () => {
  console.log('\n🔻 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer();