import { z } from "zod";

export const CuidadoPersonalSchema = z.object({
  fecha: z.string().datetime(), // Validación ISO 8601 para fechas
  tipo_cuidado: z.enum(["higiene", "vestido", "aseo", "movilidad", "otro"]),
  descripcion_cuidado: z.string().max(500).optional(), // Máximo 500 caracteres
  nivel_asistencia: z.enum(["independiente", "supervisado", "asistido", "dependiente"]),
  observaciones: z.string().max(500).optional() // Observaciones también opcionales
});