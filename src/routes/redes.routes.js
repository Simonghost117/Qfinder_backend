const express = require('express');
const router = express.Router();
const redesController = require('../controllers/redes.controller');
const authMiddleware = require('../middlewares/auth.middleware'); // si ya existe

router.get('/', redesController.listarPorEnfermedad);
router.post('/:id/unirse', authMiddleware, redesController.unirseARed);
router.delete('/:id/salir', authMiddleware, redesController.salirDeRed);

module.exports = router;
