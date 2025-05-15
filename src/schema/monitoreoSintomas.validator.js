import { z } from 'zod';

export const sintomaSchema = z.object({
  fecha_sintoma: z.coerce.date().optional(),
  sintoma: z.string().min(2, 'El síntoma es obligatorio'),
  gravedad: z.enum(['baja', 'media', 'alta']).optional(),
  observaciones: z.string().optional(),
});