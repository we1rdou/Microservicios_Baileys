let clientes = {};

export function conectar(clienteId, socket) {
  clientes[clienteId] = socket;
}

export function obtenerSocket(clienteId) {
  return clientes[clienteId];
}
