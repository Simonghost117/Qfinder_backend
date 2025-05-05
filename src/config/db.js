import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Carga segura de variables de entorno
const envLoaded = dotenv.config();
if (envLoaded.error) {
  console.error('❌ Error cargando .env:', envLoaded.error);
  process.exit(1);
}

// Validación mejorada de variables
const requiredEnvVars = [
  'DB_NAME', 'DB_USER', 'DB_PASSWORD', 
  'DB_HOST', 'DB_PORT', 'NODE_ENV'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Variables faltantes:', missingVars.join(', '));
  process.exit(1);
}

// Configuración optimizada para Supabase
const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? msg => console.log(`📦 ${msg}`) : false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 10,  // Aumentado para Supabase
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true  // Evita pluralización automática
  },
  retry: {  // Manejo de reconexión
    max: 3,
    timeout: 5000
  }
});

// Conexión mejorada con reintentos
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✅ Conexión a Supabase establecida');
      return true;
    } catch (error) {
      console.error(`❌ Intento ${i + 1} de conexión fallido:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// Sincronización segura por entornos
const safeSync = async () => {
  try {
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Sync() desactivado en producción');
      return;
    }

    const options = {
      alter: false,
      force: process.env.FORCE_DB_RESET === 'true'  // Control explícito
    };

    console.log(options.force ? '♻️  Recreando tablas...' : '🔍 Sincronizando modelos...');
    
    await sequelize.sync(options);
    console.log('🔄 Base de datos lista');
  } catch (error) {
    console.error('❌ Error en sync:', error.message);
    throw error;
  }
};

// Manejo de desconexión limpia
process.on('SIGTERM', async () => {
  await sequelize.close();
  console.log('🔌 Conexión a DB cerrada');
});

export { sequelize as default, testConnection, safeSync };