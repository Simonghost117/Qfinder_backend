import { DataTypes } from 'sequelize';
import  {sequelize}  from '../config/database.js';

export const Usuario = sequelize.define('Usuario', {
  id_usuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_usuario: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  correo_usuario: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  contrasena_usuario: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  tipo_usuario: {
    type: DataTypes.ENUM('Familiar', 'Medico', 'Administrador'),
    allowNull: false
  },
  estado_usuario: {
    type: DataTypes.ENUM('Activo', 'Inactivo'),
    defaultValue: 'Activo'
  }
}, {
  tableName: 'usuario',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: false
});

// Las asociaciones se configurarán en el archivo index.js
