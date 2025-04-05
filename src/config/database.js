import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Configuración mejorada de Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Configuración específica para MySQL/MariaDB
    dialectOptions: {
      connectTimeout: 60000, // Aumenta timeout de conexión
      dateStrings: true,     // Evita conversión automática de fechas
      typeCast: true,        // Permite type casting
      supportBigNumbers: true,
      bigNumberStrings: true
    },
    
    // Configuración de pool mejorada
    pool: {
      max: 10,               // Aumenta el máximo de conexiones
      min: 2,                // Mantiene mínimo de conexiones
      acquire: 60000,        // Aumenta tiempo de adquisición
      idle: 10000            // Tiempo de inactividad
    },
    
    // Configuración global de modelos
    define: {
      timestamps: true,      // Habilita createdAt y updatedAt
      underscored: true,     // Usa snake_case en la base de datos
      paranoid: false,       // Deshabilita deletedAt por defecto
      freezeTableName: true  // Evita pluralización automática
    },
    
    // Zona horaria
    timezone: '-05:00'       // Ajusta según tu ubicación (ej. América/Lima)
  }
);

// Función mejorada para probar conexión
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    
    // Verificación adicional de permisos
    await sequelize.query('SELECT 1');
    
    console.log('✅ Conexión a la base de datos establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error.message);
    
    // Detalles específicos para diagnóstico
    if (error.original) {
      console.error('Código de error:', error.original.code);
      console.error('Número de error:', error.original.errno);
    }
    
    return false;
  }
};

// Función para sincronización segura
export const safeSync = async () => {
  try {
    console.log('🔃 Sincronizando modelos...');
    
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({
      alter: process.env.NODE_ENV === 'development',
      logging: console.log
    });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ Modelos sincronizados correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al sincronizar modelos:', error);
    return false;
  }
};

export default sequelize;