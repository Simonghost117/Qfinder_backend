// routes/pacienteMedicamento.routes.js

import { Router } from 'express';
import {
  asignarMedicamento,
  listarAsignaciones,
  actualizarAsignacion,
  eliminarAsignacion
} from '../controllers/pacienteMedicamentoController.js';

import { verifyToken } from '../middlewares/verifyToken.js';
import { validateSchema } from '../middlewares/validatePaciMedi.js';
import { asignarMedicamentoSchema } from '../schema/pacienteMedicamento.js';

const router = Router();

// 👉 Asignar un medicamento a un paciente
router.post(
  '/crear',
  verifyToken,
  validateSchema(asignarMedicamentoSchema),
  asignarMedicamento
);

// 👉 Listar medicamentos asignados por el usuario logueado
router.get('/', verifyToken, listarAsignaciones);

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
