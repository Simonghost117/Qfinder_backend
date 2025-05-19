import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js'; 
import Usuario from './usuario.model.js';

const Medicamento = sequelize.define('Medicamento', {
  id_medicamento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id_usuario'
    }
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT
  },
  tipo: {
    type: DataTypes.ENUM('psiquiatrico', 'neurologico', 'general', 'otro'),
    allowNull: false
  }
}, {
  tableName: 'medicamento',
  timestamps: false
});

export default Medicamento;
