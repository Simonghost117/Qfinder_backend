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
import { validateAdmin } from '../middlewares/validateAdmin.js';

const router = Router();

//Autenticacion de rutas
router.get('/listar', 
  verifyToken, 
  listarMedicamentos
);
router.get('/listar/:id', 
  verifyToken, 
  listarMedicamentosId
);

//ADMINISTRADOR

router.post('/crear', 
  verifyToken, 
  validateAdmin,
  validateSchema(medicamentoSchema),
  crearMedicamento
);
router.put('/actualizar/:id',
  verifyToken, 
  validateAdmin,
  validateSchema(medicamentoSchema),
  actualizarMedicamento
);
router.delete('/eliminar/:id', 
  verifyToken, 
  validateAdmin,
  eliminarMedicamento
);

export default router;
