import express from 'express';
import { getReporteCuidadoPersonal, updateCuidadoPersonal, deleteCuidadoPersonal, cuidadoId } from '../controllers/cuidadoPersonalController.js';
import { crearCuidadoPersonal, getCuidadosPorPaciente } from '../controllers/cuidadoPersonalController.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { CuidadoPersonalSchema } from '../schema/cuidadoSchema.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';
// import verificarRol from '../middlewares/verificarRol.js';

const router = express.Router();

// Registrar un nuevo cuidado personal
// router.post('/cuidado-personal', verificarRol('Usuario'), registrarCuidado);
router.post('/registerCuidado/:id_paciente', 
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    validateSchema(CuidadoPersonalSchema),
    crearCuidadoPersonal
);

// Obtener cuidados de un paciente
// router.get('/cuidado-personal/:idPaciente', verificarRol('Medico'), obtenerCuidadosPaciente);
router.get('/listarCuidado/:id_paciente', 
    verifyToken,
    checkEpisodioPermissions(['Usuario']),          
    getCuidadosPorPaciente
);

router.get('/cuidadoId/:id_paciente/:id_cuidado', 
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    cuidadoId
);
//⭕Error bd fechas
router.get('/reporte/:idPaciente', 
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    getReporteCuidadoPersonal
);

router.put('/updateCuidado/:id_paciente/:id_cuidado',
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    validateSchema(CuidadoPersonalSchema),
    updateCuidadoPersonal );

router.delete('/eliminarCuidado/:id_paciente/:id_cuidado', 
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    deleteCuidadoPersonal
);

export default router;
