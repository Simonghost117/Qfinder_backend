import  {auth}  from '../config/firebase-admin.js';
import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.model.js';

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token no encontrado' });
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;

    // Buscar usuario en base de datos
    const usuario = await Usuario.findByPk(decoded.id, {
      attributes: ['id_usuario', 'tipo_usuario', 'estado_usuario', 'correo_usuario']
    });

    if (!usuario || usuario.estado_usuario !== 'Activo') {
      return res.status(401).json({ success: false, message: 'Usuario no válido' });
    }

    // Sincronizar con Firebase Auth
    /*try {
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
    }*/

    req.user = {
      id_usuario: usuario.id_usuario,
      tipo_usuario: usuario.tipo_usuario,
      correo: usuario.correo_usuario
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expirado' });
    }
    res.status(500).json({ success: false, message: 'Error de autenticación', error: error.message });
  }
};