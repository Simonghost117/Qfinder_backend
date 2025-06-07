// models/colaborador.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Colaborador = sequelize.define('Colaborador', {
  id_colabolador: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_colabolador',
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_usuario',
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_paciente',
  },
}, {
  tableName: 'colaborador',
  timestamps: false,
  freezeTableName: true,
});

export default Colaborador;
