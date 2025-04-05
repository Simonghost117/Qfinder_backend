import { DataTypes } from 'sequelize';
import  sequelize  from '../config/database.js';

export const Familiar = sequelize.define('Familiar', {
  id_familiar: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  parentesco: {
    type: DataTypes.ENUM('padre', 'madre', 'hijo', 'hija', 'hermano', 'hermana', 'abuelo', 'abuela', 'tutor', 'otro')
  },
  cuidador_principal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notificado_emergencia: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'familiar'
});