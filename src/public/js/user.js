// Variables globales
let sessionId = null;
let intervaloEstado = null;
let ultimoEstado = null;
let qrRefreshInterval = null;
let tokenMostrado = false;
let ultimoQRMostrado = '';
let ultimoTextoQR = ''; 
let qrUpdateTimeout = null;

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
  // Limpiar estados de token al recargar
  if (performance.navigation.type === 1) { // 1 indica recarga
    sessionStorage.removeItem('tokenMostrado');
    sessionStorage.removeItem('tokenAutenticado');
  }
  
  iniciarAplicacion();
});

function manejarNuevoQR(nuevoQRTexto, sessionId) {
  if (nuevoQRTexto !== ultimoTextoQR) {
    ultimoTextoQR = nuevoQRTexto;

    if (qrUpdateTimeout) clearTimeout(qrUpdateTimeout);

    qrUpdateTimeout = setTimeout(() => {
      console.log('🆕 Nuevo QR detectado y confirmado');
      cargarQR(sessionId);
    }, 500); // espera 500ms por si cambia muy seguido
  }
}

async function iniciarAplicacion() {
  try {
    // 1. Verificar autenticación
    const user = await verificarAutenticacion();
    if (!user) {
      window.location.href = '/';
      return;
    }
    
    // 2. Configurar sesión
    sessionId = user.username;
    document.getElementById('nombreUsuario').textContent = sessionId;

    // 3. Obtener estado inicial
    const estado = await obtenerEstado(sessionId);
    ultimoEstado = estado.connectionState;

    // 4. Configurar UI según estado
    if (estado.connectionState === 'connected') {
      await manejarConexionExitosa(estado);
    } else {
      await manejarReconexion();
    }
    
    // 5. Configurar event listeners
    configurarEventListeners();
    
  } catch (error) {
    console.error('Error en inicialización:', error);
    window.location.href = '/';
  }
}

function configurarEventListeners() {
  // Verificar existencia de elementos antes de agregar listeners
  const verTokenBtn = document.getElementById('verTokenBtn');
  if (verTokenBtn) {
    verTokenBtn.addEventListener('click', () => mostrarTokenModal(null, false));
  }

  const confirmTokenBtn = document.getElementById('confirmTokenAccess');
  if (confirmTokenBtn) {
    confirmTokenBtn.addEventListener('click', verificarContrasena);
  }

  const copyTokenBtn = document.getElementById('copyTokenBtn');
  if (copyTokenBtn) {
    copyTokenBtn.addEventListener('click', copiarToken);
  }

  const downloadTokenBtn = document.getElementById('downloadTokenBtn');
  if (downloadTokenBtn) {
    downloadTokenBtn.addEventListener('click', descargarToken);
  }

  const closeModalBtn = document.getElementById('closeModalBtn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', ocultarModalToken);
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', cerrarSesion);
  }

  const unlinkDeviceBtn = document.getElementById('unlinkDeviceBtn');
  if (unlinkDeviceBtn) {
    unlinkDeviceBtn.addEventListener('click', () => {
      document.getElementById('unlinkModal').style.display = 'flex';
    });
  }

  const confirmUnlinkBtn = document.getElementById('confirmUnlinkBtn');
  if (confirmUnlinkBtn) {
    confirmUnlinkBtn.addEventListener('click', desvincularDispositivo);
  }

  const cancelUnlinkBtn = document.getElementById('cancelUnlinkBtn');
  if (cancelUnlinkBtn) {
    cancelUnlinkBtn.addEventListener('click', () => {
      document.getElementById('unlinkModal').style.display = 'none';
    });
  }

  const recargarQRBtn = document.getElementById('recargarQRBtn');
  if (recargarQRBtn) {
    recargarQRBtn.addEventListener('click', reiniciarSesion);
  }

// Listener para el botón Cancelar del modal
  document.getElementById('cancelTokenAccess').addEventListener('click', ocultarModalToken);
  
  // Cerrar modal al hacer clic fuera del contenido
  document.getElementById('tokenModal').addEventListener('click', function(e) {
    if (e.target === this) {
      ocultarModalToken();
    }
  });

// Listener para el botón de ver token
  document.getElementById('verTokenBtn').addEventListener('click', () => {
    mostrarTokenModal(null, false);
  });
}

// Funciones de autenticación y sesión
async function verificarAutenticacion() {
  try {
    const response = await fetch('/api/me', { credentials: 'include' });
    if (!response.ok) throw new Error('No autorizado');
    
    const user = await response.json();
    if (user.role !== 'user') {
      alert('Acceso denegado.');
      throw new Error('Acceso denegado');
    }
    
    return user;
  } catch (error) {
    console.error('Error en autenticación:', error);
    throw error;
  }
}

