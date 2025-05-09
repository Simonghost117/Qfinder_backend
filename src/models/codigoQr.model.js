import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";

const codigoQr = sequelize.define(
  "codigoQr",
  {
    id_qr: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "id_qr",
    },
    id_paciente: {
      type: DataTypes.INTEGER,
      allowNull: false,
    
    },
    codigo: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "codigo",
    },
  },
  {
    tableName: "codigo_qr",
    timestamps: true,
  }
);
export default codigoQr;