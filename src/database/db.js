import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Recrear __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// En producción (Render), usar directorio con permisos
const dbPath = process.env.NODE_ENV === 'production' 
  ? './database.sqlite'  // Directorio del proyecto en Render
  : path.join(__dirname, '../../database.sqlite');  // Local development

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
});

export default sequelize;
