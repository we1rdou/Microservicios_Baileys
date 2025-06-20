import User from '../database/model/User.js';
import Device from '../database/model/Device.js';
import bcrypt from 'bcryptjs';
import { generateJWT } from '../services/tokenService.js';
import ms from 'ms';

export const loginAdmin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username y password requeridos' });
  }

  const user = await User.findOne({ where: { username } });
  if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });

  const token = generateJWT({ id: user.id, role: user.role, username: user.username }, '1d');

  user.token = token;
  await user.save();

  res.cookie('jwt_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: ms('1d'),
  });

  res.json({
    message: 'Login exitoso',
    username: user.username,
    role: user.role
  });
};

export const registrarNumero = async (req, res) => {
  try {
    const { telefono, role = 'user', expiraEn = '30d' } = req.body;
    if (!telefono) return res.status(400).json({ error: 'Número requerido' });

    const existe = await User.findOne({ where: { username: telefono } });
    if (existe) return res.status(400).json({ error: 'Este número ya está registrado' });

    const passwordPlano = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(passwordPlano, 10);

    const user = await User.create({
      username: telefono,
      password: hashedPassword,
      role
    });

    const expiraMilisegundos = ms(expiraEn);
    const expiraHasta = new Date(Date.now() + expiraMilisegundos);

    // Token del usuario (por si deseas guardarlo también)
    const userToken = generateJWT(
      { id: user.id, username: telefono, role },
      expiraEn
    );
    user.token = userToken;
    await user.save();

    const device = await Device.create({
      telefono,
      userId: user.id,
      estado: 'desconectado',
    });

    const deviceToken = generateJWT({
      userId: user.id,
      deviceId: device.id,
      telefono,
      role: 'device'
    }, expiraEn);

    device.token = deviceToken;
    device.expiraHasta = expiraHasta;
    await device.save();

    res.json({
      message: 'Usuario y dispositivo creados correctamente',
      credentials: {
        username: telefono,
        password: passwordPlano,
        token: userToken,
        expiraHasta: expiraHasta.toISOString()
      },
      device: {
        id: device.id,
        estado: device.estado,
        token: device.token,
        expiraHasta: expiraHasta.toISOString()
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
