// models/UsuarioRed.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const UsuarioRed = sequelize.define('UsuarioRed', {
  id_relacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_relacion'
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_usuario'
  },
  estado: {
    type: DataTypes.ENUM('activa', 'pendiente', 'rechazada'),
    defaultValue: 'activa',
    field: 'estado'
  },
  nombre_red: {
    type: DataTypes.STRING(100),
    defaultValue: 'Red Global de Apoyo',
    field: 'nombre_red'
  },
  descripcion_red: {
    type: DataTypes.TEXT,
    defaultValue: 'Comunidad principal para todos los usuarios registrados',
    field: 'descripcion_red'
  },
  fecha_union: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_union'
  }
}, {
  tableName: 'usuario_red',
  timestamps: false, // Desactivamos timestamps automáticos ya que usamos fecha_union
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['id_usuario'] // Garantiza un único registro por usuario
    }
  ]
});

// Relación con el modelo Usuario (asumiendo que existe)
UsuarioRed.associate = function(models) {
  UsuarioRed.belongsTo(models.Usuario, {
    foreignKey: 'id_usuario',
    targetKey: 'id_usuario',
    as: 'usuario'
  });
};

export default UsuarioRed;