async function cerrarSesion() {
    sessionStorage.removeItem('tokenAutenticado');
    sessionStorage.removeItem('tokenMostrado');
  try {
    if (!sessionId) return;
    
    const response = await fetch(`/api/logout/${sessionId}`, { 
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      window.location.href = '/';
    } else {
      const errorData = await response.json();
      alert(errorData.error || 'Error al cerrar sesión');
    }
  } catch (err) {
    console.error('Error en logout:', err);
    alert('Error de conexión al servidor');
  }
}

// Funciones de conexión y estado
async function manejarConexionExitosa(estado) {
  // Actualizar UI
  const estadoElement = document.getElementById('estadoConexion');
  if (estadoElement) estadoElement.textContent = 'Estado: ¡Sesión conectada!';
  
  const qrElement = document.getElementById('qr');
  if (qrElement) qrElement.classList.add('hidden');
  
  // Mostrar botón de token
  const verTokenBtn = document.getElementById('verTokenBtn');
  if (verTokenBtn) verTokenBtn.classList.remove('hidden');

  // Manejar token (solo primera vez)
  if (estado.mostrarToken && estado.token && !sessionStorage.getItem('tokenMostrado')) {
    mostrarTokenModal(estado.token, true);
    sessionStorage.setItem('tokenMostrado', 'true');
    
    // Marcar como visto en backend después de 30s
    setTimeout(() => {
      fetch(`/api/mark-token-seen/${sessionId}`, {
        method: 'POST',
        credentials: 'include'
      }).catch(console.error);
    }, 30000);
  }
}

async function manejarReconexion() {
  try {
    if (!sessionId) throw new Error('sessionId no definido');

    await iniciarSesion(sessionId);

    const verificarYMostrarQR = async () => {
      const estado = await obtenerEstado(sessionId);

      if (estado.connectionState === 'connected') {
        console.log('✅ Estado conectado detectado automáticamente');
        clearInterval(intervaloEstado);
        await manejarConexionExitosa(estado);
        return;
      }

    if (estado.connectionState === 'waiting_qr' || estado.connectionState === 'qr') {
    console.log('🕓 Mostrando QR...');
    cargarQR(sessionId);

    // Empezar a verificar si se conecta después
    if (!intervaloEstado) {
        intervaloEstado = setInterval(() => verificarEstadoSesion(), 2000);
    }
    } else {
    console.log('⌛ Estado actual:', estado.connectionState);
    setTimeout(verificarYMostrarQR, 1000);
    }

    };

    verificarYMostrarQR();

  } catch (error) {
    console.error('Error en reconexión:', error);
    mostrarErrorQR('Error al conectar con WhatsApp');
  }
}


async function reiniciarSesion() {
  const recargarBtn = document.getElementById('recargarQRBtn');
  if (recargarBtn) recargarBtn.classList.add('hidden');

  try {
    if (!sessionId) throw new Error('sessionId no definido');
    
    await fetch(`/api/init-session/${sessionId}`, { method: 'POST', credentials: 'include' });
    cargarQR(sessionId);
    verificarEstadoSesion();
    console.log('🔄 Sesión reiniciada');
  } catch (err) {
    console.error('❌ Error al reiniciar sesión:', err);
    if (recargarBtn) recargarBtn.classList.remove('hidden');
  }
}

function mostrarTokenModal(token, esAutomatico) {
  const modal = document.getElementById('tokenModal');
  modal.style.display = 'flex';
  
  if (token) {
    // Mostrar el token directamente (para primera vez)
    document.getElementById('passwordPrompt').classList.add('hidden');
    document.getElementById('tokenDisplay').classList.remove('hidden');
    document.getElementById('tokenValue').textContent = token;
  } else {
    // Mostrar formulario de contraseña
    document.getElementById('passwordPrompt').classList.remove('hidden');
    document.getElementById('tokenDisplay').classList.add('hidden');
    document.getElementById('tokenPassword').focus();
  }
}

// Función para ocultar el modal y resetear
function ocultarModalToken() {
  const modal = document.getElementById('tokenModal');
  modal.style.display = 'none';
  
  // Resetear el estado del modal
  document.getElementById('passwordPrompt').classList.remove('hidden');
  document.getElementById('tokenDisplay').classList.add('hidden');
  document.getElementById('tokenPassword').value = '';
}

// Al verificar contraseña
async function verificarContrasena() {
  const password = document.getElementById('tokenPassword').value;
  if (!password) {
    alert('Por favor ingresa tu contraseña');
    return;
  }

  const btn = document.getElementById('confirmTokenAccess');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Verificando...';

  try {
    const response = await fetch(`/api/verify-token-access/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Contraseña incorrecta');
    }

    // Mostrar el token en el modal
    document.getElementById('passwordPrompt').classList.add('hidden');
    document.getElementById('tokenDisplay').classList.remove('hidden');
    document.getElementById('tokenValue').textContent = data.token;
    
  } catch (err) {
    console.error('Error:', err);
    alert(err.message);
    document.getElementById('tokenPassword').value = '';
    document.getElementById('tokenPassword').focus();
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// Resetear al recargar
window.addEventListener('load', () => {
  tokenAutorizado = false;
  const modal = document.getElementById('tokenModal');
  if (modal) modal.style.display = 'none';
});

function copiarToken() {
  const tokenDisplay = document.getElementById('tokenValue');
  if (!tokenDisplay) return;
  
  navigator.clipboard.writeText(tokenDisplay.textContent)
    .then(() => alert('Token copiado!'))
    .catch(() => alert('Error al copiar'));
}

function descargarToken() {
  const tokenDisplay = document.getElementById('tokenValue');
  if (!tokenDisplay) return;
  
  const token = tokenDisplay.textContent;
  const blob = new Blob([token], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `token-${sessionId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Funciones de dispositivo
async function desvincularDispositivo() {
  try {
    if (!sessionId) throw new Error('sessionId no definido');
    
    const response = await fetch(`/api/unlink-device/${sessionId}`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      window.location.href = '/user.html';
    } else {
      const errorData = await response.json();
      alert(errorData.error || 'Error al desvincular dispositivo');
    }
  } catch (err) {
    console.error('Error al desvincular:', err);
    alert('Error de conexión al servidor');
  } finally {
    const unlinkModal = document.getElementById('unlinkModal');
    if (unlinkModal) unlinkModal.style.display = 'none';
  }
}

// Funciones auxiliares
async function obtenerEstado(sessionId) {
  try {
    if (!sessionId) return { connectionState: 'unknown' };
    
    const res = await fetch(`/api/status/${sessionId}`, { credentials: 'include' });
    return res.ok ? await res.json() : { connectionState: 'unknown' };
  } catch {
    return { connectionState: 'unknown' };
  }
}

async function iniciarSesion(sessionId) {
  try {
    if (!sessionId) throw new Error('sessionId no definido');
    
    const res = await fetch(`/api/init-session/${sessionId}`, { 
      method: 'POST', 
      credentials: 'include' 
    });
    if (!res.ok) throw new Error();
  } catch (err) {
    console.error(err);
    mostrarErrorQR('Error al conectar con WhatsApp');
    throw err;
  }
}

function mostrarErrorQR(mensaje) {
  const qrDiv = document.getElementById('qr');
  if (!qrDiv) return;
  
  qrDiv.classList.remove('hidden');
  qrDiv.textContent = mensaje;
}

function limpiarIntervalos() {
  if (intervaloEstado) {
    clearInterval(intervaloEstado);
    intervaloEstado = null;
  }
  if (qrRefreshInterval) {
    clearInterval(qrRefreshInterval);
    qrRefreshInterval = null;
  }
}


async function cargarQR(sessionId, intentos = 0) {
  if (!sessionId) {
    mostrarErrorQR('Error: Sesión no identificada');
    return;
  }

  try {
    const response = await fetch(`/api/qr/${sessionId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'No se pudo obtener el QR');
    }

    const data = await response.json(); // { qr: dataURL }
    const dataURL = data.qr;
    ultimoQRMostrado = data.qr;

    actualizarInterfazQR(dataURL);
    document.getElementById('recargarQRBtn')?.classList.add('hidden');

  } catch (err) {
    console.error('Error al cargar QR:', err);

    if (intentos < 3) {
      setTimeout(() => cargarQR(sessionId, intentos + 1), 2000);
    } else {
      mostrarErrorQR(err.message);
      document.getElementById('recargarQRBtn')?.classList.remove('hidden');
    }
  }
}

function actualizarInterfazQR(qrDataUrl) {
  const qrDiv = document.getElementById('qr');
  if (!qrDiv) return;

  qrDiv.classList.remove('hidden');
  qrDiv.innerHTML = ''; // Limpiar contenido anterior

  const img = document.createElement('img');
  img.src = qrDataUrl;
  img.alt = 'Código QR';
  img.style.marginTop = '10px';

  qrDiv.appendChild(img);
}

// Función para verificar estado de sesión (similar a tu versión original pero con validaciones)
async function verificarEstadoSesion() {
  try {
    const response = await fetch(`/api/status/${sessionId}`, {
      credentials: 'include',
      headers: {
        'X-Referer-Reload': performance.navigation.type === 1 ? 'true' : 'false'
      }
    });

    const estado = await response.json();

    if (estado.connectionState === 'connected') {
      console.log('✅ Estado conectado detectado desde verificación');
      manejarConexionExitosa(estado);
      limpiarIntervalos();
      return;
    }

    // Detectar QR nuevo
    if (estado.qrCode && estado.qrCode !== ultimoTextoQR) {
        console.log('🆕 Nuevo QR detectado');
        ultimoTextoQR = estado.qrCode; // actualizar aquí
        cargarQR(sessionId); // esto actualizará la imagen
    }


  } catch (error) {
    console.error('Error al verificar estado:', error);
  }
}

function manejarEstadoConectado(estado) {
  const qrElement = document.getElementById('qr');
  if (qrElement) qrElement.classList.add('hidden');

  const verTokenBtn = document.getElementById('verTokenBtn');
  if (verTokenBtn) verTokenBtn.classList.remove('hidden');

  limpiarIntervalos();
}

function manejarEstadoDesconectado() {
  const verTokenBtn = document.getElementById('verTokenBtn');
  if (verTokenBtn) verTokenBtn.classList.add('hidden');
  sessionStorage.removeItem('tokenMostrado');
}