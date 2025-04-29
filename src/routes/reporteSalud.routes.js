import { Router } from 'express';
import { ReporteSaludController } from '../controllers/reporteSalud.controller.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';
import { validateZodSchema } from '../middlewares/validateZod.middleware.js';
// //import { authRequired } from '../middlewares/auth.middleware.js';
import { observacionSchema, datosDispositivoSchema } from '../schema/reporteSalud.validator.js';

const routerReport = Router();

routerReport.post(
  '/pacientes/:id_paciente/observaciones',
  // authRequired,
  checkEpisodioPermissions(['Familiar']),
  validateZodSchema(observacionSchema),
  ReporteSaludController.registrarObservacion
);

routerReport.post(
  '/pacientes/:id_paciente/dispositivos',
  validateZodSchema(datosDispositivoSchema),
  ReporteSaludController.registrarDatosSistema
);

export default routerReport;

// import { Router } from 'express';
// import { ReporteSaludController } from '../controllers/reporteSalud.controller.js';

// import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';
// //import { validateRequest } from '../middlewares/validator.middleware.js';
// import { 
//     observacionSchema, 
//     datosDispositivoSchema 
// } from '../validators/reporteSalud.validator.js';

// const routerReport = Router();

// // Ruta para que cuidadores registren observaciones
// routerReport.post(
//     '/pacientes/:id_paciente/observaciones',
//    
//     checkEpisodioPermissions(['Familiar']),
//     validateRequest(observacionSchema),
//     ReporteSaludController.registrarObservacion
// );

// // Ruta para sistemas/dispositivos (sin autenticación de usuario)
// routerReport.post(
//     '/pacientes/:id_paciente/dispositivos',
//     validateRequest(datosDispositivoSchema),
//     ReporteSaludController.registrarDatosSistema
// );

// export default routerReport;