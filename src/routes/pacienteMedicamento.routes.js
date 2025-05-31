// routes/pacienteMedicamento.routes.js

import { Router } from 'express';
import {
  asignarMedicamento,
  listarMedicamentosPorPaciente,
  listarAsignaciones,
  actualizarAsignacion,
  eliminarAsignacion
} from '../controllers/pacienteMedicamentoController.js';

import { verifyToken } from '../middlewares/verifyToken.js';
import { validateSchema } from '../middlewares/validatePaciMedi.js';
import { asignarMedicamentoSchema } from '../schema/pacienteMedicamento.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';

const router = Router();

// 👉 Asignar un medicamento a un paciente
router.post(
  '/crear',
  verifyToken,
  validateSchema(asignarMedicamentoSchema),
  // checkEpisodioPermissions([ 'Usuario']),
  asignarMedicamento
);

// 👉 Listar medicamentos asignados por el usuario logueado
router.get('/', verifyToken, listarAsignaciones);

// 👉 Listar asignaciones especificas de un paciente en particular
// router.get('/:id', verifyToken, listarAsignaciones);
// 👉 Listar asignaciones especificas de un 
router.get('/asignaciones/:id_paciente', verifyToken, listarMedicamentosPorPaciente);

// 👉 Actualizar una asignación específica
router.put(
  '/:id',
  verifyToken,
  validateSchema(asignarMedicamentoSchema),
  actualizarAsignacion
);

// 👉 Eliminar una asignación
router.delete('/:id', verifyToken, eliminarAsignacion);

export default router;
