export async function enviarMensaje(numero, mensaje, io) {
  io.emit('mensaje', { numero, mensaje });
}
