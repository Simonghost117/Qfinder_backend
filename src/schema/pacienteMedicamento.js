import { z } from 'zod';

export const asignarMedicamentoSchema = z.object({
  id_paciente: z.number({ required_error: 'El paciente es obligatorio' }),
  id_medicamento: z.number({ required_error: 'El medicamento es obligatorio' }),
  fecha_inicio: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha de inicio inválida',
  }),
  hora_inicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato de hora inválido"),
  fecha_fin: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha de fin inválida',
  }),
  dosis: z.string().max(255, 'La dosis es demasiado larga').optional(),
  frecuencia: z.string().max(255, 'La frecuencia es demasiado larga').optional(),
});
