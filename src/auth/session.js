import express from 'express';
import { generateJWT } from '../services/tokenService.js';
import { isNumberAuthorized } from '../services/numberAuthService.js';

const router = express.Router();

router.post('/session', (req, res) => {
    const { phone } = req.body; // debe venir del frontend

    if (!phone || !isNumberAuthorized(phone)) {
        return res.status(403).json({ error: 'Número no autorizado' });
    }

    const token = generateJWT({ phone });
    res.cookie('jwt_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 86400000,
    });

    res.json({ message: 'Sesión iniciada', phone });
});

export default router;
