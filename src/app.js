// Importaciones de módulos base
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { EventEmitter } from 'events';

// Configuración de entorno
dotenv.config();

// Inicialización de la app
const app = express();

// Configuración de EventEmitter
EventEmitter.defaultMaxListeners = 15;

// Configuración de sesión
app.use(session({
  secret: process.env.SESSION_SECRET || 'tu_secreto_super_seguro',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Cambia a true si usas HTTPS
}));

// Middlewares globales
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://qfinder-deploy-xajv.vercel.app',
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de archivos estáticos
app.use('/uploads', express.static('uploads'));

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
import medicoRoutes from './routes/medico.routes.js';
import CitaMedica from './routes/citaMedica.routes.js';

// Endpoint raíz informativo
app.get('/', (req, res) => {
  res.json({
    message: 'Servidor Qfinder-backend activo ✅',
    endpoints: {
      auth: '/api/auth',
      medicos: '/api/medicos',
      episodios: '/api/episodios',
      redes: '/api/redes',
      paciente: '/api/paciente',
      familiar: '/api/familiar',
      panel: '/api/panel',
      cuidadoPersonal: '/api/cuidado-personal',
      actividades: '/api/actividades',
      regSintomas: '/api/regSintomas',
      citaMedica: '/api/citaMedica',
      // reportes: '/api/reportes' // Comentado porque no se usa (puedes quitar el comentario si quieres habilitarlo)
    }
  });
});

// Ruta de prueba de estado
app.get('/test', (req, res) => {
  res.json({ message: 'El servidor está funcionando correctamente' });
});

// Configuración de rutas API
app.use('/api/auth', usuarioRoutes); // Autenticación (falta recuperar contraseña)
app.use('/api/medicos', medicoRoutes); // Validaciones - CRUD (YA NO SE NECESITA pero conservado)
app.use('/api/episodios', routerEpisodioSalud); // Completo
// app.use('/api/reportes', routerReport); // No se va a usar (comentado pero conservado)
app.use('/api/redes', redesRoutes); // Completo
app.use('/api/paciente', pacienteRoutes); // Completo
app.use('/api/familiar', familiarRoutes); // No se necesita pero conservado
app.use('/api/panel', panelRoutes);
app.use('/api/cuidado-personal', cuidadoPersonalRoutes);
app.use('/api/actividades', actividadRouter);
app.use('/api/regSintomas', RegSintomas);
app.use('/api/citaMedica', CitaMedica); // Completo

// Exportación de la app
export default app;
