import dotenv from 'dotenv';
import app from './app.js';
import { sequelize, testConnection, safeSync } from './config/database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

if (!sequelize) {
  console.error('Error: La instancia de Sequelize no se cargó correctamente.');
  process.exit(1);
}

const startServer = async () => {
  try {
    const isConnected = await testConnection();
    
    if (!isConnected) {
      throw new Error('No se pudo conectar a la base de datos');
    }

    if (process.env.NODE_ENV === 'development') {
      await safeSync();
    }

    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });

    process.on('SIGTERM', () => {
      server.close(() => {
        console.log('Servidor cerrado');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);
    process.exit(1);
  }
};

startServer();
