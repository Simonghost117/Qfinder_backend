import { Router } from 'express';
import { 
  crearMedicamento,
  listarMedicamentos,
  actualizarMedicamento,
  eliminarMedicamento
} from '../controllers/medicamento.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = Router();

// Protegidas con verifyToken
router.post('/crear', verifyToken, crearMedicamento);
router.get('/listar', verifyToken, listarMedicamentos);
router.put('/actualizar/:id', verifyToken, actualizarMedicamento);
router.delete('/eliminar/:id', verifyToken, eliminarMedicamento);

export default router;
