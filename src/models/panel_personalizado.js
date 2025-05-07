import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const PanelPersonalizado = sequelize.define('PanelPersonalizado', {
  id_panel: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_panel'
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_usuario'
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_paciente'
  },
  plan_tratamiento: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'plan_tratamiento'
  },
  terapia_recomendada: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'terapia_recomendada'
  }
}, {
  tableName: 'panel_personalizado',
  timestamps: false,
});

export default PanelPersonalizado;
  