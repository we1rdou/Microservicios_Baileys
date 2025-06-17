import express from 'express';
import fs from 'fs';
import path from 'path';
import { connectToWhatsApp, disconnectFromWhatsApp, getSessionState, getSessionsStates } from '../services/whatsappService.js';
import verifyTokenMiddleware from '../auth/verifyToken.js';

const router = express.Router();

// Mapa para almacenar estados de conexión por sesión
const connectionStates = new Map();

export const updateConnectionState = (sessionId, state, qr) => {
    connectionStates.set(sessionId, { connectionState: state, qrCode: qr });
};

// Obtener estado de una sesión específica
router.get('/status/:sessionId', verifyTokenMiddleware, (req, res) => {
    const { sessionId } = req.params;
    
    // Verificar que el usuario tenga acceso a esta sesión
    if (req.user.phone !== sessionId) {
        return res.status(403).json({ error: 'No tienes acceso a esta sesión' });
    }
    
    const sessionState = getSessionState(sessionId);
    const connectionState = connectionStates.get(sessionId) || sessionState;
    
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
    
    // Verificar que el usuario tenga acceso a esta sesión
    if (req.user.phone !== sessionId) {
        return res.status(403).json({ error: 'No tienes acceso a esta sesión' });
    }
    
    try {
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

// Inicializar nueva sesión
router.post('/init-session/:sessionId', verifyTokenMiddleware, async (req, res) => {
    const { sessionId } = req.params;
    
    // Verificar que el usuario tenga acceso a esta sesión
    if (req.user.phone !== sessionId) {
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

export default router;