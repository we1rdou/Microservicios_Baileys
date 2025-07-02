import express from 'express';
import qrcode from 'qrcode';
import verifyTokenMiddleware from '../auth/verifyToken.js';
import {
  connectToWhatsApp,
  disconnectFromWhatsApp,
  getSessionInfo,
  getSessionsStates,
  getSessionState,
  setSessionState,
} from '../services/whatsappService.js';
import { isNumberAuthorized } from '../services/numberAuthService.js';
import { verificarTokenConContrasena } from '../services/deviceService.js';
import User  from '../database/model/User.js';
import Device from '../database/model/Device.js';

// router setup
const router = express.Router();
const connectionStates = new Map();

// Obtener información del usuario autenticado
router.get('/me', verifyTokenMiddleware, async (req, res) => {
  try {
    //console.log('Obteniendo información del usuario:', req.user);

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// 🔄 Se exporta para que WhatsAppService pueda actualizar estados
export const updateConnectionState = (sessionId, state, qr = '', mensaje = '') => {
    const newState = { 
        connectionState: state, 
        qrCode: qr, 
        mensaje,
        lastUpdated: Date.now() // Añade timestamp
    };
    connectionStates.set(sessionId, newState);
    // Sincroniza con tu servicio de WhatsApp
    setSessionState(sessionId, newState);
};

// Nueva ruta: Mostrar QR 
router.get('/qr/:sessionId', verifyTokenMiddleware, async (req, res) => {
    const { sessionId } = req.params;

    const user = await User.findByPk(req.user.id)
    if (!user || user.username !== sessionId) {
        return res.status(403).json({ error: 'No autorizado' });
    }

    try {
        const sessionData = await getSessionInfo(sessionId); 
        if (!sessionData?.qrCode) {
            return res.status(404).json({ error: 'QR no disponible o ya conectado' });
        }

        const dataURL = await qrcode.toDataURL(sessionData.qrCode);
        return res.json({ qr: dataURL });
    } catch (err) {
        console.error(`[${sessionId}] ❌ Error generando QR:`, err);
        return res.status(500).json({ error: 'Error generando el QR' });
    }
});

// Obtener estado de una sesión específica
router.get('/status/:sessionId', verifyTokenMiddleware, async (req, res) => {
    const { sessionId } = req.params;

    // 1. Verificar autorización
    const user = await User.findByPk(req.user.id);
    if (!user || user.username !== sessionId) {
        return res.status(403).json({ error: 'No tienes acceso a esta sesión' });
    }

    // 2. Obtener estados
    const sessionInfo = await getSessionInfo(sessionId);
    const memoryState = connectionStates.get(sessionId) || {};
    const connectionState = {
        ...memoryState,
        ...sessionInfo
    };
    const device = await Device.findOne({ where: { telefono: sessionId } });

    // 3. Determinar si debe mostrarse el token (SOLO primera conexión)
    const mostrarToken = device?.tokenVisible === true && 
                       !req.headers['x-referer-reload']; // Cabecera personalizada

    // 4. Preparar respuesta
    const response = {
        ...connectionState,
        mostrarToken,
        // NUNCA enviar el token aquí, solo el flag
        token: undefined
    };

    // 5. Si es primera vez, marcar como visto después de enviar la respuesta
    if (mostrarToken && device) {
        setTimeout(async () => {
            await device.update({ tokenVisible: false });
        }, 0);
    }

    res.json(response);
});

// Obtener todas las sesiones (solo para admin)
router.get('/sessions', verifyTokenMiddleware, (req, res) => {
    const states = getSessionsStates();
    res.json(states);
});

// Cerrar sesión (logout tradicional)
router.post('/logout/:sessionId', verifyTokenMiddleware, async (req, res) => {
    const { sessionId } = req.params;

    try {
        const user = await User.findByPk(req.user.id);
        if (!user || user.username !== sessionId) {
            return res.status(403).json({ error: 'No autorizado' });
        }

        // Limpiar cookies/token JWT
        res.clearCookie('jwt_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict'
        });

        res.json({ message: 'Sesión cerrada exitosamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
});

// Desvincular dispositivo (logout + eliminar dispositivo)
// Desvincular dispositivo (logout + desactivar dispositivo)
router.post('/unlink-device/:sessionId', verifyTokenMiddleware, async (req, res) => {
  const { sessionId } = req.params;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user || user.username !== sessionId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // 1. Desconectar de WhatsApp
    await disconnectFromWhatsApp(sessionId);

    // 2. Desactivar el dispositivo (soft delete lógico)
    const device = await Device.findOne({ where: { telefono: sessionId } });

    if (device) {
      await device.update({
        activo: false,
        fechaDesvinculacion: new Date(),
      });
    } else {
      console.warn(`[${sessionId}] ⚠️ Dispositivo no encontrado para desactivar`);
    }

    res.json({ message: 'Dispositivo desvinculado exitosamente' });
  } catch (err) {
    console.error(`❌ Error al desvincular dispositivo ${sessionId}:`, err);
    res.status(500).json({ error: 'Error al desvincular dispositivo' });
  }
});


// Detener generación de QR
router.post('/stop-qr/:sessionId', (req, res) => {
    const { sessionId } = req.params;

    const sessionState = getSessionState(sessionId);
    if (sessionState) {
        sessionState.qrStopped = true;
        setSessionState(sessionId, sessionState);
        console.log(`[${sessionId}] 🛑 Generación de QR detenida por frontend`);
        return res.json({ success: true });
    }

    res.status(404).json({ error: 'Sesión no encontrada' });
});

// Inicializar nueva sesión
router.post('/init-session/:sessionId', verifyTokenMiddleware, async (req, res) => {
    const { sessionId } = req.params;

    const user = await User.findByPk(req.user.id)
    if (!user || user.username !== sessionId) {
        return res.status(403).json({ error: 'No tienes acceso a esta sesión' });
    }

    try {
        await connectToWhatsApp(sessionId);
        res.json({ message: `Sesión ${sessionId} inicializada` });
    } catch (error) {
        console.error(`Error al inicializar sesión ${sessionId}:`, error);
        res.status(500).json({ message: 'Error al inicializar sesión' });
    }
});

// Verificar token con contraseña
router.post('/verify-token-access/:sessionId', verifyTokenMiddleware, async (req, res) => {
  const { sessionId } = req.params;
  const { password } = req.body;

  try {
    const result = await verificarTokenConContrasena(sessionId, password);
    res.status(200).json(result); // Devuelve la respuesta estructurada
  } catch (err) {
    console.error(`Error en verify-token-access para ${sessionId}:`, err);
    res.status(401).json({ 
      success: false,
      error: err.message 
    });
  }
});

export default router;