import { Router } from 'express';
import { 
  crearMedicamento,
  listarMedicamentos,
  listarMedicamentosId,
  actualizarMedicamento,
  eliminarMedicamento
} from '../controllers/medicamento.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { medicamentoSchema } from '../schema/medicamentoSchema.js';

const router = Router();

//Autenticacion de rutas

// Protegidas con verifyToken
router.post('/crear', 
  verifyToken, 
  validateSchema(medicamentoSchema),
  crearMedicamento
);
router.get('/listar', 
  verifyToken, 
  listarMedicamentos
);
router.get('/listar/:id', 
  verifyToken, 
  listarMedicamentosId
);
router.put('/actualizar/:id',
  verifyToken, 
  validateSchema(medicamentoSchema),
  actualizarMedicamento
);
router.delete('/eliminar/:id', 
  verifyToken, 
  eliminarMedicamento
);

export default router;
