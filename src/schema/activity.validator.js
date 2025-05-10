import { z } from "zod";

export const createActivitySchema = z.object({
  fecha_actividad: z.string().datetime(), // 🕒 Asegura formato ISO 8601
  duracion: z.number().int().positive(),
  tipo_actividad: z.enum(["higiene", "vestido", "ejercicio", "recreacion", "medicacion", "terapia", "comida", "otro"]),
  intensidad: z.enum(["leve", "moderada", "alta"]),
  descripcion: z.string().min(5, "La descripción debe tener al menos 5 caracteres"),
  estado: z.enum(["pendiente", "en_progreso", "completada", "cancelada"]),
  observaciones: z.string().optional(), // ✅ Puede estar vacío
});