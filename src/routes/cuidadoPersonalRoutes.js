import express from 'express';
import { getReporteCuidadoPersonal } from '../controllers/cuidadoPersonalController.js';
import { crearCuidadoPersonal, getCuidadosPorPaciente } from '../controllers/cuidadoPersonalController.js';
// import verificarRol from '../middlewares/verificarRol.js';

const router = express.Router();

// Registrar un nuevo cuidado personal
// router.post('/cuidado-personal', verificarRol('Usuario'), registrarCuidado);
router.post('/registerCuidado', 
    crearCuidadoPersonal
);

// Obtener cuidados de un paciente
// router.get('/cuidado-personal/:idPaciente', verificarRol('Medico'), obtenerCuidadosPaciente);
router.get('/listarCuidado/:idPaciente',           
    getCuidadosPorPaciente
);

router.get('/reporte/:idPaciente', 
    getReporteCuidadoPersonal
);

export default router;
