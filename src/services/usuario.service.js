import { Usuario } from "../models/index.js";
import bcrypt from 'bcrypt';
import { sequelize, config, generateToken } from '../config/database.js';

export const createUser = async (nombre_usuario, correo_usuario, contrasena_usuario, tipo_usuario) => {
    try {
        // Verificar si el usuario ya existe
        const existeUsuario = await Usuario.findOne({ 
            where: { correo_usuario } 
        });
        
        if (existeUsuario) {
            throw new Error('El correo electrónico ya está registrado');
        }

        // Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(contrasena_usuario, salt);
        
        // Crear el usuario
        const usuario = await Usuario.create({
            nombre_usuario,
            correo_usuario,
            contrasena_usuario: hashedPassword,
            tipo_usuario,
            estado_usuario: 'Activo',
            fecha_creacion: new Date()
        });

        // Generar token JWT
        const token = generateToken({
            id: usuario.id_usuario,
            tipo_usuario: usuario.tipo_usuario
        });

        // Retornar datos del usuario (sin contraseña)
        return {
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre_usuario: usuario.nombre_usuario,
                correo_usuario: usuario.correo_usuario,
                tipo_usuario: usuario.tipo_usuario,
                estado_usuario: usuario.estado_usuario
            },
            token
        };

    } catch (error) {
        console.error('Error en createUser:', error);
        throw error;
    }
};

export const loginUser = async (correo_usuario, contrasena_usuario) => {
    try {
        // Buscar usuario por correo
        const usuario = await Usuario.findOne({ 
            where: { correo_usuario } 
        });

        if (!usuario) {
            throw new Error('Credenciales inválidas');
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(
            contrasena_usuario, 
            usuario.contrasena_usuario
        );
        
        if (!validPassword) {
            throw new Error('Credenciales inválidas');
        }

        // Generar token JWT
        const token = generateToken({
            id: usuario.id_usuario,
            tipo_usuario: usuario.tipo_usuario
        });

        // Retornar datos del usuario (sin contraseña)
        return {
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre_usuario: usuario.nombre_usuario,
                correo_usuario: usuario.correo_usuario,
                tipo_usuario: usuario.tipo_usuario,
                estado_usuario: usuario.estado_usuario
            },
            token
        };

    } catch (error) {
        console.error('Error en loginUser:', error);
        throw error;
    }
};