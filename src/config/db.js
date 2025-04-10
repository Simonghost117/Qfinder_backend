import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config(); // Cargar variables de entorno

// Verificación de variables de entorno (de HEAD)
const requiredEnvVars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'NODE_ENV'];
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`Falta la variable de entorno: ${envVar}`);
    process.exit(1);
  }
});

// Configuración de la conexión a la base de datos (combinando lo mejor de ambas)
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306, // Valor por defecto de origin/Maicol
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false, // De HEAD
    pool: { // Configuración de pool de HEAD
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Funciones útiles de HEAD
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente.');
    return true;
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error);
    return false;
  }
};

const safeSync = async () => {
  try {
    await sequelize.sync({ alter: true }); // o { force: true } según necesidad
    console.log('📦 Modelos sincronizados correctamente.');
  } catch (error) {
    console.error('❌ Error al sincronizar modelos:', error);
  }
};

export default sequelize;
export { testConnection, safeSync };