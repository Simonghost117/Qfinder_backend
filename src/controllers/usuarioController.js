import jwt from 'jsonwebtoken';
import { createAccessToken } from '../libs/jwt.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { imgBase64, manejarImagenes } from '../utils/imgBase64.js';
import { models, sequelize } from '../models/index.js';
const { Usuario, Subscription } = models;

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
    console.error("Errrrrrrorrrrrrrrrrrrrr:::::  ", error)
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


         /*res.cookie("token", token, {
            httpOnly: process.env.NODE_ENV !== "development",
            secure: true,
            sameSite: "none",
            domain: process.env.NODE_ENV === "development" ? "localhost" : "qfinder-production.up.railway.app",
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });*/

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 60*60*1000
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
import { Op, col } from 'sequelize';
import { PaginationService } from '../utils/paginationUtils.js';
// import sequelize from '../config/db.js';

export const listarUsuarios = async (req, res) => {
  try { 
    const where = {
      tipo_usuario: 'Usuario'
    };
    
    // Añadir filtros dinámicos
    if (req.query.estado) {
      where.estado_usuario = req.query.estado;
    }
    
    if (req.query.busqueda) {
      const searchTerm = req.query.busqueda.toLowerCase(); // Normalizamos el término de búsqueda
      
      where[Op.or] = [
        { 
          nombre_usuario: { 
            [Op.iLike]: `%${searchTerm}%` 
          } 
        },
        { 
          apellido_usuario: { 
            [Op.iLike]: `%${searchTerm}%` 
          } 
        },
        { 
          correo_usuario: { 
            [Op.iLike]: `%${searchTerm}%` 
          } 
        },
        sequelize.where(
          sequelize.fn('LOWER', sequelize.col('identificacion_usuario')),
          '=',
          searchTerm
        )
      ];
    }

    const result = await PaginationService.paginate(Usuario, {
      where,
      include: [{
        model: Subscription,
        as: 'subscription', 
        required: false, // LEFT JOIN en lugar de INNER JOIN
        attributes: ['tipo_suscripcion', 'estado_suscripcion', 'fecha_inicio', 'fecha_renovacion', 'limite_pacientes', 'limite_cuidadores']
      }],
      order: [['id_usuario', 'DESC']],
      req,
      transformData: (usuarios) => usuarios.map(usuario => ({
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        apellido_usuario: usuario.apellido_usuario,
        identificacion_usuario: usuario.identificacion_usuario,
        direccion_usuario: usuario.direccion_usuario,
        telefono_usuario: usuario.telefono_usuario,
        correo_usuario: usuario.correo_usuario,
        tipo_usuario: usuario.tipo_usuario,
        estado_usuario: usuario.estado_usuario,
        // Información de la suscripción
        suscripcion: usuario.subscription ? {
          tipo: usuario.subscription.tipo_suscripcion,
          estado: usuario.subscription.estado_suscripcion,
          fecha_inicio: usuario.subscription.fecha_inicio,
          fecha_renovacion: usuario.subscription.fecha_renovacion,
          limite_pacientes: usuario.subscription.limite_pacientes,
          limite_cuidadores: usuario.subscription.limite_cuidadores
        } : null
      }))
    });

    res.status(200).json(result);
  } catch (error) {
    console.log('Error al listar los usuarios', error);
    res.status(500).json({ message: "Error interno del servidor al listar los usuarios"})
  }
}
export const listarAdmin = async (req, res) => {
  try { 
    const where = {
      tipo_usuario: 'Administrador'
    };
  
    if (req.query.estado) {
      where.estado_usuario = req.query.estado;
    }
    
    if (req.query.busqueda) {
      const searchTerm = req.query.busqueda.toLowerCase(); 
      
      where[Op.or] = [
        { 
          nombre_usuario: { 
            [Op.iLike]: `%${searchTerm}%` 
          } 
        },
        { 
          apellido_usuario: { 
            [Op.iLike]: `%${searchTerm}%` 
          } 
        },
        { 
          correo_usuario: { 
            [Op.iLike]: `%${searchTerm}%` 
          } 
        },
      
        sequelize.where(
          sequelize.fn('LOWER', sequelize.col('identificacion_usuario')),
          '=',
          searchTerm
        )
      ];
    }

    const result = await PaginationService.paginate(Usuario, {
      where,
      order: [['id_usuario', 'DESC']],
      req,
      transformData: (usuarios) => usuarios.map(usuario => ({
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        apellido_usuario: usuario.apellido_usuario,
        identificacion_usuario: usuario.identificacion_usuario,
        direccion_usuario: usuario.direccion_usuario,
        telefono_usuario: usuario.telefono_usuario,
        correo_usuario: usuario.correo_usuario,
        tipo_usuario: usuario.tipo_usuario,
        estado_usuario: usuario.estado_usuario
      }))
    });

    res.status(200).json(result);
  } catch (error) {
    console.log('Error al listar los usuarios', error);
    res.status(500).json({ message: "Erro interno del servidor al listar los administradores"})
  }
}
import {processApprovedPayment} from '../controllers/paymentController.js';
// Importaciones necesarias al inicio del archivo


