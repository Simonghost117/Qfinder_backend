import { z } from 'zod';

const sintomas = [
  'fiebre', 'dolor', 'mareos', 'convulsiones',
  'confusion', 'ansiedad', 'alucinaciones'
];

export const episodioSchema = z.object({
  id_paciente: z.number().int().positive(),
  tipo: z.enum(['crisis', 'recaida', 'hospitalizacion', 'otro']),
  fecha_hora_inicio: z.coerce.date().max(new Date()),
  severidad: z.number().int().min(1).max(10),
  sintomas: z.array(z.enum(sintomas)).min(1),
  descripcion: z.string().min(10).max(500),
  intervenciones: z.string().optional()
});

export const filtroSchema = z.object({
  fecha_desde: z.coerce.date().optional(),
  fecha_hasta: z.coerce.date().optional(),
  tipo: z.string().optional(),
  severidad_min: z.number().int().min(1).max(10).optional()
}).refine(data => {
  if (data.fecha_desde && data.fecha_hasta) {
    return data.fecha_hasta >= data.fecha_desde;
  }
  return true;
}, {
  message: 'Fecha final debe ser mayor o igual a la inicial',
  path: ['fecha_hasta']
});