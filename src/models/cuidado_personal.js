export default (sequelize, DataTypes) => {
    const CuidadoPersonal = sequelize.define('CuidadoPersonal', {
      id_registro: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
      },
      id_paciente: { 
        type: DataTypes.INTEGER, 
        allowNull: false 
      },
      fecha: { 
        type: DataTypes.DATE, 
        allowNull: false, 
        defaultValue: DataTypes.NOW 
      },
      tipo_cuidado: { 
        type: DataTypes.ENUM('higiene', 'vestido', 'aseo', 'movilidad', 'otro'), 
        allowNull: false 
      },
      descripcion_cuidado: { 
        type: DataTypes.TEXT 
      },
      nivel_asistencia: { 
        type: DataTypes.ENUM('independiente', 'supervisado', 'asistido', 'dependiente'), 
        allowNull: false 
      },
      observaciones: { 
        type: DataTypes.TEXT 
      }
    }, {
      tableName: 'cuidado_personal',
      timestamps: false
    });
  
    return CuidadoPersonal;
  };
  