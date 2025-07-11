import express from 'express';
import multer from 'multer';
import verifyTokenMiddleware from '../auth/verifyToken.js';
import mainController from '../controllers/messageController.js';
import ActivityLog from '../database/model/ActivityLog.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/enviar', verifyTokenMiddleware, upload.single('archivo'), async (req, res) => {
    let { numero, mensaje } = req.body;
    const sessionId = req.user.telefono;
    const archivo = req.file;

    try {
        if (!Array.isArray(numero)) numero = [numero];
        if (!Array.isArray(mensaje)) mensaje = [mensaje];

        const results = [];

        // Si hay archivo, envía el archivo a todos los números
        if (archivo) {
            for (let i = 0; i < numero.length; i++) {
                await mainController.enviarArchivo(sessionId, numero[i], archivo, req.app.get('io'));
                if (mensaje && mensaje[0]) {
                    const msg = mensaje[i] !== undefined ? mensaje[i] : mensaje[0];
                    await mainController.enviarMensaje(sessionId, numero[i], msg, req.app.get('io'));
                }
                if (req.user && req.user.id) {
                    await ActivityLog.create({
                        accion: 'Enviar archivo',
                        descripcion: `Archivo enviado a ${numero[i]}`,
                        userId: req.user.id,
                        ip: req.ip,
                        userAgent: req.headers['user-agent']
                    });
                }
                results.push({ numero: numero[i], archivo: archivo.originalname, estado: 'Archivo enviado' });
            }
        } else {
            // Lógica de mensajes de texto (igual que antes)
            if (numero.length === 1 && mensaje.length > 1) {
                for (let i = 0; i < mensaje.length; i++) {
                    const msg = mensaje[i];
                    await mainController.enviarMensaje(sessionId, numero[0], msg, req.app.get('io'));
                    if (req.user && req.user.id) {
                        await ActivityLog.create({
                            accion: 'Enviar mensaje',
                            descripcion: `Mensaje enviado a ${numero[0]}`,
                            userId: req.user.id,
                            ip: req.ip,
                            userAgent: req.headers['user-agent']
                        });
                    }
                    results.push({ numero: numero[0], mensaje: msg, estado: 'Mensaje enviado' });
                }
            } else {
                for (let i = 0; i < numero.length; i++) {
                    const num = numero[i];
                    const msg = mensaje[i] !== undefined ? mensaje[i] : mensaje[0];
                    await mainController.enviarMensaje(sessionId, num, msg, req.app.get('io'));
                    if (req.user && req.user.id) {
                        await ActivityLog.create({
                            accion: 'Enviar mensaje',
                            descripcion: `Mensaje enviado a ${num}`,
                            userId: req.user.id,
                            ip: req.ip,
                            userAgent: req.headers['user-agent']
                        });
                    }
                    results.push({ numero: num, mensaje: msg, estado: 'Mensaje enviado' });
                }
            }
        }

        res.json({ estado: 'Envío completado', resultados: results, sessionId });
    } catch (error) {
        res.status(500).json({ error: 'Error al enviar', details: error.message });
    }
});

export default router;