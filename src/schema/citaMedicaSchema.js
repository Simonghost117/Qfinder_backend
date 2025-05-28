import { z } from "zod";

export const citaMedicaSchema = z.object({
  fecha_recordatorio: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Debe ser una fecha válida en formato ISO (YYYY-MM-DDTHH:MM:SSZ)",
  }),
  fecha_cita: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Debe ser una fecha válida en formato ISO (YYYY-MM-DDTHH:MM:SSZ)",
  }),
  titulo: z.string()
    .min(5, "Debe tener al menos 5 caracteres")
    .max(100, "Pasaste el límite de caracteres"),
  descripcion: z.string().optional(),
  estado_cita: z.enum(["programada", "completada", "cancelada"]),
}).superRefine((data, ctx) => {
  const fechaRecordatorio = new Date(data.fecha_recordatorio);
  const fechaCita = new Date(data.fecha_cita);

  if (fechaRecordatorio >= fechaCita) {
    ctx.addIssue({
      path: ['fecha_recordatorio'],
      code: z.ZodIssueCode.custom,
      message: "La fecha de recordatorio debe ser anterior a la fecha de cita",
    });
  }
});
