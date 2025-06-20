import express from 'express';
import { connectToWhatsApp, disconnectFromWhatsApp, getSessionInfo, 
    getSessionsStates, getSessionState, setSessionState } from '../services/whatsappService.js';
import verifyTokenMiddleware from '../auth/verifyToken.js';
import qrcode from 'qrcode';

const router = express.Router();

// Mapa para almacenar estados de conexión por sesión
export const connectionStates = new Map();

// 🔄 Se exporta para que WhatsAppService pueda actualizar estados
export const updateConnectionState = (sessionId, state, qr = '', mensaje = '') => {
    connectionStates.set(sessionId, { connectionState: state, qrCode: qr, mensaje });
};

// ✅ Nueva ruta: Mostrar QR 
router.get('/qr/:sessionId', verifyTokenMiddleware, async (req, res) => {
    const { sessionId } = req.params;

    if (req.user.username !== sessionId) {
        return res.status(403).json({ error: 'No autorizado' });
    }

    try {
        const sessionData = getSessionInfo(sessionId); // ✅ más confiable que connectionStates
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
router.get('/status/:sessionId', verifyTokenMiddleware, (req, res) => {
    const { sessionId } = req.params;

    if (req.user.username !== sessionId) {
        return res.status(403).json({ error: 'No tienes acceso a esta sesión' });
    }

    const sessionState = getSessionInfo(sessionId);
    const connectionState = connectionStates.get(sessionId) || sessionState;

    // Siempre muestra el último mensaje si existe
    if (!connectionState.mensaje && sessionState?.mensaje) {
        connectionState.mensaje = sessionState.mensaje;
    }

    res.json(connectionState);
});

// Obtener todas las sesiones (solo para admin)
router.get('/sessions', verifyTokenMiddleware, (req, res) => {
    const states = getSessionsStates();
    res.json(states);
});

// Cerrar sesión específica
router.post('/logout/:sessionId', verifyTokenMiddleware, async (req, res) => {
    const { sessionId } = req.params;

    if (req.user.username !== sessionId) {
        return res.status(403).json({ error: 'No tienes acceso a esta sesión' });
    }

    try {
        // ✅ Marcar como logout intencional ANTES de cerrar sesión
        const state = getSessionState(sessionId);
        if (state) {
            state.isLogoutIntentional = true;
            setSessionState(sessionId, state);
        }

        await disconnectFromWhatsApp(sessionId);
        connectionStates.delete(sessionId);

        res.clearCookie('jwt_token', {
            httpOnly: true,
            secure: false,
            sameSite: 'Strict',
        });

        res.json({ message: `Sesión ${sessionId} cerrada correctamente` });
    } catch (error) {
        console.error(`Error al cerrar sesión ${sessionId}:`, error);
        res.status(500).json({ message: 'Error al cerrar sesión' });
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

    if (req.user.username !== sessionId) {
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

// Obtener información del usuario autenticado
router.get('/me', verifyTokenMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
  });
});

export default router;
