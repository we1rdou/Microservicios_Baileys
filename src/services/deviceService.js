// src/services/deviceService.js
import User from '../database/model/User.js';
import Device from '../database/model/Device.js';
import { generateJWT } from './tokenService.js';
import ms from 'ms';
import bcrypt from 'bcryptjs';


// Función para generar un token JWT para un dispositivo
// Este token se usará para autenticar el dispositivo en futuras solicitudes
export async function generarTokenParaDispositivo(telefono) {
  const user = await User.findOne({ where: { username: telefono } });
  if (!user) throw new Error('Usuario no encontrado');

  const device = await Device.findOne({ where: { userId: user.id } });
  if (!device) throw new Error('Dispositivo no encontrado');

  const ahora = new Date();

  // Verificar si el token ya existe y no ha expirado
  // Si el token es válido, lo reutilizamos
  if (device.token && device.expiraHasta && new Date(device.expiraHasta) > ahora) {

    console.log(`[${telefono}] 📌 Token aún válido, no se regenera`);
    return{
        token: device.token,
        expiraHasta: new Date(device.expiraHasta).toISOString(),
        userId: user.id,
        deviceId: device.id,
        reutilizado: true
    };
  }

  const esPrimeraVez = device.tokenVisible;

  if (device.token && !device.tokenVisible){
    return{
      token: null,
      requiereContrasena: true,
      expiraHasta: device.expiraHasta.toISOString(),
    }
  }

  if (esPrimeraVez){
    device.tokenVisible = false;
    await device.save();
  }

  // Si el token no existe o ha expirado, lo regeneramos
  const expiraEn = '365d'
  const expiraMilisegundos = ms(expiraEn);
  const expiraHasta = new Date(Date.now() + expiraMilisegundos);

  const deviceToken = generateJWT({
    userId: user.id,
    deviceId: device.id,
    telefono: user.username,
    role: 'device'
  }, expiraEn);

  device.token = deviceToken;
  device.expiraHasta = expiraHasta;
  device.estado = 'conectado';
  await device.save();

  return {
    token: esPrimeraVez ? deviceToken : null,
    expiraHasta: expiraHasta.toISOString(),
    requiereContrasena: !esPrimeraVez,
    userId: user.id,
    deviceId: device.id
  };
}

// Función para verificar el token con la contraseña del usuario
export async function verificarTokenConContrasena(telefono, password) {
  try {
    const user = await User.findOne({ where: { username: telefono } });
    if (!user) throw new Error('Usuario no encontrado');
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Contraseña incorrecta');

    const device = await Device.findOne({ where: { userId: user.id } });
    if (!device?.token) throw new Error('Token no disponible');

    // Si el token es visible, lo retornamos
    if (!device.tokenVisible) {
      await device.update({tokenVisible: true}); // Marcar como visible para la primera conexión
    } 
    return {
      success: true,
      message: 'Token verificado correctamente',
      token: device.token,
      expiraHasta: device.expiraHasta
    };
  } catch (error) {
    console.error(`Error verificando token para ${telefono}:`, error);
    throw error; // Re-lanzar para que el controlador maneje
  }
}
