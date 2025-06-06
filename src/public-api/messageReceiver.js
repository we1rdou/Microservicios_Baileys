import express from 'express';
import verifyTokenMiddleware from '../auth/verifyToken.js';
import mainController from '../controllers/mainController.js';

const router = express.Router();

router.post('/enviar', verifyTokenMiddleware, async (req, res) => {
    const { numero, mensaje } = req.body;

    try {
        await mainController.enviarMensaje(numero, mensaje, req.app.get('io'));
        res.json({ estado: 'Mensaje enviado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al enviar mensaje' });
    }
});

export default (app, io) => {
    app.set('io', io); // Para acceder a io desde el controlador si es necesario
    app.use('/api', router);
};