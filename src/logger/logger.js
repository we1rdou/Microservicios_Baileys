export default function logger(mensaje) {
  console.log(`[LOG] ${new Date().toISOString()} - ${mensaje}`);
}
