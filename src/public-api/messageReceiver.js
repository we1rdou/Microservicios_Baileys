import verifyToken from '../auth/verifyToken.js';
import mainController from '../controllers/mainController.js';

export default function (app, io) {
  app.post('/enviar', async (req, res) => {
    const { numero, mensaje, token } = req.body;

    if (!verifyToken(token)) {
      return res.status(403).json({ error: 'Token inválido' });
    }

    try {
      await mainController.enviarMensaje(numero, mensaje, io);
      res.json({ estado: 'Mensaje enviado' });
    } catch (error) {
      res.status(500).json({ error: 'Error al enviar mensaje' });
    }
  });
}
