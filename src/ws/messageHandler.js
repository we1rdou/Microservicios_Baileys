import { getSock } from "../services/whatsappService.js";

export async function enviarMensaje(numero, mensaje, io) {
  try{
    const sock = getSock();

    if(!sock){
      throw new Error("No hay conexión activa con WhatsApp");
    }

    const numeroFormateado = numero.includes("@s.whatsapp.net")
    ? numero
      : `${numero}@s.whatsapp.net`;

    await sock.sendMessage(numeroFormateado, { text: mensaje });

    if (io) io.emit("mensajeEnviado", { numero, mensaje });
    console.log(`Mensaje enviado a ${numero}: ${mensaje}`);

  }catch(error){
    console.error(`Error al enviar el mensaje a: ${numero}:` , error);
    throw error;
  }
  io.emit('mensaje', {numero, mensaje});
}