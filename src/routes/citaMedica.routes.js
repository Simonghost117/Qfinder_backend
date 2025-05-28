import express from 'express';
import { crearCitaMedica, listarCitasMedicas, listarCitasMedicasId, actualizarCitaMedica, eliminarCitaMedica } from '../controllers/citaMedica.controller.js';
import validateSchema from '../middlewares/validatoreSchema.js';
import { citaMedicaSchema } from '../schema/citaMedicaSchema.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { checkEpisodioPermissions } from '../middlewares/episodioPermissions.middleware.js';

const router = express.Router();

router.post(
    '/crearCita/:id_paciente', 
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    validateSchema(citaMedicaSchema), 
    crearCitaMedica
);
router.get(
    '/listarCitas/:id_paciente',
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    listarCitasMedicas
); 
router.get(
    '/listarCitasId/:id_paciente/:id_cita', 
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    listarCitasMedicasId
); 
router.put(
    '/actualizarCita/:id_paciente/:id_cita',
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    validateSchema(citaMedicaSchema),
    actualizarCitaMedica
);
router.delete(
    '/eliminarCita/:id_paciente/:id_cita',
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    eliminarCitaMedica
);

export default router;