// validators/reporteSalud.validator.js
import { z } from 'zod';

const sintomasOptions = [
    'fiebre', 'dolor', 'mareos', 'nauseas', 'convulsiones',
    'confusion', 'ansiedad', 'irritabilidad', 'alucinaciones',
    'dificultad_respirar', 'dolor_pecho', 'perdida_conocimiento'
];

export const observacionSchema = z.object({
    sintomas: z.array(z.enum(sintomasOptions)).min(1, {
        message: 'Debe seleccionar al menos un síntoma'
    }),
    descripcion: z.string().min(10, {
        message: 'La descripción debe tener al menos 10 caracteres'
    }).max(500),
    severidad: z.number().int().min(1).max(10).optional().default(3),
    intervenciones: z.string().optional(),
    observaciones: z.string().optional()
});

export const datosDispositivoSchema = z.object({
    tipo_dispositivo: z.enum(['smartwatch', 'monitor_convulsiones', 'sensor_caidas', 'otro']),
    datos: z.record(z.any()).refine(data => {
        // Validación básica según tipo de dispositivo
        if (data.tipo_dispositivo === 'smartwatch' && !data.heartRate) {
            return false;
        }
        if (data.tipo_dispositivo === 'monitor_convulsiones' && !data.eventDetected) {
            return false;
        }
        return true;
    }, {
        message: 'Datos del dispositivo incompletos o inválidos'
    }),
    timestamp: z.coerce.date().optional().default(new Date())
});