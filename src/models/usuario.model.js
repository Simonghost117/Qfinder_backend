import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Usuario = sequelize.define('Usuario', {
    id_usuario: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: 'id_usuario'
    },
    nombre_usuario: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'nombre_usuario'
    },
    correo_usuario: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'correo_usuario'
    },
    contrasena_usuario: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'contrasena_usuario'
    },
    tipo_usuario: {
        type: DataTypes.ENUM('Usuario', 'Medico', 'Administrador'),
        allowNull: false,
        field: 'tipo_usuario'
    },
    estado_usuario: {
        type: DataTypes.ENUM('Activo', 'Inactivo'),
        defaultValue: 'Activo',
        field: 'estado_usuario'
    }
}, {
    tableName: 'usuario',
    timestamps: true,
    freezeTableName: true
});

export default Usuario;