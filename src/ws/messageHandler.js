import { getSock } from "../services/whatsappService.js";

export async function enviarMensaje(sessionId, numero, mensaje, io) {
  try{
    const sock = getSock(sessionId);

    if(!sock){
      throw new Error(`No hay conexión activa con WhatsApp para la sesión: ${sessionId}`);
    }

    const numeroFormateado = numero.includes("@s.whatsapp.net")
    ? numero
      : `${numero}@s.whatsapp.net`;

    await sock.sendMessage(numeroFormateado, { text: mensaje });

    if (io) io.emit("mensajeEnviado", { sessionId, numero, mensaje });
    console.log(`[${sessionId}] Mensaje enviado a ${numero}: ${mensaje}`);

  }catch(error){
    console.error(`[${sessionId}] Error al enviar el mensaje a: ${numero}:` , error);
    throw error;
  }
  if (io) io.emit('mensaje', { sessionId, numero, mensaje });
}

export async function enviarArchivo(sessionId, numero, buffer, mimetype, nombre, io) {
  try {
    const sock = getSock(sessionId);

    if (!sock) {
      throw new Error(`No hay conexión activa con WhatsApp para la sesión: ${sessionId}`);
    }

    const numeroFormateado = numero.includes("@s.whatsapp.net")
      ? numero
      : `${numero}@s.whatsapp.net`;

    let mensaje;
    if (mimetype.startsWith('image/')) {
      mensaje = { image: buffer };
    } else {
      mensaje = { document: buffer, mimetype, fileName: nombre };
    }

    await sock.sendMessage(numeroFormateado, mensaje);

    if (io) io.emit("archivoEnviado", { sessionId, numero, nombre });
    console.log(`[${sessionId}] Archivo enviado a ${numero}: ${nombre}`);

  } catch (error) {
    console.error(`[${sessionId}] Error al enviar el archivo a: ${numero}:`, error);
    throw error;
  }
}