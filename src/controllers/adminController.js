import User from '../database/model/User.js';
import Device from '../database/model/Device.js';
import bcrypt from 'bcryptjs';
import ActivityLog from '../database/model/ActivityLog.js';

// Obtener todos los usuarios
export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await User.findAll({ 
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']] 
    });
    res.json({ success: true, data: usuarios });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener usuarios' 
    });
  }
};

// Obtener todos los dispositivos
export const listarDispositivos = async (req, res) => {
  try {
    const dispositivos = await Device.findAll({
      order: [['createdAt', 'DESC']],
      include: [User] // ✅ No uses 'user' como string, usa el modelo
    });

    res.json({ success: true, data: dispositivos });
  } catch (error) {
    console.error('Error en listarDispositivos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener dispositivos'
    });
  }
};

// Asignar una nueva contraseña aleatoria a un usuario
export const asignarPasswordUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await User.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ 
        success: false, 
        error: 'Usuario no encontrado' 
      });
    }

    const nuevaPassword = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(nuevaPassword, 10);

    usuario.password = hash;
    usuario.passwordTemporal = true; // Marcar como temporal
    await usuario.save();
    
    res.json({ 
      success: true, 
      message: 'Contraseña asignada correctamente',
      nuevaPassword
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al asignar contraseña' 
    });
  }
};

// Ver actividad de un usuario
export const verActividadUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const logs = await ActivityLog.findAll({
      where: { userId: id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'username']
        },
        {
          model: Device,
          attributes: ['id', 'telefono']
        }
      ]
    });

    res.json({ data: logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener actividad del usuario' });
  }
};
