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