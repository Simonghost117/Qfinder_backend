import { db } from '../config/firebase-admin.js';
import Usuario from '../models/usuario.model.js';
import Red from '../models/red.model.js'; // Asegúrate de que esta importación sea correcta

export const obtenerIdRedPorNombre = async (req, res) => {
    try {
        const { nombre } = req.query;

        if (!nombre) {
            return res.status(400).json({ 
                success: false,
                message: 'El parámetro nombre es requerido' 
            });
        }

        const red = await Red.findOne({
            where: { nombre_red: nombre },
            attributes: ['id_red']
        });

        if (!red) {
            return res.status(404).json({ 
                success: false,
                message: 'Red no encontrada' 
            });
        }

        res.status(200).json({
            success: true,
            id_red: red.id_red
        });

    } catch (error) {
        console.error('Error al obtener ID de red:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener ID de red',
            details: error.message // Para depuración
        });
    }
};

export const enviarMensaje = async (req, res) => {
  try {
    const { id_red } = req.params;
    const { id_usuario } = req.user;
    const { mensaje } = req.body;

    // Obtener datos del usuario para mostrar en el chat
    const usuario = await Usuario.findByPk(id_usuario, {
      attributes: ['nombre_usuario', 'apellido_usuario']
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Crear referencia al chat de la red
    const chatRef = db.ref(`chats/${id_red}/mensajes`).push();
    
    // Guardar mensaje en Firebase
    await chatRef.set({
      id_usuario,
      nombre: `${usuario.nombre_usuario} ${usuario.apellido_usuario}`,
      mensaje,
      fecha_envio: Date.now()
    });

    res.status(201).json({ success: true, message: 'Mensaje enviado' });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
};

export const obtenerMensajes = async (req, res) => {
  try {
    const { id_red } = req.params;
    const { limite = 50 } = req.query;

    const snapshot = await db.ref(`chats/${id_red}/mensajes`)
      .orderByChild('fecha_envio')
      .limitToLast(parseInt(limite))
      .once('value');

    const mensajes = snapshot.val() || {};

    res.status(200).json({
      success: true,
      data: Object.values(mensajes)
    });
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
};