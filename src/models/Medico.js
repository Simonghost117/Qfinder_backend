import { DataTypes } from 'sequelize';
import  sequelize  from '../config/db.js';

const Medico = sequelize.define('Medico', {
  id_medico: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  especialidad: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  tableName: 'medico',
  timestamps: true
});

export default Medico;