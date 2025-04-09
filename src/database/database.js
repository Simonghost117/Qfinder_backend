import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize('midqfinder', 'root', 'Qfinder2024!', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false, // o true para ver las consultas
});
