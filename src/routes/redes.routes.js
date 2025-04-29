import express from 'express';
import {
    listarPorEnfermedad,
  unirseARed,
  salirDeRed
} from '../controllers/redes.controller.js';

const router = express.Router();

router.get('/', listarPorEnfermedad);//No va
router.post('/unirse/:id', unirseARed);
router.delete('/salir/:id', salirDeRed);

export default router;
