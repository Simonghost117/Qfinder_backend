import app from './app.js'; // Importa la instancia de Express
import { testConnection, safeSync } from './config/database.js';

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    // Probar conexión
    const isConnected = await testConnection();
    
    if (!isConnected) {
      throw new Error('No se pudo conectar a la base de datos');
    }

    // Sincronizar solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      await safeSync();
    }
    
    // Iniciar servidor HTTP
    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });

    // Manejo de cierre adecuado
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