import express from 'express';
import { getReporteCuidadoPersonal, updateCuidadoPersonal, deleteCuidadoPersonal, cuidadoId } from '../controllers/cuidadoPersonalController.js';
import { crearCuidadoPersonal, getCuidadosPorPaciente } from '../controllers/cuidadoPersonalController.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { CuidadoPersonalSchema } from '../schema/cuidadoSchema.js';
// import verificarRol from '../middlewares/verificarRol.js';

const router = express.Router();

// Registrar un nuevo cuidado personal
// router.post('/cuidado-personal', verificarRol('Usuario'), registrarCuidado);
router.post('/registerCuidado/:id_paciente', 
    validateSchema(CuidadoPersonalSchema),
    crearCuidadoPersonal
);

// Obtener cuidados de un paciente
// router.get('/cuidado-personal/:idPaciente', verificarRol('Medico'), obtenerCuidadosPaciente);
router.get('/listarCuidado/:idPaciente',           
    getCuidadosPorPaciente
);

router.get('/cuidadoId/:idPaciente/:idCuidado', 
    cuidadoId
);

router.get('/reporte/:idPaciente', 
    getReporteCuidadoPersonal
);

router.put('/updateCuidado/:idPaciente/:idCuidado',
    validateSchema(CuidadoPersonalSchema),
    updateCuidadoPersonal );

router.delete('/eliminarCuidado/:idPaciente/:idCuidado', 
    deleteCuidadoPersonal
);

export default router;
