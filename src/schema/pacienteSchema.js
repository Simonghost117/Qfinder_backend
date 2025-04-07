import { z } from "zod";

const PacienteSchema = z.object({
  id_usuario: z.number({
    required_error: "debe ingresar un valor para el id Usuario"
  }).int("El valor debe ser un número entero"),
  nombre: z.string()
    .min(2, {
      message: "El nombre del paciente debe tener al menos 2 carácteres"
    })
    .max(100, {
      message: "El nombre del paciente no puede exceder los 100 carácteres"
    }),
  apellido: z.string()
    .min(2, {
      message: "El apellido del paciente debe tener al menos 2 carácteres"
    })
    .max(100, {
      message: "El apellido del paciente no puede exceder los 100 carácteres"
    }),
  fecha_nacimiento: z.string()
    .transform((str) => new Date(str))
    .refine((date) => {
      return date.getTime() <= new Date().getTime();
    }, {
      message: "La fecha no puede estar en el futuro.",
    }),
  sexo: z.enum(['masculino', 'femenino', 'otro', 'prefiero_no_decir'], {
    message: "La orientación sexual debe ser obligatoria"
  }),
  diagnostico_principal: z.string()
    .min(10, {
      message: "El Diagnostico Principal debe tener almenos 10 carácteres"
    })
    .max(100, {
      message: "La escritura del diagnostico no puede exceder los 100 carácteres"
    }),
  nivel_autonomia: z.enum(['alta', 'baja', 'media']).optional()
})

export default PacienteSchema;