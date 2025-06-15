import logger from '../logger/logger.js';
import { enviarMensaje } from '../ws/messageHandler.js';

export default {
  async enviarMensaje(sessionId, numero, mensaje, io) {
    logger(`[${sessionId}] Enviando mensaje a ${numero}`);
    await enviarMensaje(sessionId, numero, mensaje, io);
  }
};