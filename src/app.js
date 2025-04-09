// src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import usuarioRoutes from './routes/usuarioRoutes.js';
import pacienteRoutes from './routes/pacienteRoutes.js';
import familiarRoutes from "./routes/familiarRoutes.js";
// import notaMedicaRoutes from './routes/notaMedicaRoutes.js';
// import errorHandler from './middlewares/errorHandler.js';
import cookieParser from 'cookie-parser';

const app = express();

// Asegúrate de usar cookie-parser antes de tus rutas
app.use(cookieParser());

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Rutas de prueba
app.get('/test', (req, res) => {
    res.json({ message: 'El servidor está funcionando correctamente' });
});

// Usar los routers
 app.use('/api/auth', usuarioRoutes);
// app.use('/api', notaMedicaRoutes);
app.use('/api/paciente', pacienteRoutes);
app.use('/api/familiar', familiarRoutes);

// Manejo de errores
// app.use(errorHandler);

export default app;