import { createActivitySchema } from "../validator/activity.validator.js"; // Asegúrate de la ruta correcta
import { errorResponse } from "../utils/response.js";

export const validateCreateActivity = (req, res, next) => {
  try {
    // Validamos los datos con el esquema de Zod
    createActivitySchema.parse(req.body);
    next(); // Si todo está bien, pasamos al siguiente middleware/controlador
  } catch (error) {
    if (error.name === "ZodError") {
      return errorResponse(res, "Error de validación", 400, error.errors);
    }

    return errorResponse(res, "Error interno del servidor", 500);
  }
};
