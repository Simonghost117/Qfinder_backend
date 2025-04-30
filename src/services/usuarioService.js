import Usuario from "../models/usuario.model.js";
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

// Configuración del transporter para emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Crea un nuevo usuario en el sistema
 */
export const createUser = async (userData) => {
  const hashedPassword = await bcrypt.hash(userData.contrasena_usuario, 10);
  
  return await Usuario.create({
    ...userData,
    contrasena_usuario: hashedPassword,
    estado_usuario: 'Inactivo',
    verificado: false
  });
};

/**
 * Genera y almacena un código de verificación para el usuario
 */
export const generateAndStoreCode = async (correo_usuario) => {
  const codigo = crypto.randomInt(1000, 9999).toString();
  const expiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
  
  await Usuario.update({
    codigo_verificacion: codigo,
    codigo_expiracion: expiracion
  }, {
    where: { correo_usuario }
  });
  
  return codigo;
};

/**
 * Verifica el código de confirmación del usuario
 */
export const verifyCode = async (correo_usuario, codigo) => {
  const usuario = await Usuario.findOne({
    where: { correo_usuario }
  });
  
  if (!usuario) {
    return { valid: false, message: 'Usuario no encontrado' };
  }
  
  if (usuario.verificado) {
    return { valid: false, message: 'El usuario ya está verificado' };
  }
  
  if (new Date() > usuario.codigo_expiracion) {
    return { valid: false, message: 'Código expirado' };
  }
  
  if (usuario.codigo_verificacion !== codigo) {
    return { valid: false, message: 'Código incorrecto' };
  }
  
  // Marcar como verificado
  await usuario.update({
    verificado: true,
    estado_usuario: 'Activo',
    codigo_verificacion: null,
    codigo_expiracion: null
  });
  
  return { valid: true, usuario };
};

/**
 * Envía el código de verificación por email
 */
export const sendVerificationEmail = async (correo_usuario, codigo) => {
  // Modo testing
  if (process.env.NODE_ENV === 'test') {
    console.log(`[TEST] Código para ${correo_usuario}: ${codigo}`);
    return { success: true };
  }

  try {
    await transporter.sendMail({
      from: `"Verificación" <${process.env.EMAIL}>`,
      to: correo_usuario,
      subject: 'Tu código de verificación',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Verificación de correo</h2>
          <p>Usa este código para completar tu registro:</p>
          <div style="background: #f3f4f6; padding: 16px; text-align: center; 
                      font-size: 24px; letter-spacing: 2px; margin: 24px 0;">
            ${codigo}
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Válido por 15 minutos. Si no lo solicitaste, ignora este mensaje.
          </p>
        </div>
      `
    });
    return { success: true };
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Autentica un usuario
 */
export const authenticateUser = async (correo_usuario, contrasena_usuario) => {
  const usuario = await Usuario.findOne({ 
    where: { correo_usuario } 
  });
  
  if (!usuario) {
    return { success: false, error: 'Usuario no encontrado' };
  }
  
  if (!usuario.verificado) {
    return { success: false, error: 'Cuenta no verificada' };
  }
  
  const isMatch = await bcrypt.compare(contrasena_usuario, usuario.contrasena_usuario);
  
  if (!isMatch) {
    return { success: false, error: 'Contraseña incorrecta' };
  }
  
  return { success: true, usuario };
};

// // Configuración del transporter (para Gmail)
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL,
//     pass: process.env.EMAIL_PASS
//   }
// });

// // Almacenamiento temporal de códigos (en producción usa Redis)
// const verificationCodes = new Map();

// export const sendVerificationCode = async (email) => {
//   // Si estamos en entorno de testing, no enviar correo real
//   if (process.env.NODE_ENV === 'test') {
//     const testCode = '9999';
//     verificationCodes.set(email, {
//       code: testCode,
//       expirationTime: Date.now() + 15 * 60 * 1000 // 15 minutos
//     });
//     return { success: true, isTest: true };
//   }

//   // Generar código de 4 dígitos
//   const code = crypto.randomInt(1000, 9999).toString();
//   const expirationTime = Date.now() + 15 * 60 * 1000; // 15 minutos

//   // Guardar código temporalmente
//   verificationCodes.set(email, { code, expirationTime });

//   // Configurar el correo electrónico
//   const mailOptions = {
//     from: `"Verificación" <${process.env.EMAIL}>`,
//     to: email,
//     subject: 'Tu código de verificación',
//     html: `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2 style="color: #2563eb;">Verificación de correo electrónico</h2>
//         <p>Por favor utiliza el siguiente código para verificar tu correo:</p>
//         <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 24px; letter-spacing: 2px; margin: 24px 0;">
//           ${code}
//         </div>
//         <p>Este código expirará en 15 minutos.</p>
//         <p style="color: #6b7280; font-size: 14px;">Si no solicitaste este código, puedes ignorar este mensaje.</p>
//       </div>
//     `
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     return { success: true };
//   } catch (error) {
//     console.error('Error al enviar correo:', error);
//     return { success: false, error: 'Error al enviar el código de verificación' };
//   }
// };

// export const verifyCode = (email, code) => {
//   const record = verificationCodes.get(email);
  
//   if (!record) {
//     return { valid: false, message: 'No se encontró código para este email' };
//   }
  
//   if (Date.now() > record.expirationTime) {
//     verificationCodes.delete(email);
//     return { valid: false, message: 'Código expirado' };
//   }
  
//   if (record.code !== code) {
//     return { valid: false, message: 'Código incorrecto' };
//   }
  
//   // Código válido - eliminar de almacenamiento temporal
//   verificationCodes.delete(email);
//   return { valid: true };
// };

// export const createUser = async (
//   nombre_usuario,
//   apellido_usuario,
//   identificacion_usuario,
//   direccion_usuario,
//   telefono_usuario,
//   correo_usuario,
//   contrasena_usuario,
//   tipo_usuario
// ) => {
//   const salt = await bcrypt.genSalt(10);
//   const hashedPassword = await bcrypt.hash(contrasena_usuario, salt);

//   const usuario = await Usuario.create({
//     nombre_usuario,
//     apellido_usuario,
//     identificacion_usuario,
//     direccion_usuario,
//     telefono_usuario,
//     correo_usuario,
//     contrasena_usuario: hashedPassword,
//     tipo_usuario,
//   });

//   return usuario; // ✅ Esto está bien
// };
