// middleware/auth.js
import jwt from 'jsonwebtoken';
export const verifyToken1 = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Cache básico para evitar consultas repetidas
        if (!req.app.locals.userCache) req.app.locals.userCache = {};
        if (req.app.locals.userCache[decoded.id]) {
            req.user = req.app.locals.userCache[decoded.id];
            return next();
        }

        const usuario = await Usuario.findByPk(decoded.id, {
            attributes: ['id_usuario', 'tipo_usuario', 'estado_usuario'],
            raw: true
        });

        if (!usuario || usuario.estado_usuario !== 'Activo') {
            return res.status(401).json({ success: false, message: 'Usuario no válido' });
        }

        req.user = usuario;
        req.app.locals.userCache[decoded.id] = usuario;
        next();
    } catch (error) {
        console.error('Error en verifyToken:', error);
        return res.status(401).json({ 
            success: false, 
            message: error.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido'
        });
    }
};