// export const actualizarUsuario = async (req, res) => {
//   try {
//     const { id_usuario } = req.params;
//     const { nombre_usuario, apellido_usuario, identificacion_usuario, direccion_usuario, telefono_usuario, correo_usuario, imagen_usuario, tipo_usuario, tipo_suscripcion, estado_suscripcion } = req.body;
//     const existe = await Usuario.findOne({
//   where: {
//     [Op.and]: [
//       {
//         [Op.or]: [
//           { correo_usuario: correo_usuario },
//           { identificacion_usuario: identificacion_usuario }
//         ]
//       },
//       { id_usuario: { [Op.ne]: id_usuario } } // Excluir al usuario actual de la búsqueda
//     ]
//   },
// });

// if (existe) {
//   // Verificar cuál campo está duplicado
//   if (existe.correo_usuario === correo_usuario) {
//     return res.status(400).json({ message: "El correo ya está registrado por otro usuario" });
//   }
//   if (existe.identificacion_usuario === identificacion_usuario) {
//     return res.status(400).json({ message: "La identificación ya está registrada por otro usuario" });
//   }
// }
//     const usuario = await Usuario.findOne({
//       where: {
//         id_usuario: id_usuario
//       }, attributes: [ 'tipo_usuario' ], 
//        include: [{
//         model: Subscription,
//         as: 'subscription', // Asegúrate de que coincida con tu asociación
//         required: false // LEFT JOIN (incluye usuarios sin suscripción)
//   }]
//     })
//     if (!usuario) {
//       return res.status(404).json({ message: "Usuario no encontrado" });
//     }
//     console.log("Tipo de usuario en BD:", usuario.tipo_usuario);

//     let rolAsignado = {tipo_usuario: tipo_usuario}; 

//     const user = req.user;
//     if (user.tipo_usuario == 'Administrador') {
//        rolAsignado = {tipo_usuario : 'Usuario'};
//       if (usuario.tipo_usuario !== 'Usuario') {
//         return res.status(403).json({ message: "No tienes permiso para actualizar este usuario, rol denegado" });
//       }
//     } 
//     // Manejo de imagen
//         let nueva_imagen;
//         try {
//           nueva_imagen = await manejarImagenes(imagen_usuario, usuario.imagen_usuario);
//         } catch (error) {
//           return res.status(400).json({ 
//             success: false,
//             message: error.message 
//           });
//         }
//     const dataToUpdate = { nombre_usuario, apellido_usuario, identificacion_usuario, direccion_usuario, telefono_usuario, correo_usuario, tipo_usuario: rolAsignado.tipo_usuario || tipo_usuario,
//       imagen_usuario: nueva_imagen };
//     await Usuario.update(dataToUpdate, {
//       where: { id_usuario: id_usuario },
//     });


//     if (usuario.subscription && (tipo_suscripcion || estado_suscripcion)) {
//       await Subscription.update(
//         {
//           tipo_suscripcion: tipo_suscripcion || usuario.subscription.tipo_suscripcion,
//           estado_suscripcion: estado_suscripcion || usuario.subscription.estado_suscripcion
//         },
//         { where: { id_usuario: id_usuario } }
//       );
//     }
//     if (estado_suscripcion === "active" || usuario.subscription.estado_suscripcion === "active") {
//     await Usuario.update(
//       { membresia: tipo_suscripcion || usuario.subscription.tipo_suscripcion },
//       { where: { id_usuario } }
//     );
// }

