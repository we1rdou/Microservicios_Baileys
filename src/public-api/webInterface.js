import express from 'express';
import { connectToWhatsApp, disconnectFromWhatsApp, getSock } from '../services/whatsappService.js';

const router = express.Router();

let connectionState = {};
let qrCode = {};

export const updateConnectionState = (sessionId, state, qr) => {
    connectionState[sessionId] = state;
    qrCode[sessionId] = qr;
};

// Verificar si hay una sesión activa
router.get('/status/:phone', async (req, res) => {
    const { phone } = req.params;

    if (!connectionState[phone]) {
        return res.status(404).json({ message: `No hay sesión activa para el número ${phone}` });
    }

    res.json({ connectionState: connectionState[phone], qrCode: qrCode[phone] });
});

// Iniciar sesión y generar QR
router.post('/session/:phone', async (req, res) => {
    const { phone } = req.params;

    try {
        const qrCode = await connectToWhatsApp(phone, { generateQrOnly: true });
        res.status(200).json({ qrCode });
    } catch (error) {
        console.error(`Error al iniciar sesión para ${phone}:`, error.message);
        res.status(401).json({ message: 'Número no autorizado o error al iniciar sesión' });
    }
});

// Cerrar sesión
router.post('/logout/:phone', async (req, res) => {
    const { phone } = req.params;

    try {
        if (!connectionState[phone]) {
            return res.status(404).json({ message: `No hay sesión activa para el número ${phone}` });
        }

        await disconnectFromWhatsApp(phone);
        delete connectionState[phone];
        delete qrCode[phone];

        res.json({ message: `Sesión cerrada para el número ${phone}` });
    } catch (error) {
        console.error(`Error al cerrar sesión para ${phone}:`, error.message);
        res.status(500).json({ message: 'Error al cerrar sesión' });
    }
});

export default router;