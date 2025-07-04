import { generarTokenParaDispositivo } from '../services/deviceService.js';
import ms from 'ms';
import { generateJWT } from '../services/tokenService.js';
import bcrypt from 'bcryptjs';
import User from '../database/model/User.js';
import Device from '../database/model/Device.js';

export const confirmarConexionDispositivo = async (req, res) => {
  try {
    const { telefono } = req.body;
    const { token, expiraHasta } = await generarTokenParaDispositivo(telefono);

    res.json({
      message: 'Dispositivo conectado correctamente',
      token,
      expiraHasta
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Controlador para regenerar el token de un dispositivo
export const regenerarTokenDispositivo = async (req, res) => {
  try {
    const { id } = req.params;
    const expiraEn = '365d';
    const expiraMilisegundos = ms(expiraEn);
    const expiraHasta = new Date(Date.now() + expiraMilisegundos);

    const device = await Device.findByPk(id);
    if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });

    const deviceToken = generateJWT({
      deviceId: device.id,
      telefono: device.telefono,
      role: 'device'
    }, expiraEn);

    device.token = deviceToken;
    device.expiraHasta = expiraHasta;
    await device.save();

    res.json({
      message: 'Nuevo token generado correctamente',
      token: deviceToken,
      expiraHasta: expiraHasta.toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al regenerar token' });
  }
};


export const verTokenContrasena = async (req, res) => {
  const { telefono, password } = req.body;

  try{
    const user = await User.findOne({ where: { username: telefono } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const device = await Device.findOne({ where: { userId: user.id } });
    if (!device || !device.token){
      return res.status(404).json({ error: 'Dispositivo no encontrado o no tiene token' });
    }

    res.json({
      token: device.token,
      expiraHasta: device.expiraHasta
    });

  }catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar el token' });
  }
}