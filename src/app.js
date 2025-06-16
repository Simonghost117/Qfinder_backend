// Importaciones de módulos base
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import chatRoutes from './routes/chatRoutes.js';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { EventEmitter } from 'events';
import webhookRoutes from './routes/webhookRoutes.js';

// Configuración de entorno
dotenv.config();

// Inicialización de la app
const app = express();
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRoutes);



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
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Añade al inicio de tu app.js:
app.set('trust proxy', 1); // Necesario para Railway

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
import codigoQr from './routes/codigoQr.routes.js';
import medicamentoRoutes from './routes/medicamento.routes.js';
import pacienteMedicamentoRoutes from './routes/pacienteMedicamento.routes.js';
import authRoutes from './routes/authRoutes.js'
import membresiaRoutes from './routes/membresiaRed.routes.js'
import { startAllJobs } from './jobs/cronJobs.js';
import firebaseRoutes from './routes/firebase.js';
// ... otras importaciones
import paymentRoutes from './routes/paymentRoutes.js';
import colaboradorRoutes from './routes/colaborador.routes.js';
import { handleWebhook } from './controllers/paymentController.js';
// Después de inicializar tu aplicación

startAllJobs();
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

// // Configuración de rutas API
app.use('/api/auth', usuarioRoutes); //🟢 usuario
app.use('/api/episodios', routerEpisodioSalud); //🟢 episodio salud
app.use('/api/redes', redesRoutes); //🟢 Redes
app.use('/api/membresiaRed', membresiaRoutes); // 🟢 usuario_red
app.use('/api/paciente', pacienteRoutes); //🟢 paciente
app.use('/api/familiar', familiarRoutes); //🟢 familiar
app.use('/api/cuidadoPersonal', cuidadoPersonalRoutes);// 🟢 Cuidado personal
app.use('/api/actividades', actividadRouter); //🟢 actividad fisica 🔴
app.use('/api/regSintomas', RegSintomas); //🟢 monitoreo sintomas 🔴
app.use('/api/citaMedica', CitaMedica);//🟢 cita medica
app.use('/api/codigoQr', codigoQr)//🟢 codigo qr
app.use('/api/medicamentos', medicamentoRoutes);//🟢 medicamento
app.use('/api/paciente-medicamento', pacienteMedicamentoRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/firebase', authRoutes); 
app.use('/api/firebase', firebaseRoutes); //🟢 episodios salud
app.use('/api/payments', paymentRoutes);
app.use('/api/colaboradores', colaboradorRoutes);
// app.use('/api/medicos', medicoRoutes); // Validaciones - CRUD (YA NO SE NECESITA pero conservado)
// app.use('/api/reportes', routerReport); // No se va a usar (comentado pero conservado)
// app.use('/api/panel', panelRoutes);

// Exportación de la app
export default app;
