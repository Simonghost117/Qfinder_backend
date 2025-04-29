import { z } from 'zod';

export const medicoSchema = z.object({
  especialidad: z.string().min(3, "La especialidad es obligatoria"),
  licencia: z.string().min(3, "La licencia es obligatoria")
});
