import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configuración para producción (usando SMTP real)
const productionConfig = {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false // Solo para desarrollo/testing
    }
};

// Configuración para desarrollo (Mailtrap o similar)
const developmentConfig = {
    host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
    port: process.env.EMAIL_PORT || 2525,
    auth: {
        user: process.env.EMAIL_USER || 'tu_usuario_mailtrap',
        pass: process.env.EMAIL_PASSWORD || 'tu_password_mailtrap'
    }
};

export const transporter = nodemailer.createTransport(
    process.env.NODE_ENV === 'production' ? productionConfig : developmentConfig
);

// Función para verificar la conexión (opcional)
export const verifyEmailConnection = async () => {
    try {
        await transporter.verify();
        console.log('Conexión con el servidor de email establecida');
    } catch (error) {
        console.error('Error al conectar con el servidor de email:', error);
    }
};