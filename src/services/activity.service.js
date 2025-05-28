import { where } from "sequelize";
import { ActividadCuidado } from "../models/activity.model.js";
import Paciente from "../models/paciente.model.js";

// Crear una nueva actividad
export const createActivity = async (id_paciente, data) => {
    console.log("📥 Datos recibidos para crear actividad:", data);
  
    try {
      
      const newActivity = await ActividadCuidado.create({
        intensidad: data.intensidad || "baja",
        ...data,
        id_paciente: id_paciente,
      });
      return newActivity;
    } catch (error) {
      console.error("❌ Error al guardar en base de datos:", error); // <-- Agregado
      throw error;
    }
  };
  

// Obtener todas las actividades
// controllers/activity.controller.js

export const getAllActivities = async (id_paciente) => {
  console.log('🔍 [getAllActivities] Buscando actividades para paciente ID:', id_paciente);
  
  try {
    const actividades = await ActividadCuidado.findAll({
      where: { id_paciente },
      order: [["fecha_actividad", "DESC"]],
      raw: true
    });

    // Mapear los campos para coincidir con el frontend
    const actividadesFormateadas = actividades.map(act => ({
      id_actividad: act.id_actividad,
      titulo: act.tipo_actividad || 'Sin título',
      descripcion: act.descripcion || 'Sin descripción',
      fecha: act.fecha_actividad ? formatDate(act.fecha_actividad) : null,
      hora: act.fecha_actividad ? formatTime(act.fecha_actividad) : null,
      estado: act.estado || 'pendiente',
      id_paciente: act.id_paciente
    }));

    console.log('✅ [getAllActivities] Actividades formateadas:', actividadesFormateadas);
    return actividadesFormateadas;
    
  } catch (error) {
    console.error('❌ [getAllActivities] Error:', error);
    throw error;
  }
};

// Funciones auxiliares para formatear fecha y hora
function formatDate(date) {
  return new Date(date).toISOString().split('T')[0]; // Formato YYYY-MM-DD
}

function formatTime(date) {
  return new Date(date).toTimeString().split(' ')[0].substring(0, 5); // Formato HH:MM
}
// Obtener una actividad por ID
export const getActivityById = async (id_paciente, id_actividad) => {
  return await Paciente.findOne({
    where: { id_paciente },
    attributes: ["id_paciente", "nombre", "apellido", "identificacion"],
    include: {
      model: ActividadCuidado,
      where: { id_actividad },
    },
  });
};

// Actualizar una actividad por ID
export const updateActivity = async (id_paciente, id_actividad, data) => {
  const activity = await ActividadCuidado.findOne({
    where: { id_paciente, id_actividad },
  });
  if (!activity) return null;
  await activity.update(data);
  return activity;
};

// Eliminar una actividad por ID
export const deleteActivity = async (id_paciente, id_actividad) => {
  return await ActividadCuidado.destroy({ where: { 
    id_paciente: id_paciente, 
    id_actividad: id_actividad } });
};

export const todasActividades = async (id_usuario) => {
  try { 
    return await ActividadCuidado.findAll({
      where: { id_usuario },

    })
  } catch (error) {
    throw error;
  }
}