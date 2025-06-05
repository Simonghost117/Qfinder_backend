import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.model.js';
import { createAccessToken } from '../libs/jwt.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { manejarImagenes } from '../utils/imgBase64.js';
dotenv.config();


// import { medicoSchema } from '../schema/medicoSchema.js';
// import Medico from '../models/Medico.js';

import { 
  generateAndStoreCode,
  verifyCode,
  sendVerificationEmail,
  clearPendingRegistration,
  buscarNombre
} from '../services/usuarioService.js';
import { or } from 'sequelize';

export const register = async (req, res) => {
  try {
    const { correo_usuario, ...userData } = req.body;
    
    // 1. Validar duplicados en BD (solo el correo)
    const existe = await Usuario.findOne({ where: { correo_usuario } });
    if (existe) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    const idExiste = await Usuario.findOne({ where: { identificacion_usuario: userData.identificacion_usuario } });
    if (idExiste) {
      return res.status(400).json({ error: 'El número de identificación ya está registrado' });
    }

    // if (userData.tipo_usuario === 'Medico') {
    //   const result = medicoSchema.safeParse({
    //     especialidad: userData.especialidad,
    //     licencia: userData.licencia
    //   });

    //   if (!result.success) {
    //     // Extraer el primer mensaje de error
    //     const errorMessage = result.error.issues[0].message;
    //     return res.status(400).json({ error: "Error en el registro del Medico, ingrese los datos requeridos", details: errorMessage });
    //   }
    // }
    
    // 2. Generar y almacenar código temporalmente

    // 2. Validación de médico (comentario preservado de ambas versiones)
    /*if (userData.tipo_usuario === 'Medico') {
      const validation = medicoSchema.safeParse({
        especialidad: userData.especialidad,
        licencia: userData.licencia
      });
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }
    }*/


    // 3. Generar y almacenar código temporalmente (versión HEAD)
    const codigo = generateAndStoreCode(correo_usuario, userData);
    
    // 4. Enviar email (combinación de ambas implementaciones)
    await sendVerificationEmail(correo_usuario, codigo);
    
    res.status(200).json({ 
      message: 'Código enviado. Verifica tu correo.',
      nextStep: '/verify',
      // Preservar formato de respuesta de ambas versiones
      user: {
        correo: correo_usuario
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Error en registro', 
      details: error.message 
    });
  }
};

export const verifyUser = async (req, res) => {
  console.log(req.body)
  try {
    const { correo_usuario, codigo } = req.body;
    
    // 1. Verificar código (versión HEAD modificada)
    const { valid, message, userData } = verifyCode(correo_usuario, codigo);
    if (!valid) {
      return res.status(400).json({ error: message });
    }

   
    
    // 2. Crear usuario con contraseña hasheada
    const hashedPassword = await bcrypt.hash(userData.contrasena_usuario, 10);
    const usuario = await Usuario.create({
      ...userData,
      correo_usuario,
      contrasena_usuario: hashedPassword,
      tipo_usuario: userData.tipo_usuario || 'Usuario', // De HEAD
      estado_usuario: 'Activo' // De HEAD
    });
    
    // 4. Generar token (combinación de ambas implementaciones)
    const token = await createAccessToken({
      id: usuario.id_usuario,
      rol: usuario.tipo_usuario // Preservado de HEAD
    });

    // Cookie setting de HEAD
    /*res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });*/
     res.cookie("token", token, {
      httpOnly: process.env.NODE_ENV !== "development",
      secure: true,
      sameSite: "none",
    });
    // Enviar el token en la cabecera Authorization
      res.setHeader("Authorization", `Bearer ${token}`);

    
    // res.status(201).json({
    //   message: 'Registro completado exitosamente',
    //   usuario: {
    //     id: usuario.id_usuario,
    //     correo: usuario.correo_usuario, 
    //     nombre: usuario.nombre_usuario,
    //     apellido: usuario.apellido_usuario,
    //   },
    //   token
    // });
    res.status(201).json({
      success: true,
      message: 'Registro completado exitosamente',
      usuario: {
        id: usuario.id_usuario,
        correo: usuario.correo_usuario, 
        nombre: usuario.nombre_usuario,
        apellido: usuario.apellido_usuario,
      },
      token
    });
    
    
  } catch (error) {
    console.log(error)
    res.status(500).json({ 
      error: 'Error en verificación',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Resto del código sin cambios...
export const login = async (req, res) => {
    try {
        const { correo_usuario, contrasena_usuario } = req.body;
        console.log(req.body)
        
        const usuario = await Usuario.findOne({ 
          where: { correo_usuario: correo_usuario } 
        });
        
        if (!usuario) {
          return res.status(401).json({ error: "Credenciales incorrectas (usuario no registrado)" });
        }

        
        const contrasenaValida = await bcrypt.compare(contrasena_usuario, usuario.contrasena_usuario);
        console.log(contrasenaValida)
        if (!contrasenaValida) {
          return res.status(401).json({ error: "Credenciales incorrectas (contraseña invalida)" });
        }
        
        // Generar token combinando ambas versiones
        const token = await createAccessToken({
          id: usuario.id_usuario,
          rol: usuario.tipo_usuario
        });

         res.cookie("token", token, {
          httpOnly: process.env.NODE_ENV !== "development",
          secure: true,
          sameSite: "none",
          domain: process.env.NODE_ENV === "development" ? "https://qfinder-production.up.railway.app/" : "localhost"
         });


    // 4. Configurar cookie de sesión (connect.sid) si usas express-session
    req.session.userId = usuario.id_usuario; // Esto activará la cookie de sesión

  //        res.cookie("token", token, {
  // httpOnly: false, // For testing only
  // secure: false,   // Important for localhost (no https)
  // sameSite: "lax", // "none" requires secure=true
  //   });
        // Enviar el token en la cabecera Authorization
        res.setHeader("Authorization", `Bearer ${token}`);
        
        res.json({ 
          id: usuario.id_usuario,
          email: usuario.correo_usuario, 
          nombre: usuario.nombre_usuario,
          apellido: usuario.apellido_usuario,
          rol: usuario.tipo_usuario, 
          token 
        });
      } catch (error) {
        console.log(error)
        return res.status(500).json({ message: error.message });
        }  
};

// Funciones restantes sin cambios...
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
        if (!usuarios) {
            return res.status(404).json({ message: 'No se encontraron usuarios' });
        }
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
    const { nombre_usuario, apellido_usuario, direccion_usuario, telefono_usuario, correo_usuario, imagen_usuario } = req.body;

    const { id } = req.usuario;
    console.log("Contenido de req.usuario:", req.usuario);

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // if (contrasena_usuario) {
    //   const salt = await bcrypt.genSalt(10);
    //   dataToUpdate.contrasena_usuario = await bcrypt.hash(contrasena_usuario, salt);
    // }
    let nueva_imagen;
        try {
          nueva_imagen = await manejarImagenes(imagen_usuario, usuario.imagen_usuario);
        } catch (error) {
          return res.status(400).json({ 
            success: false,
            message: error.message 
          });
        }
    const dataToUpdate = { nombre_usuario, apellido_usuario, direccion_usuario, telefono_usuario, correo_usuario, imagen_usuario: nueva_imagen };

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
        const { id } = req.usuario;

        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await Usuario.destroy({
            where: { id_usuario: id },
        });

        res.status(200).json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar el usuario:', error);
        res.status(500).json({ message: 'Error al eliminar el usuario', error });
    }
};

export const perfilUser = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    console.log("Contenido de req.usuario:", req.usuario);

    const usuario = await Usuario.findByPk(id_usuario);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.status(200).json({
      id_usuario: usuario.id_usuario,
      nombre_usuario: usuario.nombre_usuario,
      apellido_usuario: usuario.apellido_usuario,
      identificacion_usuario: usuario.identificacion_usuario,
      direccion_usuario: usuario.direccion_usuario,
      telefono_usuario: usuario.telefono_usuario,
      correo_usuario: usuario.correo_usuario,
      imagen_usuario: usuario.imagen_usuario
   
    });
  } catch (error) {
    console.error('Error al obtener el perfil del usuario:', error);
    res.status(500).json({ message: 'Error al obtener el perfil del usuario', error });
  }
}

export const listarUsuarios = async (req, res) => {
  try { 
    const usuarios = await Usuario.findAll(
      {
      where: {
        tipo_usuario: 'Usuario'
      }, order: [['id_usuario', 'ASC']]
      }
  );
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
    })));
  } catch (error) {
    console.log('Error al listar los usuarios', error);
    res.status(500).json({ message: "Erro interno del servidor al listar los usuarios"})
  }
}
export const listarAdmin = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll(
      {
      where: {
        tipo_usuario: 'Administrador'
      }, order: [['id_usuario', 'ASC']]
      }
  );
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
    })));
  } catch (error) {
    console.log('Error al listar los usuarios', error);
    res.status(500).json({ message: "Erro interno del servidor al listar los administradores"})
  }
}

