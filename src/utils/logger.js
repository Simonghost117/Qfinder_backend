// src/utils/logger.js
import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración para entornos de desarrollo y producción
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    ({ level, message, timestamp, stack }) => 
      `${timestamp} ${level}: ${stack || message}`
  )
);

const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Transportes comunes
const transports = [
  new DailyRotateFile({
    filename: join(__dirname, '../../logs/application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info'
  }),
  new DailyRotateFile({
    filename: join(__dirname, '../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error'
  })
];

// Logger para desarrollo
const devLogger = winston.createLogger({
  level: 'debug',
  format: devFormat,
  transports: [
    ...transports,
    new winston.transports.Console()
  ]
});

// Logger para producción
const prodLogger = winston.createLogger({
  level: 'info',
  format: prodFormat,
  transports: [
    ...transports,
    new winston.transports.Console()
  ]
});

// Seleccionar logger según entorno
const logger = process.env.NODE_ENV === 'production' ? prodLogger : devLogger;

export default logger;