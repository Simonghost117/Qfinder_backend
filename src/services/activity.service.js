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
export const getAllActivities = async (id_paciente) => {
  console.log('🔍 [getAllActivities] Solicitando actividades para paciente ID:', id_paciente);
  
  if (!id_paciente) {
    console.error('🚨 ID de paciente no proporcionado');
    throw new Error('Se requiere ID de paciente');
  }

  try {
    console.time('⏱️ Tiempo de consulta getAllActivities');
    
    const actividades = await ActividadCuidado.findAll({
      where: { id_paciente },
      order: [["fecha_actividad", "DESC"]],
      raw: true
    });

    console.timeEnd('⏱️ Tiempo de consulta getAllActivities');
    console.log('✅ [getAllActivities] Actividades encontradas:', actividades.length);

    // Validar estructura de datos
    actividades.forEach(act => {
      if (!act.fecha_actividad) {
        console.warn('⚠️ Actividad sin fecha:', act.id_actividad);
      }
      if (!act.estado) {
        console.warn('⚠️ Actividad sin estado:', act.id_actividad);
      }
    });

    // Log resumen
    const estados = actividades.reduce((acc, act) => {
      acc[act.estado] = (acc[act.estado] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Distribución de estados:', estados);
    
    return actividades;

  } catch (error) {
    console.error('❌ [getAllActivities] Error:', {
      message: error.message,
      stack: error.stack,
      pacienteId: id_paciente
    });
    throw error;
  }
};
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