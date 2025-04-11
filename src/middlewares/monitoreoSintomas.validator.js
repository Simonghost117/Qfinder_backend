import { z } from 'zod';

export const sintomaSchema = z.object({
  sintoma: z.string().min(2, 'El síntoma es obligatorio'),
  gravedad: z
    .number({ invalid_type_error: 'La gravedad debe ser un número' })
    .min(1, 'La gravedad mínima es 1')
    .max(10, 'La gravedad máxima es 10'),
  observaciones: z.string().optional(),
  fecha_sintoma: z.coerce.date().optional()
});