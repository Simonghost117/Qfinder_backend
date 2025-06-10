import { z } from "zod";

export const PacienteSchema = z.object({
  
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
  identificacion: z.string()
    .min(5, {
      message: "La identificación del paciente debe tener al menos 5 carácteres"
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
    .min(3, {
      message: "El Diagnostico Principal debe tener almenos 10 carácteres"
    })
    .max(100, {
      message: "La escritura del diagnostico no puede exceder los 100 carácteres"
    }),
  nivel_autonomia: z.enum(['alta', 'media', 'baja']).optional()
})

export const ActPacienteSchema = z.object({
  
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
  nivel_autonomia: z.enum(['alta', 'baja', 'media']).optional(),
  imagen_paciente: z.string().optional(),
})

export const ActPaciente2 = z.object({
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
  identificacion: z.string()
    .min(5, {
      message: "La identificación del paciente debe tener al menos 5 carácteres"
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
})