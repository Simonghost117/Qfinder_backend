import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

export const ActividadCuidado = sequelize.define("actividad_cuidado", {
  id_actividad: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: "id_actividad",
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "id_paciente",
  },
  fecha_actividad: {
    type: DataTypes.DATE,
    allowNull: false,
    field: "fecha_actividad",
  },
  duracion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "duracion",
  },
  tipo_actividad: {
    type: DataTypes.ENUM('higiene', 'vestido', 'ejercicio', 'recreacion', 'medicacion', 'terapia', 'comida', 'otro'),
    allowNull: false,
    field: "tipo_actividad",
  },
  intensidad: {
    type: DataTypes.ENUM('leve', 'moderada', 'alta'),
    allowNull: false,
    field: "intensidad",
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: "descripcion",
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'en_progreso', 'completada', 'cancelada'),
    allowNull: false,
    field: "estado",
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: "observaciones",
  },
}, {
  tableName: "actividad_fisica",
  timestamps: false,
});