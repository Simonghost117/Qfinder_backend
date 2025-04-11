import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import sequelize, { testConnection, safeSync } from './config/db.js';

// Configuración de entorno
dotenv.config();

const PORT = process.env.PORT || 3000;

// Verificación de la instancia de Sequelize
if (!sequelize) {
  console.error('❌ Error: La instancia de Sequelize no se cargó correctamente.');
  process.exit(1);
}

// Crear servidor HTTP
const server = http.createServer(app);

const startServer = async () => {
  try {
    // Verificar conexión a la base de datos
    const isConnected = await testConnection();
    
    if (!isConnected) {
      throw new Error('No se pudo conectar a la base de datos');
    }

    console.log('✅ Conexión a la base de datos establecida con éxito');

    // Sincronización en desarrollo
    if (process.env.NODE_ENV === 'development') {
      await safeSync();
    }

    // Iniciar servidor
    server.listen(PORT, () => {
      console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
    });

    // Manejo de cierre limpio
    process.on('SIGTERM', () => {
      server.close(() => {
        console.log('Servidor cerrado');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error al iniciar la aplicación:', error);
    process.exit(1);
  }
};

startServer();