import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const config = {
  database: {
    name: process.env.DB_NAME || 'qfinder_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'clave_secreta_dev',
    expiresIn: process.env.JWT_EXPIRES || '24h'
  },
  app: {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4000
  }
};

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    dialect: 'mysql',
    port: config.database.port,
    logging: config.app.env === 'development' ? console.log : false,
    dialectOptions: {
      connectTimeout: 60000,
      dateStrings: true,
      typeCast: true,
      supportBigNumbers: true,
      bigNumberStrings: true
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: false,
      freezeTableName: true
    },
    timezone: '-05:00'
  }
);

const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, { 
    expiresIn: config.jwt.expiresIn 
  });
};

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.query('SELECT 1');
    console.log('✅ Conexión a DB establecida');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a DB:', error.message);
    if (error.original) {
      console.error('Código:', error.original.code);
    }
    return false;
  }
};

const safeSync = async (options = {}) => {
  try {
    console.log('🔃 Sincronizando modelos...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({
      alter: config.app.env === 'development',
      ...options
    });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Modelos sincronizados');
    return true;
  } catch (error) {
    console.error('❌ Error al sincronizar:', error);
    return false;
  }
};

// Exportaciones nombradas
export {
  sequelize,
  config,
  generateToken,
  testConnection,
  safeSync
};