export const actualizarUsuario = async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const { nombre_usuario, apellido_usuario, identificacion_usuario, direccion_usuario, telefono_usuario, correo_usuario, tipo_usuario, imagen_usuario} = req.body;
    const usuario = await Usuario.findAll({
      where: {
        id_usuario: id_usuario
      }
    })
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    const dataToUpdate = { nombre_usuario, apellido_usuario, identificacion_usuario, direccion_usuario, telefono_usuario, correo_usuario, tipo_usuario };
    await Usuario.update(dataToUpdate, {
      where: { id_usuario: id_usuario },
    });
    res.status(200).json({ message: 'Información del usuario actualizada exitosamente' });
  } catch(error) {
    console.error('Error al actualizar el usuario', error);
    res.status(500).json({ message: "Error en el servidor al actualizar el usuario" });
  }
}

export const eliminarUsuario = async (req, res) => {
  try {
    const { id_usuario } = req.params;
    if (!id_usuario) {
      return res.status(400).json({ message: "ID de usuario no proporcionado" });
    }
    const usuario = await Usuario.findByPk(id_usuario);
    if(!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado"});
    }
    await Usuario.destroy({
      where: { id_usuario: id_usuario }
    })
    res.status(200).json({ message: "Usuario eliminado exitosamente"})
  } catch (error) {
    console.error('Error interno al eliminar el usuario', error);
    res.status(500).json({ message: "Error interno al eliminar el usuario"})
  }
}

