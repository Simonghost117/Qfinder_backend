import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Importamos rutas
import actividadRouter from './router/activity.router.js';

// Middleware de manejo de errores

const app = express();

// Middlewares globales
app.use(cors());
app.use(morgan('dev'));
app.use(express.json()); // Para que podamos recibir JSON en las solicitudes

// Rutas
app.use('/api/actividades', actividadRouter);

// Middleware de manejo de errores (debe ir después de las rutas)


export default app;
