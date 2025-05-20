import { models } from '../models/index.js';
const { UsuarioRed } = models;

export const esAdministradorRed = async (req, res, next) => {
    try {
        const { id_usuario } = req.user; 
        const { id_red } = req.params; 

        // Buscar la membresía del usuario en la red
        const membresia = await UsuarioRed.findOne({
            where: {
                id_usuario,
                id_red
            }
        });
        console.log("Consulta membresia", membresia)

        // Verificar si el usuario es administrador
        if (!membresia || membresia.rol !== 'administrador') {
            console.log('Acceso denegado: El usuario no es administrador de la red');
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado: Se requieren privilegios de administrador'
            });
        }

        // Si es administrador, continuar con la siguiente función
        next();
    } catch (error) {
        console.error('Error en middleware esAdministradorRed:', error);
        res.status(500).json({
            success: false,
            error: 'Error al verificar permisos de administrador'
        });
    }
};

