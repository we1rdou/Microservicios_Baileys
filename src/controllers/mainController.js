import logger from '../logger/logger.js';
import { enviarMensaje } from '../ws/messageHandler.js';

export default {
  async enviarMensaje(numero, mensaje, io) {
    logger(`Enviando mensaje a ${numero}`);
    await enviarMensaje(numero, mensaje, io);
  }
};
