import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail', // Puedes usar otro proveedor (Outlook, Mailtrap, etc.)
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

export const sendRecoveryEmail = async (to, code) => {
  const mailOptions = {
    from: `"QFinder Soporte" <${process.env.EMAIL}>`,
    to,
    subject: 'Recuperación de contraseña - QFinder',
    html: `
      <p>Hola,</p>
      <p>Has solicitado recuperar tu contraseña. Usa el siguiente código para continuar:</p>
      <h2>${code}</h2>
      <p>Este código expirará en 10 minutos.</p>
      <p>Si no solicitaste esto, puedes ignorar este correo.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Correo enviado a ${to}`);
  } catch (error) {
    console.error('Error al enviar correo:', error);
    throw new Error('No se pudo enviar el correo');
  }
};
