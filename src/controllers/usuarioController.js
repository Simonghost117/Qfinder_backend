import jwt from 'jsonwebtoken';
import { createUser } from '../services/usuarioService.js';
import Usuario from '../models/usuario.model.js';
import { createAccessToken } from '../libs/jwt.js';


export const register = async (req, res) => {

    try {

        const { nombre_usuario, correo_usuario, contrasena_usuario, tipo_usuario } = req.body;
    
        // Verificar si el usuario ya existe
        const usuarioExistente = await Usuario.findOne({ 
            where: { correo_usuario: contrasena_usuario } 
          });
          
        if (usuarioExistente) {
            return res.status(400).json({ error: "El correo ya está registrado" });
        }

        const usuario = await createUser(
            nombre_usuario,
            correo_usuario,
            contrasena_usuario,
            tipo_usuario
        );
        const token = await createAccessToken({
            id: usuario._id_usuario,
        });
  
        res.cookie("token", token, {
            httpOnly: process.env.NODE_ENV !== "development",
            secure: true,
            sameSite: "none",
        });
  
        res.status(201).json({ message: 'Usuario registrado exitosamente', 
            id: usuario._id_usuario,
            username: usuario.nombre_usuario,
            email: usuario.correo_usuario, 
            tipo_usuario: usuario.tipo_usuario,
            token: token,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar el usuario', error });

    }
};