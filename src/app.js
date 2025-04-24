import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { EventEmitter } from 'events';

// Configuración de entorno
dotenv.config();

// Importación de rutas
import usuarioRoutes from './routes/usuario.routes.js';
import pacienteRoutes from './routes/pacienteRoutes.js';
import familiarRoutes from './routes/familiarRoutes.js';
import redesRoutes from './routes/redes.routes.js';
import routerEpisodioSalud from './routes/episodioSalud.routes.js';
import routerReport from './routes/reporteSalud.routes.js';
import panelRoutes from './routes/panel.routes.js';
import cuidadoPersonalRoutes from './routes/cuidadoPersonalRoutes.js';
import actividadRouter from './routes/activity.router.js';
import RegSintomas from './routes/monitorerSintomasRouter.js';

const app = express();

// Configuración de EventEmitter
EventEmitter.defaultMaxListeners = 15; // Aumenta el límite

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

// Configuración de archivos estáticos
app.use('/uploads', express.static('uploads'));

// Rutas de prueba
app.get('/', (req, res) => {
  res.send('Servidor Qfinder-backend activo ✅');
});

app.get('/test', (req, res) => {
  res.json({ message: 'El servidor está funcionando correctamente' });
});

// Configuración de rutas
app.use('/api/auth', usuarioRoutes);
app.use('/api/episodios', routerEpisodioSalud);
app.use('/api/reportes', routerReport);
app.use('/api/redes', redesRoutes);
app.use('/api/paciente', pacienteRoutes);
app.use('/api/familiar', familiarRoutes);
app.use('/api', panelRoutes);
app.use('/api', cuidadoPersonalRoutes);
app.use('/api/actividades', actividadRouter);
app.use('/api/regSintomas', RegSintomas);

export default app;