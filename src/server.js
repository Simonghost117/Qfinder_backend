// src/server.js
import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import sequelize from './config/db.js'; // ← Ya usas la exportación por defecto

dotenv.config();

const PORT = process.env.PORT || 3000;

// Middleware de manejo de errores
const server = http.createServer(app);

// Conexión a la base de datos y levantamiento del servidor
sequelize.authenticate()
  .then(() => {
    console.log('Conectado a la base de datos');
    server.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al conectar la base de datos:', err);
  });
