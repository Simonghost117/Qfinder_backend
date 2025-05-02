import { z } from 'zod';

export const registerSchema = z.object({
    nombre_usuario: z.string()
        .min(1, { message: "El nombre es obligatorio" })
        .max(255, { message: "El nombre no puede exceder los 255 caracteres" }),
    apellido_usuario: z.string()
        .min(1, { message: "El apellido es obligatorio" })
        .max(255, { message: "El apellido no puede exceder los 255 caracteres" }),
    identificacion_usuario: z.string()
        .min(1, { message: "La identificación es obligatoria" })
        .max(25, { message: "La identificación no puede exceder los 25 caracteres" }),
    direccion_usuario: z.string()
        .min(1, { message: "La dirección es obligatoria" })
        .max(255, { message: "La dirección no puede exceder los 255 caracteres" }),
    telefono_usuario: z.string()
        .min(1, { message: "El teléfono es obligatorio" })
        .max(50, { message: "El teléfono no puede exceder los 50 caracteres" }),
    correo_usuario: z.string()
        .email({ message: "El correo electrónico debe tener un formato válido" }),
    contrasena_usuario: z.string()
        .min(8, { message: "La contraseña debe tener al menos 8 caracteres" }), 
    /*tipo_usuario: z.enum(['Usuario', 'Medico', 'Administrador'], {
        message: "El tipo de usuario debe ser 'Usuario', 'Medico' o 'Administrador'",
    }),*/
    estado_usuario: z.enum(['Activo', 'Inactivo']).optional(), // Opcional porque tiene un valor por defecto
    createdAt: z.date().optional(), 
    updatedAt: z.date().optional(),
});

export const loginSchema = z.object({
    correo_usuario: z.string()
        .email({ message: "El correo electrónico debe tener un formato válido" }),
    contrasena_usuario: z.string()
        .min(8, { message: "La contraseña debe tener al menos 8 caracteres" }),
});

export const updateSchema = z.object({
    nombre_usuario: z.string()
        .min(1, { message: "El nombre de usuario es obligatorio" })
        .max(255, { message: "El nombre de usuario no puede exceder los 255 caracteres" }),
    apellido_usuario: z.string()
        .min(1, { message: "El apellido de usuario es obligatorio" })
        .max(255, { message: "El apellido de usuario no puede exceder los 255 caracteres" }),
    direccion_usuario: z.string()
        .min(1, { message: "La dirección es obligatoria" })
        .max(255, { message: "La dirección no puede exceder los 255 caracteres" }),
    telefono_usuario: z.string()
        .min(1, { message: "El teléfono es obligatorio" })
        .max(50, { message: "El teléfono no puede exceder los 50 caracteres" }),
    correo_usuario: z.string()
        .email({ message: "El correo electrónico debe tener un formato válido" }),
    contrasena_usuario: z.string()
        .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
        .max(255, { message: "La contraseña no puede exceder los 255 caracteres" }),
});
