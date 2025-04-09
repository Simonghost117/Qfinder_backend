import { DataTypes } from 'sequelize';
import  sequelize  from '../config/db.js';

export const Familiar = sequelize.define('Familiar', {
  id_familiar: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_paciente: {  // ← Añade esta columna clave
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'paciente',  // Nombre de la tabla en la BD
      key: 'id_paciente'
    }
  },
  id_usuario: {  // ← Añade si no está en tu modelo
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuario',
      key: 'id_usuario'
    }
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
  tableName: 'familiar',
  timestamps: true  // ← Recomendado para createdAt/updatedAt
});