import { z } from "zod";

export const createActivitySchema = z.object({
  fecha_actividad: z.string().datetime(), // 🕒 Asegura formato ISO 8601
  duracion: z.number().int().positive(),
  tipo_actividad: z.string().min(3, "El tipo de actividad debe tener al menos 3 caracteres"),
  intensidad: z.enum(["baja", "media", "alta"]).optional(),
  descripcion: z.string().min(5, "La descripción debe tener al menos 5 caracteres"),
  estado: z.enum(["pendiente", "en_progreso", "completada", "cancelada"]),
});