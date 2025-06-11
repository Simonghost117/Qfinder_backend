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
import { validatePermissions } from '../middlewares/episodioPermissions.middleware.js';


const router = Router();

//🟢
router.post(
  '/crear',
  verifyToken,
  validateSchema(asignarMedicamentoSchema),
  validatePermissions(['responsable', 'colaborador']),
  asignarMedicamento
);

router.get('/', 
  verifyToken, 
  listarAsignaciones
);

//🟢
router.get('/asignaciones/:id_paciente', 
  verifyToken, 
  validatePermissions(['responsable', 'colaborador']),
  listarMedicamentosPorPaciente
);

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
