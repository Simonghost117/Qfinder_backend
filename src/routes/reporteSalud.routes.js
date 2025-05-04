import { Router } from 'express';
import { ReporteSaludController } from '../controllers/reporteSalud.controller.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';
import { validateZodSchema } from '../middlewares/validateZod.middleware.js';
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
