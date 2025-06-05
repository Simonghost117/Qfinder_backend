import { z } from 'zod';

export const asignarMedicamentoSchema = z.object({
  id_paciente: z.number({ required_error: 'El paciente es obligatorio' }),
  id_medicamento: z.number({ required_error: 'El medicamento es obligatorio' }),
  fecha_inicio: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha de inicio inválida',
  }),
  fecha_fin: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha de fin inválida',
  }),
  dosis: z.string().max(255, 'La dosis es demasiado larga').optional(),
  frecuencia: z.number({
    required_error: 'La frecuencia es obligatoria',
  }).int().min(1, 'La frecuencia debe ser al menos 1'),
});
