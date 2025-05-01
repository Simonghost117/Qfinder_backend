import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.model.js';
import { createAccessToken } from '../libs/jwt.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

import { medicoSchema } from '../schema/medicoSchema.js';
import Medico from '../models/Medico.js';
import { 
  generateAndStoreCode,
  verifyCode,
  sendVerificationEmail,
  clearPendingRegistration
} from '../services/usuarioService.js';

export const register = async (req, res) => {
  try {
    const { correo_usuario, ...userData } = req.body;
    
    // 1. Validar duplicados en BD (solo el correo)
    const existe = await Usuario.findOne({ where: { correo_usuario } });
    if (existe) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }
    
    // 2. Generar y almacenar código temporalmente
    const codigo = generateAndStoreCode(correo_usuario, userData);
    
    // 3. Enviar email (usar tu función existente)
    await sendVerificationEmail(correo_usuario, codigo);
    
    res.status(200).json({ 
      message: 'Código enviado. Verifica tu correo.',
      nextStep: '/verify'
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Error en registro', 
      details: error.message 
    });
  }
};

export const verifyUser = async (req, res) => {
  try {
    const { correo_usuario, codigo } = req.body;
    
    // 1. Verificar código
    const { valid, message, userData } = verifyCode(correo_usuario, codigo);
    if (!valid) {
      return res.status(400).json({ error: message });
    }
    
    // 2. Crear usuario
    const hashedPassword = await bcrypt.hash(userData.contrasena_usuario, 10);
    const usuario = await Usuario.create({
      ...userData,
      correo_usuario,
      contrasena_usuario: hashedPassword,
      estado_usuario: 'Activo'
    });
    
    // 3. Perfil médico si aplica
    if (usuario.tipo_usuario === 'Medico') {
      await Medico.create({
        id_usuario: usuario.id_usuario,
        especialidad: userData.especialidad,
        licencia: userData.licencia
      });
    }
    
    // 4. Generar token
    const token = jwt.sign(
      { id: usuario.id_usuario, rol: usuario.tipo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    console.log("Token generado:", token);

    res.cookie('token', token);
    
    res.status(201).json({
      message: 'Registro completado exitosamente',
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre_usuario,
        correo: usuario.correo_usuario,
        tipo: usuario.tipo_usuario
      },
      token
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Error en verificación',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


export const login = async (req, res) => {
    try {
       
        const { correo_usuario, contrasena_usuario } = req.body;
        
        // Buscar usuario en la base de datos
        const usuario = await Usuario.findOne({ 
          where: { correo_usuario: correo_usuario } 
        });
        
        if (!usuario) {
          return res.status(401).json({ error: "Credenciales incorrectas (usuario no registrado)" });
        }
        
        // Verificar la contraseña
        const contrasenaValida = await bcrypt.compare(contrasena_usuario, usuario.contrasena_usuario);
        if (!contrasenaValida) {
          return res.status(401).json({ error: "Credenciales incorrectas (contraseña invalida)" });
        }
        console.log("user", contrasenaValida);
        
        // Generar token JWT
        const token = jwt.sign(
          { id: usuario.id_usuario, rol: usuario.tipo_usuario },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );
        console.log("Token generado:", token);

        res.cookie('token', token);
        
        res.json({ rol: usuario.tipo_usuario, email: usuario.correo_usuario, token });
        console.log(process.env.JWT_SECRET);
      } catch (error) {
        return res.status(500).json({ message: error.message });
        }  
};

export const logout = async (req, res) => {
    res.cookie("token", "", {
      httpOnly: true,
      secure: true,
      expires: new Date(0),
    });
    return res.status(200).json({ message: "Logout exitoso" });
  };

export const listarUsers = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll();
        res.status(200).json(usuarios.map(usuario => ({
            id_usuario: usuario.id_usuario,
            nombre_usuario: usuario.nombre_usuario,
            apellido_usuario: usuario.apellido_usuario,
            identificacion_usuario: usuario.identificacion_usuario,
            direccion_usuario: usuario.direccion_usuario,
            telefono_usuario: usuario.telefono_usuario,
            correo_usuario: usuario.correo_usuario,
            tipo_usuario: usuario.tipo_usuario,
            estado_usuario: usuario.estado_usuario
        })
    ));
    } catch (error) {
        res.status(500).json({ message: 'Error al listar los usuarios', error });
    }
};

export const actualizarUser = async (req, res) => {
  try {
    const { nombre_usuario, apellido_usuario, direccion_usuario, telefono_usuario, correo_usuario, contrasena_usuario } = req.body;

    // Obtener el id del usuario autenticado desde el token
    const { id } = req.usuario; // Esto asume que el middleware verifyToken adjunta el id al req.usuario
    console.log("Contenido de req.usuario:", req.usuario);

    // Verificar si el usuario existe
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const dataToUpdate = { nombre_usuario, apellido_usuario, direccion_usuario, telefono_usuario, correo_usuario };
    if (contrasena_usuario) {
      const salt = await bcrypt.genSalt(10); // Hashear contraseña si fue proporcionada
      dataToUpdate.contrasena_usuario = await bcrypt.hash(contrasena_usuario, salt);
    }

    // Actualizar el usuario autenticado
    await Usuario.update(dataToUpdate, {
      where: { id_usuario: id },
    });

    res.status(200).json({ message: 'Información del usuario actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar el usuario:',  error);
    res.status(500).json({ message: 'Error al actualizar el usuario', error });
  }
};

export const eliminarUser = async (req, res) => {
    try {
        const { id } = req.usuario; // Obtener el id del usuario autenticado desde el token

        // Verificar si el usuario existe
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Eliminar el usuario autenticado
        await Usuario.destroy({
            where: { id_usuario: id },
        });

        res.status(200).json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar el usuario:', error);
        res.status(500).json({ message: 'Error al eliminar el usuario', error });
    }
};