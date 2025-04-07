import Usuario  from "../models/usuario.model.js";
import bcrypt from 'bcrypt';


export const createUser = async ( nombre_usuario, apellido_usuario, identificacion_usuario, direccion_usuario, telefono_usuario, correo_usuario, contrasena_usuario, tipo_usuario ) => {

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena_usuario, salt);
    
    const usuario = await Usuario.create({
        nombre_usuario,
        apellido_usuario,
        identificacion_usuario,
        direccion_usuario,
        telefono_usuario,
        correo_usuario,
        contrasena_usuario: hashedPassword,
        tipo_usuario
    });
    

    return usuario;
};