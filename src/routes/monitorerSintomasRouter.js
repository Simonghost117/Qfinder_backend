import { Router } from 'express';
import { MonitoreoSintomasController } from '../controllers/monitoreoSintomasController.js';
import { validateZodSchema } from '../middlewares/validateZod.middleware.js';
import { sintomaSchema } from '../middlewares/monitoreoSintomas.validator.js';

const routerSintomas = Router();

routerSintomas.post(
  '/pacientes/:id_paciente/sintomas',
  validateZodSchema(sintomaSchema),
  MonitoreoSintomasController.registrarSintoma
);

routerSintomas.get(
  '/pacientes/:id_paciente/sintomas',
  MonitoreoSintomasController.obtenerSintomasPaciente
);

export default routerSintomas;
