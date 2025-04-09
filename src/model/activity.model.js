import { DataTypes } from "sequelize";
import sequelize from "../config/db.js"; // ✅ Importación correcta

export const ActividadCuidado = sequelize.define("actividad_cuidado", {
  id_actividad: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_usuario_registra: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tipo_actividad: {
    type: DataTypes.ENUM('higiene', 'vestido', 'ejercicio', 'recreacion', 'medicacion', 'terapia', 'comida', 'otro'),
    allowNull: false,
  },
  
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  fecha_hora_inicio: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  fecha_hora_fin: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'en_progreso', 'completada', 'cancelada'),
    allowNull: false,
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: "actividad_cuidado",
  timestamps: false,
});
