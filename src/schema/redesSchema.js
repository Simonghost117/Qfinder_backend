import { z } from 'zod';

export const redesSchema = z.object({
  nombre_red: z.string().min(1, 'El nombre de la red es obligatorio'),
  descripcion_red: z.string().optional(),
  imagen_red: z.string().url({ message: "La imagen debe ser una URL válida" }).optional(),
});