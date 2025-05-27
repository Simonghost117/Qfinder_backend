import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js'; 

    const CuidadoPersonal = sequelize.define('CuidadoPersonal', {
      id_registro: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true, 
        field: 'id_registro'
      },
      id_paciente: { 
        type: DataTypes.INTEGER, 
        allowNull: false, 
        field: 'id_paciente'
      },
      fecha: { 
        type: DataTypes.DATE, 
        allowNull: false, 
        defaultValue: DataTypes.NOW ,
        field: 'fecha'
      },
      tipo_cuidado: { 
        type: DataTypes.STRING, 
        allowNull: false,
        field: 'tipo_cuidado'
      },
      descripcion_cuidado: { 
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'descripcion_cuidado'
      },
      nivel_asistencia: { 
        type: DataTypes.ENUM('independiente', 'supervisado', 'asistido', 'dependiente'), 
        allowNull: false, 
        field: 'nivel_asistencia'
      },
      observaciones: { 
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'observaciones'
      },
      // notificado: {
      //   type: DataTypes.BOOLEAN,
      //   allowNull: false,
      //   defaultValue: false,
      //   field: 'notificado'
      // }
    }, {
      tableName: 'cuidado_personal',
      timestamps: false
    });

  export default CuidadoPersonal;
  