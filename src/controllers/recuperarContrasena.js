import Usuario from '../models/usuario.model.js';
import { sendRecoveryEmail } from '../libs/mailer.js';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const recuperarContrasena = async (req, res) => {
  const { correo_usuario } = req.body;

  try {
    const usuario = await Usuario.findOne({
      where: {
        correo_usuario: {
          [Op.eq]: correo_usuario
        }
      }
    });

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado con ese correo.' });
    }

    // Generar código de 5 dígitos
    const codigo = Math.floor(10000 + Math.random() * 90000).toString();
    const expiracion = new Date(Date.now() + 10 * 60000); // 10 minutos

    // Actualizar usuario con código y expiración
    usuario.codigo_verificacion = codigo;
    usuario.codigo_expiracion = expiracion;
    await usuario.save();

    // Enviar correo
    await sendRecoveryEmail(correo_usuario, codigo);

    res.status(200).json({ mensaje: 'Código enviado al correo.' });
  } catch (error) {
    console.error('Error al recuperar contraseña:', error);
    res.status(500).json({ mensaje: 'Error al enviar el código de recuperación.' });
  }
};

export const cambiarContrasena = async (req, res) => {
  const { nuevaContrasena } = req.body;
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];


  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const correo = decoded.correo;

    const usuario = await Usuario.findOne({ where: { correo_usuario: correo } });

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    const hash = await bcrypt.hash(nuevaContrasena, 10);
    usuario.contrasena_usuario = hash;
    usuario.codigo_verificacion = null;
    usuario.codigo_expiracion = null;

    await usuario.save();

    // ✅ Eliminar cookie después de uso
    res.clearCookie('token');

    res.status(200).json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return res.status(401).json({ mensaje: 'Token inválido o expirado.' });
  }
};

// export const cambiarContrasena = async (req, res) => {
//   const { nuevaContrasena } = req.body;
//   const token = req.cookies.resetToken;

//   try {
//     if (!token) {
//       return res.status(401).json({ mensaje: 'Token no encontrado en cookies.' });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const correo = decoded.correo;

//     const usuario = await Usuario.findOne({ where: { correo_usuario: correo } });

//     if (!usuario) {
//       return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
//     }

//     const hash = await bcrypt.hash(nuevaContrasena, 10);
//     usuario.contrasena_usuario = hash;
//     usuario.codigo_verificacion = null;
//     usuario.codigo_expiracion = null;

//     await usuario.save();

//     // ✅ Eliminar cookie después de uso
//     res.clearCookie('resetToken');

//     res.status(200).json({ mensaje: 'Contraseña actualizada correctamente.' });
//   } catch (error) {
//     console.error('Error al cambiar contraseña:', error);
//     return res.status(401).json({ mensaje: 'Token inválido o expirado.' });
//   }
// };

  
export const verificarCodigo = async (req, res) => {
  const { correo, codigo } = req.body;

  try {
    const usuario = await Usuario.findOne({ where: { correo_usuario: correo } });

    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    if (!usuario.codigo_verificacion || !usuario.codigo_expiracion)
      return res.status(400).json({ mensaje: 'No se ha solicitado recuperación.' });

    const ahora = new Date();
    if (usuario.codigo_verificacion !== codigo)
      return res.status(400).json({ mensaje: 'Código incorrecto.' });

    if (ahora > new Date(usuario.codigo_expiracion))
      return res.status(400).json({ mensaje: 'Código expirado.' });

    // ✅ Crear token JWT
    const token = jwt.sign({ id: usuario.id_usuario, correo: usuario.correo_usuario }, process.env.JWT_SECRET, { expiresIn: '10m' });

    // ✅ Establecer cookie HTTP-only
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // 🔴 IMPORTANTE para desarrollo local (debe ser false si no estás en HTTPS)
      sameSite: 'strict',
      maxAge: 10 * 60 * 1000
    });
    // Enviar el token en la cabecera Authorization
      res.setHeader("Authorization", `Bearer ${token}`);

    res.status(200).json({ mensaje: 'Código verificado correctamente.', token });
  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({ mensaje: 'Error al verificar el código.' });
  }
};