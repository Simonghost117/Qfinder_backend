import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config(); // Cargar variables de entorno

// Verificación de variables de entorno
const requiredEnvVars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'NODE_ENV'];
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`Falta la variable de entorno: ${envVar}`);
    process.exit(1);
  }
});

// Configuración de la conexión a la base de datos
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5, // Máximo de conexiones
      min: 0, // Mínimo de conexiones
      acquire: 30000, // Tiempo máximo en ms que intentará conectar antes de fallar
      idle: 10000, // Tiempo máximo en ms que una conexión puede estar inactiva antes de ser liberada
    },
  }
);

// Probar la conexión a la base de datos
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error);
  }
};

testConnection();

export default sequelize;