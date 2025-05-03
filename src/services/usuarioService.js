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

// Almacenamiento temporal en memoria
const tempStorage = new Map();

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
 * Combinación de ambas versiones:
 * - Recibe userData de HEAD
 * - Genera código de 5 dígitos de moriones
 * - Mantiene ambos sistemas de expiración
 */
export const generateAndStoreCode = (correo_usuario, userData) => {
  // Versión moriones: código de 5 dígitos y expiración Date
  const codigo = crypto.randomInt(10000, 99999).toString();
  const expiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
  
  // Versión HEAD: almacena userData y timestamp
  tempStorage.set(correo_usuario, {
    userData,
    codigo,
    expiracion,    // Nuevo de moriones
    timestamp: Date.now() // Original de HEAD
  });
  
  return codigo;
};

/**
 * Verifica el código de validación
 * Combina verificación de ambas versiones
 */
export const verifyCode = (correo_usuario, codigo) => {
  const storedData = tempStorage.get(correo_usuario);
  
  if (!storedData) {
    return { valid: false, message: 'Registro no encontrado' };
  }
  
  // Verificar expiración con ambos métodos
  const expiroPorTimestamp = (Date.now() - storedData.timestamp) > 15 * 60 * 1000;
  const expiroPorFecha = new Date() > storedData.expiracion;
  
  if (expiroPorTimestamp || expiroPorFecha) {
    tempStorage.delete(correo_usuario);
    return { valid: false, message: 'Código expirado' };
  }
  
  if (storedData.codigo !== codigo) {
    return { valid: false, message: 'Código incorrecto' };
  }
  
  // Retornar datos del usuario para creación
  return { 
    valid: true,
    userData: storedData.userData 
  };
};

/**
 * Envía el código de verificación por email
 * Versión actualizada con código de 5 dígitos
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
 * (Mantenido igual de HEAD)
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

/**
 * Limpieza de almacenamiento temporal
 * (Conserva ambos nombres de función comentados)
 */
// export const cleanTempStorage = (correo_usuario) => {
//   tempStorage.delete(correo_usuario);
// };

export const clearPendingRegistration = (correo_usuario) => {
  tempStorage.delete(correo_usuario);
};

// Sección de código comentado preservado
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

// ... (resto de código comentario preservado)