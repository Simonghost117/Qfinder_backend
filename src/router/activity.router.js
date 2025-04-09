import { Router } from "express";
import * as activityController from "../controller/activity.controller.js";
import { validateCreateActivity } from "../middleware/validate.Shema.js"; // Asegúrate de la ruta correcta

const router = Router();

// Ruta para crear una nueva actividad con middleware de validación
router.post("/", validateCreateActivity, activityController.createActivity);

// Ruta para obtener todas las actividades
router.get("/", activityController.getAllActivities);

// Ruta para obtener una actividad por su ID
router.get("/:id", activityController.getActivityById);

// Ruta para actualizar una actividad (si deseas, puedes validar aquí también)
router.put("/:id", activityController.updateActivity);

// Ruta para eliminar una actividad
router.delete("/:id", activityController.deleteActivity);

export default router;
