import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.model.js';
import { auth } from '../config/firebase-admin.js';

export const verifyToken = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    try {
        // Verificación del token JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded;

        // Cache básico para evitar consultas repetidas a la base de datos
        if (!req.app.locals.userCache) req.app.locals.userCache = {};
        if (req.app.locals.userCache[decoded.id]) {
            req.user = req.app.locals.userCache[decoded.id];
            return next();
        }

        // Buscar usuario en base de datos
        const usuario = await Usuario.findByPk(decoded.id, {
            attributes: ['id_usuario', 'tipo_usuario', 'estado_usuario', 'correo_usuario', 'nombre_usuario'],
            raw: true
        });

        if (!usuario || usuario.estado_usuario !== 'Activo') {
            return res.status(401).json({ success: false, message: 'Usuario no válido' });
        }

        // Sincronizar con Firebase Auth (solo si es necesario)
        try {
            await auth.getUserByEmail(usuario.correo_usuario);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                await auth.createUser({
                    uid: `ext_${usuario.id_usuario}`,
                    email: usuario.correo_usuario,
                    displayName: usuario.nombre_usuario || 'Usuario',
                    disabled: false
                });
            }
        }

        // Preparar objeto de usuario para la request
        req.user = {
            id_usuario: usuario.id_usuario,
            tipo_usuario: usuario.tipo_usuario,
            correo: usuario.correo_usuario
        };

        // Almacenar en cache
        req.app.locals.userCache[decoded.id] = req.user;
        
        next();
    } catch (error) {
        console.error('Error en verifyToken:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expirado' });
        }
        
        return res.status(401).json({ 
            success: false, 
            message: 'Token inválido',
            error: error.message
        });
    }
};