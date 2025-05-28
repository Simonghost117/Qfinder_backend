import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Usuario from './usuario.model.js';

const Paciente = sequelize.define('Paciente', {
  id_paciente: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_paciente',
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id_usuario',
    },
    field: 'id_usuario',
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'nombre',
  },
  apellido: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'apellido',
  },
  identificacion: {
    type: DataTypes.STRING(10),
    allowNull: false,
    field: 'identificacion',
  },
  fecha_nacimiento: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'fecha_nacimiento',
  },
  sexo: {
    type: DataTypes.ENUM('masculino', 'femenino', 'otro', 'prefiero_no_decir'),
    allowNull: false,
    field: 'sexo',
  },
  diagnostico_principal: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'diagnostico_principal',
  },
  nivel_autonomia: {
    type: DataTypes.ENUM('alta', 'media', 'baja'),
    allowNull: true,
    field: 'nivel_autonomia',
  },
  imagen_paciente: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'imagen_paciente',
  },
  fcm_token: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'fcm_token'
  }
}, {
  tableName: 'paciente',
  timestamps: false, // Cambiado a true para tener createdAt/updatedAt
  freezeTableName: true,
});

// // Relación con Familiar
// Paciente.associate = (models) => {
//   Paciente.hasMany(models.Familiar, {
//     foreignKey: 'id_paciente',
//     as: 'Familiares'
//   });
// };

export default Paciente;