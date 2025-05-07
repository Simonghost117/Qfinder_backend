import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

  const CitaMedica = sequelize.define('CitaMedica', {
    id_cita: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true,
      field: 'id_cita'
    },
      id_paciente:{
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'id_paciente'
    },
    fecha_cita: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'fecha_cita'
    },
    motivo_cita: {
      type: DataTypes.TEXT,  
      allowNull: false,
      field: 'motivo_cita'
    },
    resultado_consulta: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'resultado_consulta'
    },
    estado_cita: {
      type: DataTypes.ENUM('programada', 'completada', 'cancelada'),
      defaultValue: 'programada',
      field: 'estado'
      },
    },
    {
      tableName: 'cita_medica',
      timestamps: false,
    });
  
export default CitaMedica;
  
  