import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const UsuarioRed = sequelize.define('UsuarioRed', {
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "id_usuario"
  },
  id_relacion: {
    primaryKey: true,
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "id_relacion"
  }
}, {
  tableName: 'usuario_red',
  timestamps: false
});

export default UsuarioRed;