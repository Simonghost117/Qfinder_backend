import { ActividadCuidado } from "../model/activity.model.js";

// Crear una nueva actividad
export const createActivity = async (data) => {
    console.log("📥 Datos recibidos para crear actividad:", data);
  
    try {
      const newActivity = await ActividadCuidado.create(data);
      return newActivity;
    } catch (error) {
      console.error("❌ Error al guardar en base de datos:", error); // <-- Agregado
      throw error;
    }
  };
  

// Obtener todas las actividades
export const getAllActivities = async () => {
  return await ActividadCuidado.findAll();
};

// Obtener una actividad por ID
export const getActivityById = async (id) => {
  return await ActividadCuidado.findByPk(id);
};

// Actualizar una actividad por ID
export const updateActivity = async (id, data) => {
  const activity = await ActividadCuidado.findByPk(id);
  if (!activity) return null;
  await activity.update(data);
  return activity;
};

// Eliminar una actividad por ID
export const deleteActivity = async (id) => {
  return await ActividadCuidado.destroy({ where: { id_actividad: id } });
};
