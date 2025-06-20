import User from '../database/model/User.js';
import Device from '../database/model/Device.js';

/**
 * Actualiza el estado del dispositivo (conectado/desconectado)
 */
export const actualizarEstadoDispositivo = async (telefono, nuevoEstado) => {
  const device = await Device.findOne({ where: { telefono } });
  if (device) {
    device.estado = nuevoEstado;
    await device.save();
    console.log(`[${telefono}] 🟡 Estado del dispositivo actualizado a '${nuevoEstado}'`);
  } else {
    console.warn(`[${telefono}] ⚠️ No se encontró el dispositivo para actualizar estado`);
  }
};

/**
 * Actualiza el token del usuario
 */
export const actualizarTokenUsuario = async (username, nuevoToken) => {
  const user = await User.findOne({ where: { username } });
  if (user) {
    user.token = nuevoToken;
    await user.save();
    console.log(`[${username}] 🔑 Token del usuario actualizado`);
  } else {
    console.warn(`[${username}] ⚠️ No se encontró el usuario para actualizar token`);
  }
};

/**
 * Actualiza el token del dispositivo y su expiración
 */
export const actualizarTokenDispositivo = async (telefono, nuevoToken, expiraHasta) => {
  const device = await Device.findOne({ where: { telefono } });
  if (device) {
    device.token = nuevoToken;
    device.expiraHasta = expiraHasta;
    await device.save();
    console.log(`[${telefono}] 🔐 Token del dispositivo actualizado`);
  } else {
    console.warn(`[${telefono}] ⚠️ No se encontró el dispositivo para actualizar token`);
  }
};
