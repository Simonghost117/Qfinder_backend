import { z } from 'zod';

const UsuarioSchema = z.object({
    nombre_usuario: z.string()
        .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
        .max(255, { message: "El nombre de usuario no puede exceder los 255 caracteres" }),
    correo_usuario: z.string()
        .email({ message: "El correo electrónico debe tener un formato válido" }),
    contrasena_usuario: z.string()
        .min(8, { message: "La contraseña debe tener al menos 8 caracteres" }),
    tipo_usuario: z.enum(['Usuario', 'Medico', 'Administrador'], { 
        message: "Tipo de usuario no válido" 
    }),
    estado_usuario: z.enum(['Activo', 'Inactivo']).optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional()
});

export default UsuarioSchema;