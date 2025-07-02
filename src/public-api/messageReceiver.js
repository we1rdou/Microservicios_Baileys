import express from 'express';
import verifyTokenMiddleware from '../auth/verifyToken.js';
import mainController from '../controllers/mainController.js';

const router = express.Router();

router.post('/enviar', verifyTokenMiddleware, async (req, res) => {
    const { numero, mensaje } = req.body;
    const sessionId = req.user.telefono;

    try {
        await mainController.enviarMensaje(sessionId, numero, mensaje, req.app.get('io'));
        res.json({ estado: 'Mensaje enviado', sessionId });
    } catch (error) {
        res.status(500).json({ error: 'Error al enviar mensaje', details: error.message });
    }
});


export default router;