import { z } from "zod";

export const CuidadoPersonalSchema = z.object({
  fecha: z.string().datetime(), // Validación ISO 8601 para fechas
  tipo_cuidado: z.string()
    .min(3, {message: "El sintoma debe contener al menos e caracteres"})
    .max(100, {message: "El sintoma debe contener menos de 100 caracteres"}), // Máximo 100 caracteres
  descripcion_cuidado: z.string()
    .min(3, {message: "La descripción del cuidado debe contener al menos 3 caracteres"})
    .max(500, {message: "La descripción del cuidado debe contener menos de 500 caracteres"}), // Máximo 500 caracteres
  nivel_asistencia: z.enum(["independiente", "supervisado", "asistido", "dependiente"]),
  observaciones: z.string().max(500).optional() // Observaciones también opcionales
});