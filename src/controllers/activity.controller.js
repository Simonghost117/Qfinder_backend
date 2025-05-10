import { createActivitySchema } from "../schema/activity.validator.js";
import * as activityService from "../services/activity.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

// Crear una actividad
export const createActivity = async (req, res) => {
  try {
    const { id_paciente } = req.params; 
    
    const validatedData = createActivitySchema.parse(req.body);
    const newActivity = await activityService.createActivity(id_paciente, validatedData);
    return successResponse(res, "Actividad creada correctamente", newActivity, 201);
  } catch (error) {
    console.error(" ERROR EN CREACIÓN DE ACTIVIDAD:", error); // 👈 Este es el log útil

    if (error.name === "ZodError") {
      return errorResponse(res, "Error de validación", 400, error.errors);
    }

    return errorResponse(res, "Error interno del servidor", 500, error.message); // 👈 también puedes enviar el mensaje
  }
};


// Obtener todas las actividades
export const getAllActivities = async (req, res, next) => {
  try {
    const { id_paciente } = req.params; 

    const activities = await activityService.getAllActivities(id_paciente);
    return successResponse(res, "Actividades obtenidas correctamente", activities);
  } catch (error) {
    next(error);
  }
};

// Obtener una actividad por ID
export const getActivityById = async (req, res, next) => {
  try {
    const { id_paciente, id_actividad } = req.params;
    console.log("ID PACIENTE:", id_paciente);
    console.log("ID ACTIVIDAD:", id_actividad);
    const activity = await activityService.getActivityById(id_paciente, id_actividad);

    if (!activity) {
      return errorResponse(res, "Actividad no encontrada", 404);
    }
    return successResponse(res, "Actividad encontrada", activity);
  } catch (error) {
    next(error);
  }
};

// Actualizar una actividad por ID
export const updateActivity = async (req, res, next) => {
  try {
    const { id_paciente, id_actividad } = req.params;
    const validatedData = createActivitySchema.parse(req.body);
    const updated = await activityService.updateActivity(id_paciente, id_actividad, validatedData);

    if (!updated) {
      return errorResponse(res, "Actividad no encontrada para actualizar", 404);
    }

    return successResponse(res, "Actividad actualizada correctamente", updated);
  } catch (error) {
    if (error.name === "ZodError") {
      return errorResponse(res, "Error de validación", 400, error.errors);
    }
    next(error);
  }
};

// Eliminar una actividad por ID
export const deleteActivity = async (req, res, next) => {
  try {
    const { id_paciente, id_actividad } = req.params;
    const deleted = await activityService.deleteActivity(id_paciente, id_actividad);

    if (!deleted) {
      return errorResponse(res, "Actividad no encontrada para eliminar", 404);
    }

    return successResponse(res, "Actividad eliminada correctamente");
  } catch (error) {
    next(error);
  }
};
