import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js'; // 👈 esta línea debe ir ANTES de usar sequelize

export const Paciente = sequelize.define('Paciente', {
  id_paciente: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  fecha_nacimiento: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  sexo: {
    type: DataTypes.ENUM('masculino', 'femenino', 'otro', 'prefiero_no_decir'),
    allowNull: false
  },
  diagnostico_principal: {
    type: DataTypes.STRING(100)
  },
  nivel_autonomia: {
    type: DataTypes.ENUM('alta', 'media', 'baja')
  }
}, {
  tableName: 'paciente',
  timestamps: true,
  createdAt: 'creado_el',
  updatedAt: 'ultima_actualizacion'
});
