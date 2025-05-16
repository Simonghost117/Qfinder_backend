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
        [Op.or]: [
          { correo_usuario: correo.trim().toLowerCase() },
          { correo: correo.trim().toLowerCase() }
        ]
      }
    });

    // Resto del código permanece igual...
    const token = jwt.sign(
      { 
        correo: usuario.correo_usuario, // Usamos correo_usuario para consistencia
        correo_usuario: usuario.correo_usuario // Doble referencia para compatibilidad
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    // Resto del código...
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

    // Búsqueda mejorada del usuario
    const usuario = await Usuario.findOne({
      where: { 
        [Op.or]: [
          { correo_usuario: decoded.correo?.trim().toLowerCase() },
          { correo: decoded.correo?.trim().toLowerCase() } // Por si acaso
        ]
      }
    });

    if (!usuario) {
      console.error('❌ Usuario no encontrado con correo:', decoded.correo);
      console.error('ℹ️ Campos buscados:', {
        correo_usuario: decoded.correo,
        correo: decoded.correo
      });
      return res.status(404).json({ 
        mensaje: 'Usuario no encontrado.',
        detalles: `Correo buscado: ${decoded.correo}`
      });
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


// import Usuario from '../models/usuario.model.js';
// import { sendRecoveryEmail } from '../libs/mailer.js';
// import { Op } from 'sequelize';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import dotenv from 'dotenv';
// dotenv.config();

// export const recuperarContrasena = async (req, res) => {
//   const { correo_usuario } = req.body;

//   try {
//     const usuario = await Usuario.findOne({
//       where: {
//         correo_usuario: {
//           [Op.eq]: correo_usuario
//         }
//       }
//     });

//     if (!usuario) {
//             console.warn('⚠️ Usuario no encontrado con el correo:', correo_usuario);
//       return res.status(404).json({ mensaje: 'Usuario no encontrado con ese correo.' });
//     }

//     // Generar código de 5 dígitos
//     const codigo = Math.floor(10000 + Math.random() * 90000).toString();
//     const expiracion = new Date(Date.now() + 10 * 60000); // 10 minutos

//     // Actualizar usuario con código y expiración
//     usuario.codigo_verificacion = codigo;
//     usuario.codigo_expiracion = expiracion;
//     await usuario.save();
//     console.log('✅ Código generado y guardado:', codigo, 'Expira en:', expiracion);
//     // Enviar correo
//     await sendRecoveryEmail(correo_usuario, codigo);

//     res.status(200).json({ mensaje: 'Código enviado al correo.' });
//   } catch (error) {
//     console.error('Error al recuperar contraseña:', error);
//     res.status(500).json({ mensaje: 'Error al enviar el código de recuperación.' });
//   }
// };

// export const cambiarContrasena = async (req, res) => {
//   const { nuevaContrasena } = req.body;
//   // const token = req.cookies.resetToken;
// const token = req.cookies.resetToken || 
//               req.headers['authorization']?.replace('Bearer ', '') || 
//               req.headers['x-reset-token'];
//   console.log('🔒 Token recibido en cambiarContrasena:', token);

//   try {
//     if (!token) {
//       console.warn('⚠️ Token no encontrado en cookies o headers');
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
// export const verificarCodigo = async (req, res) => {
//   const { correo, codigo } = req.body;
//   console.log('verificarCodigo', correo, codigo);

//   try {
//     const usuario = await Usuario.findOne({
//       where: {
//         correo_usuario: {
//           [Op.eq]: correo.trim().toLowerCase()
//         }
//       }
//     });
//     console.log('👤 Usuario encontrado:', usuario?.correo_usuario);

//     if (!usuario) {
//       return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
//     }

//     if (!usuario.codigo_verificacion || !usuario.codigo_expiracion) {
//       return res.status(400).json({ mensaje: 'No se ha solicitado recuperación.' });
//     }

//     const ahora = new Date();
  
//     if (String(usuario.codigo_verificacion) !== String(codigo)) {
//       return res.status(400).json({ mensaje: 'Código incorrecto.' });
//     }

//     if (ahora > new Date(usuario.codigo_expiracion)) {
//       console.warn('⏰ Código expirado:', usuario.codigo_expiracion);
//       return res.status(400).json({ mensaje: 'Código expirado.' });
//     }

//     const token = jwt.sign({ correo: usuario.correo_usuario }, process.env.JWT_SECRET, {
//       expiresIn: '10m'
//     });
//     console.log('🔐 Token generado:', token);
//     res.cookie('resetToken', token, {
//       httpOnly: true,
//       secure: false,
//       sameSite: 'strict',
//       maxAge: 10 * 60 * 1000
//     });
//     // Enviar el token en la cabecera Authorization
//       res.setHeader("Authorization", `Bearer ${token}`);

//     res.status(200).json({ mensaje: 'Código verificado correctamente.' });
//   } catch (error) {
//     console.error('Error al verificar código:', error);
//     res.status(500).json({ mensaje: 'Error al verificar el código.' });
//   }
// };

  
// // export const verificarCodigo = async (req, res) => {
// //   const { correo, codigo } = req.body;
// // console.log('verificarCodigo', correo, codigo);
// //   try {
// //     const usuario = await Usuario.findOne({ where: { correo_usuario: correo } });
// //     console.log('usuario', usuario);
// //     if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
// //     if (!usuario.codigo_verificacion || !usuario.codigo_expiracion)
// //       return res.status(400).json({ mensaje: 'No se ha solicitado recuperación.' });

// //     const ahora = new Date();
// //     if (usuario.codigo_verificacion !== codigo)
// //       return res.status(400).json({ mensaje: 'Código incorrecto.' });

// //     if (ahora > new Date(usuario.codigo_expiracion))
// //       return res.status(400).json({ mensaje: 'Código expirado.' });

// //     // ✅ Crear token JWT
// //     const token = jwt.sign({ correo: usuario.correo_usuario }, process.env.JWT_SECRET, { expiresIn: '10m' });

// //     // ✅ Establecer cookie HTTP-only
// //     res.cookie('resetToken', token, {
// //       httpOnly: true,
// //       secure: false, // 🔴 IMPORTANTE para desarrollo local (debe ser false si no estás en HTTPS)
// //       sameSite: 'strict',
// //       maxAge: 10 * 60 * 1000
// //     });

// //     res.status(200).json({ mensaje: 'Código verificado correctamente.' });
// //   } catch (error) {
// //     console.error('Error al verificar código:', error);
// //     res.status(500).json({ mensaje: 'Error al verificar el código.' });
// //   }
// // };