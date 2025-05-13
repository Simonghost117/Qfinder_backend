import { Router } from 'express';
import { MonitoreoSintomasController } from '../controllers/monitoreoSintomasController.js';
import { validateZodSchema } from '../middlewares/validateZod.middleware.js';
import { sintomaSchema } from '../schema/monitoreoSintomas.validator.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';

const routerSintomas = Router();

//⭕gravedad: alta, media, baja
//⭕fecha: automatica o manual
//⭕se puede actualizar o eliminar el registro de sintomas (completar CRUD)

routerSintomas.post(
  '/crarSintoma/:id_paciente',
  verifyToken,
  checkEpisodioPermissions(['Usuario']),
  validateZodSchema(sintomaSchema),
  MonitoreoSintomasController.registrarSintoma
);

routerSintomas.get(
  '/sintomas/:id_paciente',
  verifyToken,
  checkEpisodioPermissions(['Usuario']),
  MonitoreoSintomasController.obtenerSintomasPaciente
);
routerSintomas.get(
  '/sintomaId/:id_paciente/:id_registro',
  verifyToken, 
  checkEpisodioPermissions(['Usuario']),
  MonitoreoSintomasController.obtenerSintomaPorId
);

export default routerSintomas;