export const buscarUserNombre = async (req, res) => {
  try {
    const { nombre_usuario } = req.body;
    const usuarios = await buscarNombre(nombre_usuario);
    if (usuarios.length === 0 || !usuarios) {
      return res.status(404).json({ message: "No se encontraron usuarios con ese nombre" });
    }
    res.status(200).json(usuarios);
  } catch (error) {
    console.error('Error al buscar el usuario por nombre', error);
    res.status(500).json({ message: "Error interno al buscar el usuario por nombre" });
  }
}

export const registerUsuario = async (req, res) => {
  try {
    const { nombre_usuario, apellido_usuario, identificacion_usuario, direccion_usuario, telefono_usuario, correo_usuario, contrasena_usuario, tipo_usuario } = req.body;

    const userData = {
      nombre_usuario,
      apellido_usuario,
      identificacion_usuario,
      direccion_usuario,
      telefono_usuario,
      contrasena_usuario,
      tipo_usuario: tipo_usuario || 'Usuario', // Por defecto 'Usuario'
    };
    
    // 1. Validar duplicados en BD (solo el correo)
    const existe = await Usuario.findOne({ where: { correo_usuario } });
    if (existe) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    const idExiste = await Usuario.findOne({ where: { identificacion_usuario: userData.identificacion_usuario } });
    if (idExiste) {
      return res.status(400).json({ error: 'El número de identificación ya está registrado' });
    }
    const passwordHash = await bcrypt.hash(contrasena_usuario, 10);

    const usuario = await Usuario.create({
      ...userData,
      correo_usuario,
      contrasena_usuario: passwordHash,
    });
    
    res.status(200).json({ 
      message: 'Usuario registrado exitosamente',
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        apellido_usuario: usuario.apellido_usuario,
        identificacion_usuario: usuario.identificacion_usuario,
        direccion_usuario: usuario.direccion_usuario,
        telefono_usuario: usuario.telefono_usuario,
        correo_usuario: usuario.correo_usuario,
        tipo_usuario: usuario.tipo_usuario,
      }
      
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Error en registro', 
      details: error.message 
    });
  }
}

export const actualizarAdmin = async (req, res) => {
  try {
    const { id_usuario } = req.usuario;
    const { nombre_usuario, apellido_usuario, identificacion_usuario, direccion_usuario, telefono_usuario, correo_usuario, imagen_usuario } = req.body;

    const usuario = await Usuario.findByPk(id_usuario);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    let nueva_imagen;
    try {
      nueva_imagen = await imgBase64(imagen_usuario, usuario.imagen_usuario);
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        message: error.message 
      });
    }

    const dataToUpdate = { nombre_usuario, apellido_usuario, identificacion_usuario, direccion_usuario, telefono_usuario, correo_usuario, imagen_usuario: nueva_imagen };

    await Usuario.update(dataToUpdate, {
      where: { id_usuario: id_usuario },
    });

    res.status(200).json({ message: 'Información del administrador actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar el administrador:', error);
    res.status(500).json({ message: 'Error al actualizar el administrador', error });
  }
}

export const eliminarAdmin = async (req, res) => {
  try {
    const { id_usuario } = req.usuario;

    const usuario = await Usuario.findByPk(id_usuario);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await Usuario.destroy({
      where: { id_usuario: id_usuario },
    });

    res.status(200).json({ message: 'Administrador eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar el administrador:', error);
    res.status(500).json({ message: 'Error al eliminar el administrador', error });
  }
}