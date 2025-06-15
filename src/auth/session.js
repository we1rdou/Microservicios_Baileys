import express from 'express';
import { generateJWT } from '../services/tokenService.js';
import { isNumberAuthorized } from '../services/numberAuthService.js';
import { connectToWhatsApp } from '../services/whatsappService.js';

const router = express.Router();

router.post('/session', async (req, res) => {
    const { phone } = req.body;

    if (!phone || !isNumberAuthorized(phone)) {
        return res.status(403).json({ error: 'Número no autorizado' });
    }

    try {
        // Inicializar sesión de WhatsApp para este número
        await connectToWhatsApp(phone);
        
        const token = generateJWT({ phone, sessionId: phone });
        res.cookie('jwt_token', token, {
            httpOnly: true,
            secure: false, // cambiar a true en producción con HTTPS
            sameSite: 'Strict',
            maxAge: 86400000,
        });

        res.json({ message: 'Sesión iniciada', phone, sessionId: phone });
    } catch (error) {
        console.error('Error al inicializar sesión:', error);
        res.status(500).json({ error: 'Error al inicializar sesión de WhatsApp' });
    }
});

export default router;