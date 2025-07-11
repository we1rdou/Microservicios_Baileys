import { logger } from '../utils/authUtils.js';
import { enviarMensaje, enviarArchivo } from '../ws/messageHandler.js'; // <-- agrega enviarArchivo

// Controlador para enviar mensajes y archivos
// Este controlador maneja tanto el envío de mensajes de texto como de archivos
export default {
  async enviarMensaje(sessionId, numero, mensaje, io) {
    logger(`[${sessionId}] Enviando mensaje a ${numero}`);
    await enviarMensaje(sessionId, numero, mensaje, io);
  },
  
  async enviarArchivo(sessionId, numero, archivo, io) {
    logger(`[${sessionId}] Enviando archivo a ${numero}: ${archivo.originalname}`);
    await enviarArchivo(sessionId, numero, archivo.buffer, archivo.mimetype, archivo.originalname, io);
  }
};