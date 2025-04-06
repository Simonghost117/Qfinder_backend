import jwt from 'jsonwebtoken';
import { createUser } from '../services/usuarioService.js';
import Usuario from '../models/usuario.model.js';
import { createAccessToken } from '../libs/jwt.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();
import { promisify } from 'util';

const verifyTokenAsync = promisify(jwt.verify);



export const register = async (req, res) => {

    try {

        const { nombre_usuario, correo_usuario, contrasena_usuario, tipo_usuario } = req.body;
    
        // Verificar si el usuario ya existe
        const usuarioExistente = await Usuario.findOne({ 
            where: { correo_usuario: correo_usuario } 
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
  