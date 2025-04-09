import { DataTypes } from 'sequelize';
import { sequelize } from '../database/database.js';

export const Red = sequelize.define('Red', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
  },
  enfermedad: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  timestamps: false,
  tableName: 'panel_personalizado',
  createdAt: false,     // asegúrate de que existan en la tabla
  updatedAt: false,     // igual
  freezeTableName: true,
  hasPrimaryKeys: false, 
});

export default Red;
