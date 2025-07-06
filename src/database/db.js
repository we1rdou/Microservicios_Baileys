import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// En producción (Render), usar directorio persistente
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/var/data/database.sqlite'  // Directorio persistente en Render
  : path.join(__dirname, '../../database.sqlite');  // Local development

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
});

export default sequelize;
