import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import panelRoutes from './routes/panel.routes.js';
import cuidadoPersonalRoutes from './routes/cuidadoPersonalRoutes.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api', panelRoutes);
app.use('/api', cuidadoPersonalRoutes);

app.get('/', (req, res) => {
  res.send('Servidor Qfinder-backend activo ✅');
});

export default app;
