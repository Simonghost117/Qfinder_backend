import { Router } from 'express';
import { MonitoreoSintomasController } from '../controllers/monitoreoSintomasController.js';
import { validateZodSchema } from '../middlewares/validateZod.middleware.js';
import { sintomaSchema } from '../schema/monitoreoSintomas.validator.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';

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
routerSintomas.get(
  '/sintoma/:id_paciente/:id_registro',
  verifyToken, 
  checkEpisodioPermissions(['Usuario']),
  MonitoreoSintomasController.obtenerSintomaPorId
);

export default routerSintomas;
