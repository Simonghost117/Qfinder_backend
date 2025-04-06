import jwt from 'jsonwebtoken';
import { createUser } from '../services/usuario.service.js';
import { Usuario } from '../models/index.js';

export const register = async (req, res) => {
  try {
    const { nombre_usuario, correo_usuario, contrasena_usuario, tipo_usuario } = req.body;

    // 🔍 Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({
      where: { correo_usuario }
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    // 👤 Crear el usuario y obtener el token ya generado
    const { usuario, token } = await createUser(
      nombre_usuario,
      correo_usuario,
      contrasena_usuario,
      tipo_usuario
    );

    // 🍪 Enviar el token como cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // cambia a true en producción con HTTPS
      sameSite: 'Lax'
    });

    // 📦 Respuesta al cliente
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      id: usuario.id_usuario,
      username: usuario.nombre_usuario,
      email: usuario.correo_usuario,
      tipo_usuario: usuario.tipo_usuario,
      token
    });

  } catch (error) {
    console.error('❌ Error en register:', error);
    res.status(500).json({ message: 'Error al registrar el usuario', error });
  }
};
