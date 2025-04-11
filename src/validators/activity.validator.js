import { z } from "zod";

export const createActivitySchema = z.object({
  id_paciente: z.number({
    required_error: "El id_paciente es requerido",
    invalid_type_error: "El id_paciente debe ser un número",
  }),
  id_usuario_registra: z.number({
    required_error: "El id_usuario_registra es requerido",
    invalid_type_error: "El id_usuario_registra debe ser un número",
  }),
  tipo_actividad: z.string().nonempty("El tipo de actividad es requerido"),
  descripcion: z.string().nonempty("La descripción es requerida"),
  fecha_hora_inicio: z.coerce.date({
    required_error: "La fecha_hora_inicio es requerida",
    invalid_type_error: "La fecha_hora_inicio debe ser un formato válido de fecha",
  }),
  fecha_hora_fin: z.coerce.date({
    required_error: "La fecha_hora_fin es requerida",
    invalid_type_error: "La fecha_hora_fin debe ser un formato válido de fecha",
  }),
  estado: z.string().nonempty("El estado es requerido"),
  observaciones: z.string().optional(),
});
