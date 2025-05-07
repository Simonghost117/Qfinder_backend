// src/models/MonitoreoSintomas.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js'; // 👈 Importación por defecto

export const RegistroSintoma = sequelize.define('RegistroSintoma', {
  id_registro: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sintoma: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gravedad: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fecha_sintoma: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'monitoreo_sintomas',
  timestamps: false,
});
