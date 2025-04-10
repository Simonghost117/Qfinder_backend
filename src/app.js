// src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
// import usuarioRoutes from './routes/usuarioRoutes.js';
import pacienteRoutes from './routes/pacienteRoutes.js';
import familiarRoutes from "./routes/familiarRoutes.js";
 import usuarioRoutes from './routes/usuario.routes.js';
 import redesRoutes from './routes/redes.routes.js';
 import RegSintomas from './routes/monitorerSintomasRouter.js';

//import { handleError } from './utils/errorHandler.js';

import cookieParser from 'cookie-parser';
import  router  from './routes/episodioSalud.routes.js';
import  routerReport from './routes/reporteSalud.routes.js';
// import notaMedicaRoutes from './routes/notaMedicaRoutes.js';
// import errorHandler from './middlewares/errorHandler.js';


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
app.listen(3000, () => {
  console.log('Servidor corriendo en puerto 3000');
});
// Usar los routers
 app.use('/api/auth', usuarioRoutes);
 app.use('/api/episodios', router);
app.use('/api/reportes', routerReport);

app.use('/api/redes', redesRoutes);

// app.use('/api', notaMedicaRoutes);
app.use('/api/paciente', pacienteRoutes);
app.use('/api/familiar', familiarRoutes);
app.use('/api/regSintomas', RegSintomas)

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
// Manejo de errores
// app.use(errorHandler);

export default app;

