import { z } from 'zod';

export const episodioSchema = z.object({
  tipo: z.string().min(3).max(50),
  fecha_hora_inicio: z.coerce.date(),
  fecha_hora_fin: z.coerce.date().optional().nullable(),
  titulo: z.string().min(3).max(200),
  // severidad: z.enum(['baja', 'media', 'alta']).optional(), 
  descripcion: z.string().min(10).max(500),
  intervenciones: z.string().optional()
}).refine(data => {
  if (data.fecha_hora_inicio && data.fecha_hora_fin) {
    return data.fecha_hora_fin >= data.fecha_hora_inicio;
  }
  return true;
}, {
  message: 'Fecha final debe ser mayor o igual a la inicial',
  path: ['fecha_hora_fin']
});

// export const filtroSchema = z.object({
//   fecha_desde: z.coerce.date().optional(),
//   fecha_hasta: z.coerce.date().optional(),
//   tipo: z.string().optional(),
//   severidad_min: z.number().int().min(1).max(10).optional()
// }).refine(data => {
//   if (data.fecha_desde && data.fecha_hasta) {
//     return data.fecha_hasta >= data.fecha_desde;
//   }
//   return true;
// }, {
//   message: 'Fecha final debe ser mayor o igual a la inicial',
//   path: ['fecha_hasta']
// });

export const filtroSchema = z.object({
  ordenFecha: z.enum(['asc', 'desc']).optional(),
  severidad: z.enum(['baja', 'media', 'alta']).optional(),
  tipo: z.string().optional(),
  estado: z.string().optional(),
  fecha_desde: z.string().datetime().optional(),
  fecha_hasta: z.string().datetime().optional(),
});
