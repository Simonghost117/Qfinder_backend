import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Paciente from './paciente.model.js';
import Medicamento from './medicamento.model.js';

const PacienteMedicamento = sequelize.define('PacienteMedicamento', {
  id_pac_medicamento: {
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
  id_medicamento: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Medicamento,
      key: 'id_medicamento'
    }
  },
  fecha_inicio: {
    type: DataTypes.DATE,
    allowNull: false
  },
  fecha_fin: {
    type: DataTypes.DATE,
    allowNull: false
  },
  dosis: {
    type: DataTypes.STRING,
    allowNull: true
  },
  frecuencia: {
    type: DataTypes.STRING,
    allowNull: true
  }, ultimo_recordatorio: {
    type: DataTypes.DATE,
    allowNull: true
  }, proxima_dosis: {
    type: DataTypes.DATE,
    allowNull: true
  }, notificaciones_activas: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'paciente_medicamento',
  timestamps: false
});

// Paciente.hasMany(PacienteMedicamento, { foreignKey: 'id_paciente' });
// Medicamento.hasMany(PacienteMedicamento, { foreignKey: 'id_medicamento' });
// PacienteMedicamento.belongsTo(Paciente, { foreignKey: 'id_paciente' });
// PacienteMedicamento.belongsTo(Medicamento, { foreignKey: 'id_medicamento' });

export default PacienteMedicamento;
