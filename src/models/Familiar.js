import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Usuario from './usuario.model.js';
import Paciente from './paciente.model.js';

export const Familiar = sequelize.define('Familiar', {
  id_familiar: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Paciente,
      key: 'id_paciente'
    }
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id_usuario'
    }
  },
  parentesco: {
    type: DataTypes.ENUM('padre', 'madre', 'hijo', 'hija', 'hermano', 'hermana', 'abuelo', 'abuela', 'tutor', 'otro'),
    defaultValue: 'tutor'
  },
  cuidador_principal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notificado_emergencia: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  fecha_registro: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'familiar',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['id_usuario', 'id_paciente']
    }
  ]
});

// Relaciones
Familiar.associate = (models) => {
  Familiar.belongsTo(models.Usuario, {
    foreignKey: 'id_usuario',
    as: 'Usuario'
  });
  
  Familiar.belongsTo(models.Paciente, {
    foreignKey: 'id_paciente',
    as: 'Paciente'
  });
};

export default Familiar;