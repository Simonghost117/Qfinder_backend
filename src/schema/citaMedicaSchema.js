import { z } from "zod";

export const citaMedicaSchema = z.object({
    fecha_cita: z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Debe ser una fecha válida en formato ISO (YYYY-MM-DDTHH:MM:SSZ)"
    }),
    motivo_cita: z.string().min(5, "Debe tener al menos 5 caracteres"),
    resultado_consulta: z.string().optional(), // Puede ser nulo
    estado_cita: z.enum(["programada", "completada", "cancelada"]) // Solo acepta estos valores
});