import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Subscription = sequelize.define('Subscription', {
  id_subscription: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_subscription'
  },
  id_usuario: { // <- CAMBIO AQUÍ
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuario',
      key: 'id_usuario'
    },
    field: 'id_usuario' // <- COINCIDE CON LA DB
  },
  mercado_pago_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: 'mercado_pago_id'
  },
  plan_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'plan_id'
  },
  tipo_suscripcion: {
    type: DataTypes.ENUM('free', 'plus', 'pro'),
    defaultValue: 'free',
    field: 'tipo_suscripcion'
  },
  estado_suscripcion: {
    type: DataTypes.ENUM('active', 'pending', 'paused', 'cancelled'),
    defaultValue: 'pending',
    field: 'estado_suscripcion'
  },
  fecha_inicio: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_inicio'
  },
  fecha_renovacion: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_renovacion'
  },
  fecha_cancelacion: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_cancelacion'
  },
  limite_pacientes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
    field: 'limite_pacientes'
  },
  limite_cuidadores: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'limite_cuidadores'
  }
}, {
  tableName: 'subscription',
  timestamps: false,
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['mercado_pago_id']
    },
    {
      fields: ['usuario_id']
    }
  ]
});

export default Subscription;