//     res.status(200).json({ 
//       success: true,
//       message: 'Usuario actualizado correctamente' + 
//         (usuario.subscription ? ' (con suscripción actualizada)' : '') 
//     });

//    }catch(error) {
//     console.error('Error al actualizar el usuario', error);
//     res.status(500).json({ message: "Error en el servidor al actualizar el usuario" });
//   }
// }


export const actualizarUsuario = async (req, res) => {
  let transaction;

  try {
    transaction = await sequelize.transaction();

    const { id_usuario } = req.params;
    const {
      nombre_usuario,
      apellido_usuario,
      identificacion_usuario,
      direccion_usuario,
      telefono_usuario,
      correo_usuario,
      imagen_usuario,
      tipo_usuario,
      tipo_suscripcion,
      estado_suscripcion
    } = req.body;

    // Verificar duplicados
    const existe = await models.Usuario.findOne({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { correo_usuario },
              { identificacion_usuario }
            ]
          },
          { id_usuario: { [Op.ne]: id_usuario } }
        ]
      },
      transaction
    });

    if (existe) {
      await transaction.rollback();
      const conflictField = existe.correo_usuario === correo_usuario
        ? 'El correo ya está registrado por otro usuario'
        : 'La identificación ya está registrada por otro usuario';
      return res.status(400).json({ message: conflictField });
    }

    // Obtener usuario con suscripción
    const usuario = await models.Usuario.findOne({
      where: { id_usuario },
      attributes: ['tipo_usuario', 'imagen_usuario'],
      include: [{ model: models.Subscription, as: 'subscription', required: false }],
      transaction
    });

    if (!usuario) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Validación de roles
    const user = req.user;
    let rolFinal = tipo_usuario;

    if (user.tipo_usuario === 'Administrador') {
      if (usuario.tipo_usuario !== 'Usuario') {
        await transaction.rollback();
        return res.status(403).json({ message: 'No tienes permiso para actualizar este usuario' });
      }
      rolFinal = 'Usuario';
    }

    // Manejo de imagen
    let nueva_imagen;
    try {
      nueva_imagen = await manejarImagenes(imagen_usuario, usuario.imagen_usuario);
    } catch (error) {
      await transaction.rollback();
      return res.status(400).json({ message: error.message });
    }

    // Actualizar datos del usuario
    await models.Usuario.update({
      nombre_usuario,
      apellido_usuario,
      identificacion_usuario,
      direccion_usuario,
      telefono_usuario,
      correo_usuario,
      tipo_usuario: rolFinal,
      imagen_usuario: nueva_imagen
    }, {
      where: { id_usuario },
      transaction
    });

    // Procesar suscripción si ya existe
    const existingSubscription = await models.Subscription.findOne({
      where: { id_usuario },
      transaction
    });

    if (existingSubscription) {
      if (estado_suscripcion === 'active') {
        if (!tipo_suscripcion) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Se requiere tipo_suscripcion para activar' });
        }

        const mockPayment = {
          external_reference: `USER_${id_usuario}_PLAN_${tipo_suscripcion}`,
          id: `manual-${Date.now()}`,
          status: 'approved',
          date_approved: new Date().toISOString(),
          payment_method_id: 'manual'
        };

        await processApprovedPayment(mockPayment, { models, transaction });
      } else if (tipo_suscripcion || estado_suscripcion) {
        await models.Subscription.update({
          tipo_suscripcion: tipo_suscripcion || usuario.subscription?.tipo_suscripcion,
          estado_suscripcion: estado_suscripcion || usuario.subscription?.estado_suscripcion
        }, {
          where: { id_usuario },
          transaction
        });
      }
    } else {
      console.log(`El usuario ${id_usuario} no tiene suscripción previa. No se procesará.`);
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Usuario actualizado correctamente' +
        (estado_suscripcion === 'active' ? ' (suscripción activada)' : '')
    });

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error al actualizar usuario:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({
      message: 'Error al actualizar el usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


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
    if (usuario.tipo_usuario === 'Administrador') {
      const user = req.user;
      if (user.tipo_usuario !== 'Super') {
        return res.status(403).json({ message: "No tienes permiso para eliminar a otros administradores" });
      }
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

    // 1. Validar duplicados en BD (solo el correo)
    const existe = await Usuario.findOne({ where: { correo_usuario } });
    if (existe) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    let rolAsignado = {tipo_usuario: tipo_usuario}; 

    const user = req.user;
    if (user.tipo_usuario == 'Administrador') {
      if (tipo_usuario !== 'Usuario') {
        return res.status(403).json({ message: "No tienes permiso para registrar este tipo de usuario, su rol solo le permite registrar usuarios" });
      }
        rolAsignado = {tipo_usuario : 'Usuario'};
      
    } 

    console.log("req.user: ", req.user)

    const userData = {
      nombre_usuario,
      apellido_usuario,
      identificacion_usuario,
      direccion_usuario,
      telefono_usuario,
      contrasena_usuario,
      tipo_usuario: rolAsignado.tipo_usuario, 
    };
    

    const idExiste = await Usuario.findOne({ where: { identificacion_usuario: userData.identificacion_usuario } });

    console.log("idExiste: ", idExiste)
    if (idExiste) {
      return res.status(400).json({ error: 'El número de identificación ya está registrado' });
    }
    const passwordHash = await bcrypt.hash(contrasena_usuario, 10);

    const usuario = await Usuario.create({
      ...userData,
      correo_usuario,
      contrasena_usuario: passwordHash,
    });

    console.log("usuario: ", usuario)
    
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
    console.log(error)
    res.status(500).json({ 
      error: 'Error en registro', 
      details: error.message 
    });
  }
}

export const actualizarAdmin = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    const { nombre_usuario, apellido_usuario, identificacion_usuario, direccion_usuario, telefono_usuario, correo_usuario, imagen_usuario } = req.body;

    const usuario = await Usuario.findByPk(id_usuario);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    if( correo_usuario || identificacion_usuario ){
      
      const existeCorreo = await Usuario.findOne({ where: { correo_usuario, id_usuario: { [Op.ne]: id_usuario } } });
      if (existeCorreo) {
        return res.status(400).json({ error: 'El correo ya está registrado' });
      }

      const existeIdentificacion = await Usuario.findOne({ where: { identificacion_usuario, id_usuario: { [Op.ne]: id_usuario } } });
      if (existeIdentificacion) {
        return res.status(400).json({ error: 'El número de identificación ya está registrado' });
      }
    }

    let nueva_imagen;
        try {
          nueva_imagen = await manejarImagenes(imagen_usuario, usuario.imagen_usuario);
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

    res.status(200).json({ message: 'Información del administrador actualizada exitosamente',
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre_usuario: dataToUpdate.nombre_usuario,
        apellido_usuario: dataToUpdate.apellido_usuario,
        identificacion_usuario: dataToUpdate.identificacion_usuario,
        direccion_usuario: dataToUpdate.direccion_usuario,
        telefono_usuario: dataToUpdate.telefono_usuario,
        correo_usuario: dataToUpdate.correo_usuario,
        imagen_usuario: nueva_imagen
      }
     });
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


export const registerUsuariosSuper = async (req, res) => {
  try {
    const { nombre_usuario, apellido_usuario, identificacion_usuario, direccion_usuario, telefono_usuario, correo_usuario, contrasena_usuario, tipo_usuario } = req.body;

    const userData = {
      nombre_usuario,
      apellido_usuario,
      identificacion_usuario,
      direccion_usuario,
      telefono_usuario,
      contrasena_usuario,
      tipo_usuario: tipo_usuario || 'Usuario', // Por defecto 'Usuario' si no se especifica
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

export const contarUsuarios = async (req, res) => {
  try {
    const totalUsuarios = await Usuario.count({
      where: {
        tipo_usuario: 'Usuario'
      }
    });
    
    const totalAdministradores = await Usuario.count({
      where: {
        tipo_usuario: 'Administrador'
      }
    });

    res.status(200).json({
      totalUsuarios,
      totalAdministradores
    });
  } catch (error) {
    console.error('Error al contar los usuarios:', error);
    res.status(500).json({ message: 'Error al contar los usuarios', error });
  }
}