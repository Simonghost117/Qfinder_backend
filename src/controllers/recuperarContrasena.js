import Usuario from '../models/usuario.model.js';
import { sendRecoveryEmail } from '../libs/mailer.js';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// 🚨 Recuperar contraseña - generar y enviar código
export const recuperarContrasena = async (req, res) => {
  const { correo_usuario } = req.body;

  try {
    const usuario = await Usuario.findOne({
      where: {
        correo_usuario: { [Op.eq]: correo_usuario }
      }
    });

    if (!usuario) {
      console.warn('⚠️ Usuario no encontrado con el correo:', correo_usuario);
      return res.status(404).json({ mensaje: 'Usuario no encontrado con ese correo.' });
    }

    const codigo = Math.floor(10000 + Math.random() * 90000).toString();
    const expiracion = new Date(Date.now() + 10 * 60000); // 10 minutos

    usuario.codigo_verificacion = codigo;
    usuario.codigo_expiracion = expiracion;
    await usuario.save();

    console.log('✅ Código generado:', codigo, 'Expira en:', expiracion);
    await sendRecoveryEmail(correo_usuario, codigo);

    return res.status(200).json({ mensaje: 'Código enviado al correo.' });
  } catch (error) {
    console.error('❌ Error en recuperarContrasena:', error);
    return res.status(500).json({ mensaje: 'Error al enviar el código de recuperación.' });
  }
};

// ✅ Verificar código enviado al correo
export const verificarCodigo = async (req, res) => {
  const { correo, codigo } = req.body;
  console.log('📨 Verificando código:', correo, codigo);

  try {
    const usuario = await Usuario.findOne({
      where: {
        correo_usuario: correo.trim().toLowerCase()
      }
    });

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    if (
      usuario.codigo_verificacion !== codigo ||
      new Date() > new Date(usuario.codigo_expiracion)
    ) {
      return res.status(400).json({ mensaje: 'Código inválido o expirado.' });
    }

    const token = jwt.sign(
      { correo_usuario: usuario.correo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    return res.status(200).json({ mensaje: 'Código verificado.', token });
  } catch (error) {
    console.error('❌ Error en verificarCodigo:', error);
    return res.status(500).json({ mensaje: 'Error al verificar el código.' });
  }
};

// 🔒 Cambiar contraseña usando el token
export const cambiarContrasena = async (req, res) => {
  const { nuevaContrasena } = req.body;

  const token = req.cookies.resetToken ||
                req.headers['authorization']?.replace('Bearer ', '') ||
                req.headers['x-reset-token'];

  console.log('🔐 Token recibido:', token);
  console.log('🔄 Headers recibidos:', req.headers);

  try {
    if (!token) {
      console.warn('⚠️ No se recibió token');
      return res.status(401).json({ mensaje: 'Token no encontrado.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 Token decodificado:', decoded);

    const usuario = await Usuario.findOne({
      where: {
        correo_usuario: decoded.correo_usuario?.trim().toLowerCase()
      }
    });

    if (!usuario) {
      console.error('❌ Usuario no encontrado con correo_usuario:', decoded.correo_usuario);
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    console.log('✅ Usuario encontrado:', usuario.id_usuario);

    const hash = await bcrypt.hash(nuevaContrasena, 10);
    usuario.contrasena_usuario = hash;
    usuario.codigo_verificacion = null;
    usuario.codigo_expiracion = null;

    await usuario.save();
    res.clearCookie('resetToken');

    return res.status(200).json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('❌ Error en cambiarContrasena:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ mensaje: 'Token inválido.' });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ mensaje: 'Token expirado.' });
    }

    return res.status(500).json({ mensaje: 'Error al cambiar la contraseña.' });
  }
};
