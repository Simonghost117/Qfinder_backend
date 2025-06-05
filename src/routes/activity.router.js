import { Router } from "express";
import * as activityController from "../controllers/activity.controller.js";
import { validateCreateActivity } from "../middlewares/validate.Shema.js"; // Asegúrate de la ruta correcta
import { verifyToken } from "../middlewares/verifyToken.js";
import { checkEpisodioPermissions } from "../middlewares/episodioPermissions.middleware.js";

const router = Router();

// Ruta para crear una nueva actividad con middleware de validación
//🟢
router.post("/crearActivdad/:id_paciente", 
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    validateCreateActivity, 
    activityController.createActivity
);

// Ruta para obtener todas las actividades
//🟢
router.get("/listarActividades/:id_paciente", 
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    activityController.getAllActivities
);

// Ruta para obtener una actividad por su ID
router.get("/actividadId/:id_paciente/:id_actividad", 
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    activityController.getActivityById
);

// Ruta para actualizar una actividad (si deseas, puedes validar aquí también)
router.put("/actualizarAct/:id_paciente/:id_actividad", 
    verifyToken,
    checkEpisodioPermissions(['Usuario']),
    activityController.updateActivity
);

// Ruta para eliminar una actividad
router.delete("/eliminarAct/:id_paciente/:id_actividad",
    verifyToken,
    checkEpisodioPermissions(['Usuario']), 
    activityController.deleteActivity
);

router.get("/listarActividades/:id_usuario",
    verifyToken,
    activityController.todasActividades
)

export default router;
