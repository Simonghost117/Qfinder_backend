import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import  router  from './routes/episodioSalud.routes.js';
import  routerReport from './routes/reporteSalud.routes.js';
import  sequelize  from './config/database.js';
import { handleError } from './utils/errorHandler.js';

const app = express();

// Middlewares básicos
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 15; // Aumenta el límite
// Configuración de archivos estáticos
app.use('/uploads', express.static('uploads'));

// Rutas
app.use('/api/episodios', router);
app.use('/api/reportes', routerReport);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'API MidQfinder - Episodios de Salud',
    version: '1.0.0'
  });
});

// Manejo de errores

export default app;