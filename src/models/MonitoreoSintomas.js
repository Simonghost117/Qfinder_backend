// src/models/MonitoreoSintomas.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js'; // 👈 Importación por defecto

export const RegistroSintoma = sequelize.define('RegistroSintoma', {
  id_registro: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_registro',
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_paciente',
  },
  fecha_sintoma: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'fecha_sintoma',
    defaultValue: DataTypes.NOW,
  },
  sintoma: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'sintoma',
  },
  gravedad: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'gravedad',
  },
  observaciones: {
    type: DataTypes.ENUM('baja', 'media', 'alta'),
    defaultValue: 'baja',
    field: 'observaciones',
  },
  
}, {
  tableName: 'monitoreo_sintomas',
  timestamps: false,
});
