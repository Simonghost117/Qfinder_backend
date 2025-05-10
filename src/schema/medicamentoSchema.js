import { z } from 'zod';

export const medicamentoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100),
  descripcion: z.string().optional(),
  efectos_secundarios: z.string().optional(),
  tipo: z.enum(['psiquiatrico', 'neurologico', 'general', 'otro'], {
    required_error: 'El tipo es obligatorio'
  })
});
