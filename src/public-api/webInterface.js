import express from 'express';
import fs from 'fs';
import path from 'path';
import { connectToWhatsApp, disconnectFromWhatsApp } from '../services/whatsappService.js';
import verifyTokenMiddleware from '../auth/verifyToken.js';

const router = express.Router();

let connectionState = 'disconnected';
let qrCode = '';

export const updateConnectionState = (state, qr) => {
    connectionState = state;
    qrCode = qr;
};

router.get('/status', verifyTokenMiddleware, (req, res) => {
    res.json({ connectionState, qrCode });
});

router.post('/logout', verifyTokenMiddleware, async (req, res) => {
    try {
        await disconnectFromWhatsApp();
        connectionState = 'disconnected';
        qrCode = '';

        // Eliminar la carpeta de la sesión activa
        const sessionPath = path.resolve('./auth_info_multi');
        fs.rmSync(sessionPath, { recursive: true, force: true });

        res.clearCookie('jwt_token', {
            httpOnly: true,
            secure: false,       // solo en HTTPS
            sameSite: 'Strict',
        });

        // Generar un nuevo QR
        const newQrCode = await connectToWhatsApp({ generateQrOnly: true });
        qrCode = newQrCode;
        
        res.json({ message: 'Sesión cerrada y QR regenerado', qrCode });
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        res.status(500).json({ message: 'Error al cerrar sesión' });
    }
});

export default router;
