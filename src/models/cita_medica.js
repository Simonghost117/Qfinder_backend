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
        get() {
            const rawValue = this.getDataValue('fecha_cita');
            return rawValue ? new Date(rawValue.getTime() - (rawValue.getTimezoneOffset() * 60000)) : null;
        }
    },
    titulo: {
      type: DataTypes.STRING,  
      allowNull: false,
      field: 'titulo'
    },
    estado_cita: {
      type: DataTypes.ENUM('programada', 'completada', 'cancelada'),
      defaultValue: 'programada',
      field: 'estado'
    },
    descripcion: {
      type: DataTypes.TEXT,  
      allowNull: true,
      field: 'descripcion'
    },
      fecha_recordatorio: {
        type: DataTypes.DATE,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('fecha_recordatorio');
            return rawValue ? new Date(rawValue.getTime() - (rawValue.getTimezoneOffset() * 60000)) : null;
        }
      },
    notificado_1h: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'notificado_1h'
    },
    notificado_24h: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'notificado_24h'
    }
    },
    {
      tableName: 'cita_medica',
      timestamps: false,
    });
  
export default CitaMedica;
  
  