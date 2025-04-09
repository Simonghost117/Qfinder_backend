import { z } from "zod";

const FamiliarSchema = z.object({
  id_usuario: z.number({
    required_error: "debe ingresar un valor para el id Usuario"
  }).int("El valor debe ser un número entero"),
  id_paciente: z.number({
    required_error: "debe ingresar un valor para el id paciente"
  }).int("El valor debe ser un número entero"),
  parentesco: z.enum(['padre','madre','hijo','hija','hermano','hermana','abuelo','abuela','tutor','otro'])
    .optional(),
  cuidador_principal: z.number().int().min(-128).max(127).optional(),
  notificado_emergencia: z.number()
    .int()
    .min(-128)
    .max(127)
    .optional()
})

export default FamiliarSchema;