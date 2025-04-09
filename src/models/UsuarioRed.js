import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const UsuarioRed = sequelize.define('UsuarioRed', {
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  redId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'usuario_red',
  timestamps: false
});

export default UsuarioRed;
