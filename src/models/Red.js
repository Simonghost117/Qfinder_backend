// models/Red.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Red = sequelize.define('red', {
  id_red: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_red'
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_usuario'
  },
  nombre_red: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'nombre_red'
  },
  descripcion_red: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'descripcion_red'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: true,
    field: 'fecha_creacion'
  }
}, {
  tableName: 'red',
  timestamps: false,
  freezeTableName: true
});

export default Red;
