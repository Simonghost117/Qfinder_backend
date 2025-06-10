import { Router } from 'express';
import { 
  crearMedicamento,
  listarMedicamentos,
  listarMedicamentosId,
  actualizarMedicamento,
  eliminarMedicamento, 
  listarMedicamentos2
} from '../controllers/medicamento.controller.js';
import { verifyToken, verifyTokenWeb } from '../middlewares/verifyToken.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { medicamentoSchema } from '../schema/medicamentoSchema.js';
import { validateAdmin, validateRol } from '../middlewares/validateAdmin.js';
import { paginationMiddleware } from '../middlewares/pagination.js';

const router = Router();

//Autenticacion de rutas
//🟢
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
  verifyTokenWeb, 
  validateRol(['Administrador', 'Super']),
  validateSchema(medicamentoSchema),
  crearMedicamento
);
router.get('/listar2', 
  verifyTokenWeb,
  validateRol(['Administrador', 'Super']),
  paginationMiddleware(5),
  listarMedicamentos2
);
router.put('/actualizar/:id',
  verifyToken, 
  validateRol(['Administrador', 'Super']),
  validateSchema(medicamentoSchema),
  actualizarMedicamento
);
router.delete('/eliminar/:id', 
  verifyToken, 
  validateRol(['Administrador', 'Super']),
  eliminarMedicamento
);

export default router;
