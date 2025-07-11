import bcrypt from 'bcryptjs';
import { generateJWT } from '../services/tokenService.js';
import User  from '../database/model/User.js';
import Device from '../database/model/Device.js';
import { verificarCredenciales, setTokenCookie } from '../utils/authUtils.js';

// funcion para verificar si el usuario es admin
export const loginAdmin = async (req, res) => {
  const { username, password } = req.body;
  const resultado = await verificarCredenciales(username, password);

  if (!resultado.success){
    return res.status(401).json({ error: resultado.error });
  }

  const user = resultado.user;

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'No tienes permisos de administrador' });
  }

  const token = generateJWT({ id: user.id, role: user.role }, '1d');
  setTokenCookie(res, token);

  res.json({
    message: 'Login exitoso',
    username: user.username,
    role: user.role
  });
};

// Controlador para registrar un nuevo número de teléfono
export const registrarNumero = async (req, res) => {
  try {
    const { telefono, role = 'user' } = req.body;
    if (!telefono) return res.status(400).json({ error: 'Número requerido' });
    // Validación para números ecuatorianos
    let numeroNormalizado = telefono.toString().replace(/\D/g, ''); // Eliminar no dígitos
    
    // Normalizar si empieza con 0
    if (numeroNormalizado.startsWith('0')) {
      numeroNormalizado = '593' + numeroNormalizado.substring(1);
    }
    
    // Validar formato ecuatoriano
    const numeroRegex = /^593\d{9}$/; // 593 seguido de 9 dígitos
    if (!numeroRegex.test(numeroNormalizado)) {
      return res.status(400).json({ 
        error: 'El número debe tener formato ecuatoriano: 593 seguido de 9 dígitos' 
      });
    }

    // Usar el número normalizado para el resto del proceso
    const existe = await User.findOne({ where: { username: numeroNormalizado } });
    if (existe) return res.status(400).json({ error: 'Este número ya está registrado' });

    const passwordPlano = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(passwordPlano, 10);

    const user = await User.create({
      username: numeroNormalizado, // Usar el número normalizado
      password: hashedPassword,
      role
    });

    const device = await Device.create({
      telefono: numeroNormalizado, // Usar el número normalizado
      userId: user.id,
      estado: 'desconectado',
      token: null,
      expiraHasta: null
    });

    res.json({
      message: 'Usuario y dispositivo creados correctamente',
      credentials: {
        username: numeroNormalizado,
        password: passwordPlano,
      },
      device: {
        id: device.id,
        estado: device.estado,
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Login para usuario normal (no administrador)
export const loginUsuario = async (req, res) => {
  const { username, password } = req.body;
  const resultado = await verificarCredenciales(username, password);

  if (!resultado.success) {
    return res.status(401).json({ error: resultado.error });
  }

  const user = resultado.user;

  const token = generateJWT({ id: user.id, role: user.role }, '1d');
  setTokenCookie(res, token);

  res.json({
    message: 'Login de usuario exitoso',
    username: user.username,
    role: user.role,
    passwordTemporal: user.passwordTemporal
  });
};

// Añadir al final del archivo
export const cambiarPassword = async (req, res) => {
  try {
    const userId = req.user.id; // Extraído del token JWT mediante middleware
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 8 caracteres' 
      });
    }

     // Validación más completa
    const validacionCompleta = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;
    if (!validacionCompleta.test(password)) {
      return res.status(400).json({ 
        error: 'La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales' 
      });
    }
    
    // Hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Actualizar en la base de datos
    await User.update({
      password: hashedPassword,
      passwordTemporal: false // Marcar como contraseña permanente
    }, { 
      where: { id: userId } 
    });
    
    return res.json({ 
      message: 'Contraseña actualizada correctamente' 
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return res.status(500).json({ 
      error: 'Error al actualizar contraseña' 
    });
  }
};