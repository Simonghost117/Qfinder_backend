import express from 'express';
import {
    listarPorEnfermedad,
  unirseARed,
  salirDeRed
} from '../controllers/redes.controller.js';

const router = express.Router();

router.get('/', listarPorEnfermedad);
router.post('/:id/unirse', unirseARed);
router.delete('/:id/salir', salirDeRed);

export default router;
