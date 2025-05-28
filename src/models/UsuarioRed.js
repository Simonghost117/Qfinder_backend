import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const UsuarioRed = sequelize.define('usuario_red', {
  id_usuario_red: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    field: "id_usuario_red"
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "id_usuario"
  },
  id_red: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "id_red"
  },
  rol: {
    type: DataTypes.ENUM('administrador', 'miembro'),
    defaultValue: 'miembro',
    allowNull: false,
    field: "rol"
  },
  fecha_union: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: true,
    field: "fecha_union"
  },
}, {
  tableName: 'usuario_red',
  timestamps: false
});

export default UsuarioRed;