import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Usuario from "./usuario.model.js";
import Paciente from "./paciente.model.js";

const Familiar = sequelize.define('Familiar', {
  id_familiar: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_familiar'
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id_usuario',
    },
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Paciente,
      key: 'id_paciente',
    },
  },
  parentesco: {
    type: DataTypes.ENUM('padre','madre','hijo','hija','hermano','hermana','abuelo','abuela','tutor','otro'),
    allowNull: true,
    field: 'parentesco'
  },
  cuidador_principal: {
    type: DataTypes.TINYINT,
    allowNull: true,
    field: 'cuidador_principal'
  },
  notificado_emergencia: {
    type: DataTypes.TINYINT,
    allowNull: true,
    field: 'notificado_emergencia'
  }
}, {
  tableName: 'familiar',
  timestamps: true,
  freezeTableName: true
});

export default Familiar;