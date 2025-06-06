import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT;
export const JWT_SECRET = process.env.JWT_SECRET;
export const MONGO_URI = process.env.MONGO_URI;

if (!JWT_SECRET) {
  throw new Error('Falta JWT_SECRET en el entorno');
}
