import { z } from 'zod';

export const validarAgregarColaborador = z.object({
  id_usuario: z
    .number({
      required_error: 'El id del usuario es obligatorio',
      invalid_type_error: 'El id del usuario debe ser un número',
    })
    .int()
    .positive(),

  id_paciente: z
    .number({
      required_error: 'El id del paciente es obligatorio',
      invalid_type_error: 'El id del paciente debe ser un número',
    })
    .int()
    .positive(),
});
