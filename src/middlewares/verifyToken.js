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

export const verifyTokenWeb = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    console.log('🔐 Cookie token:', token);
    console.log('📦 Todas las cookies:', req.cookies);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no encontrado en las cookies'
      });
    }

    // Decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_por_defecto_solo_desarrollo');
    console.log('🧾 Token decodificado:', decoded);
    req.usuario = decoded;

    // Buscar usuario por ID
    const usuario = await Usuario.findByPk(decoded.id, {
      attributes: ['id_usuario', 
        'tipo_usuario', 
        'estado_usuario']
    });
    console.log('👤 Usuario encontrado:', usuario?.dataValues || null);

    if (!usuario || usuario.estado_usuario !== 'Activo') {
      return res.status(401).json({
        success: false,
        message: 'Usuario no existe o está inactivo'
      });
    }

    req.user = {
      id_usuario: usuario.id_usuario,
      tipo_usuario: usuario.tipo_usuario
    };
    console.log('✅ Token válido. Usuario autorizado:', {
        id: usuario.id_usuario,
        tipo: usuario.tipo_usuario
      });
      
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expirado', expiredAt: error.expiredAt });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    return res.status(500).json({ success: false, message: 'Error al verificar autenticación', error: error.message });
  }
};