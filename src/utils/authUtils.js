import bcrypt from 'bcryptjs';
import User from '../database/model/User.js';

export const logger = (mensaje) => {
  console.log(`[LOG] ${new Date().toISOString()} - ${mensaje}`);
};

export const verificarCredenciales = async (username, password) => {
  const user = await User.findOne({ where: { username } });
  if (!user) return { success: false, error: 'Usuario no encontrado' };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return { success: false, error: 'Contraseña incorrecta' };

  return { success: true, user };
};

export const setTokenCookie = (res, token) => {
  res.cookie('jwt_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 día
  });
};
