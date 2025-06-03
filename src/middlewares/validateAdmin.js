export const validateAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            console.error('Error en validateAdmin: No se encontró información de usuario en la solicitud');
            return res.status(401).json({
                success: false,
                error: 'No autenticado: Información de usuario no disponible',
                code: 'UNAUTHENTICATED'
            });
        }
        const { tipo_usuario } = req.user; // Obtener el tipo de usuario del token
        
        // Verificar si el usuario es administrador
        if (tipo_usuario !== 'Administrador') {
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado: Se requieren privilegios de administrador'
            });
        }
        next();
    } catch (error) {
        console.error('Error en middleware validateAdmin:', error);
        res.status(500).json({
            success: false,
            error: 'Error al verificar permisos de administrador'
        });
    }
}