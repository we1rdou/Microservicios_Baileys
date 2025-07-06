// Variables globales
let sessionId = null;
let intervaloEstado = null;
let qrRefreshInterval = null;
let ultimoQRMostrado = '';
let ultimoTextoQR = '';
let qrUpdateTimeout = null;
let passwordTemporalPendiente = false;

// Clases CSS reutilizables
const CSS = {
    connectionStatus: {
        connected: 'bg-green-100 border-green-300 dark:bg-green-900 dark:border-green-700 text-green-800 dark:text-green-200',
        disconnected: 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200',
        waiting: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
        error: 'bg-red-100 border-red-300 dark:bg-red-900 dark:border-red-700 text-red-800 dark:text-red-200'
    },
    button: {
        primary: 'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm',
        secondary: 'bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm',
        danger: 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm',
        success: 'bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm'
    }
};

// Iconos SVG
const ICONS = {
    check: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>',
    warning: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>',
    error: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>',
    loading: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2" /></svg>'
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
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

        // 3. Configurar event listeners
        configurarEventListeners();
        
        // 4. Obtener estado inicial
        await verificarEstadoInicial();
        
    } catch (error) {
        console.error('Error en inicialización:', error);
        mostrarAlerta('Error al iniciar la aplicación', 'error');
        setTimeout(() => window.location.href = '/', 3000);
    }
});

// Configurar event listeners
function configurarEventListeners() {
    // Botón de token
    document.getElementById('verTokenBtn')?.addEventListener('click', () => mostrarTokenModal(null, false));
    
    // Modal de token
    document.getElementById('confirmTokenAccess')?.addEventListener('click', verificarContrasena);
    document.getElementById('copyTokenBtn')?.addEventListener('click', copiarToken);
    document.getElementById('downloadTokenBtn')?.addEventListener('click', descargarToken);
    document.getElementById('cancelTokenAccess')?.addEventListener('click', ocultarModalToken);
    document.getElementById('passwordForm')?.addEventListener('submit', manejarCambioPassword);
    document.getElementById('verTokenBtn')?.addEventListener('click', () => mostrarTokenModal(null, false));
    
    // Modal se cierra al hacer clic fuera
    document.getElementById('tokenModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('tokenModal')) {
            ocultarModalToken();
        }
    });

    // Botón de logout
    document.getElementById('logoutBtn')?.addEventListener('click', cerrarSesion);
    
    // Desvincular dispositivo
    document.getElementById('unlinkDeviceBtn')?.addEventListener('click', () => {
        document.getElementById('unlinkModal').classList.remove('hidden');
    });
    
    document.getElementById('confirmUnlinkBtn')?.addEventListener('click', desvincularDispositivo);
    document.getElementById('cancelUnlinkBtn')?.addEventListener('click', () => {
        document.getElementById('unlinkModal').classList.add('hidden');
    });
    
    // Recargar QR
    document.getElementById('recargarQRBtn')?.addEventListener('click', reiniciarSesion);

        // Modal de cambio de contraseña
    document.getElementById('passwordForm')?.addEventListener('submit', manejarCambioPassword);
    
    // Mostrar/ocultar contraseña
    document.getElementById('toggleNewPassword')?.addEventListener('click', () => togglePasswordVisibility('newPassword'));
    document.getElementById('toggleConfirmPassword')?.addEventListener('click', () => togglePasswordVisibility('confirmPassword'));
  
}

// Función para mostrar/ocultar contraseña
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const toggleButton = document.getElementById('toggle' + inputId.charAt(0).toUpperCase() + inputId.slice(1));
    
    if (input.type === 'password') {
        input.type = 'text';
        toggleButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
        `;
    } else {
        input.type = 'password';
        toggleButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        `;
    }
}

// Verificar estado inicial
async function verificarEstadoInicial() {
    try {
        const estado = await obtenerEstado(sessionId);
        
        if (estado.connectionState === 'connected') {
            await manejarConexionExitosa(estado);
        } else {
            await manejarReconexion();
        }
    } catch (error) {
        console.error('Error al verificar estado inicial:', error);
        mostrarAlerta('Error al verificar estado de conexión', 'error');
    }
}

// Función para verificar autenticación
async function verificarAutenticacion() {
    try {
        const response = await fetch('/api/me', { credentials: 'include' });
        if (!response.ok) throw new Error('No autorizado');
        
        const user = await response.json();
        if (user.role !== 'user') {
            mostrarAlerta('Acceso denegado. Redirigiendo...', 'error');
            throw new Error('Acceso denegado');
        }

        if (user.passwordTemporal){
            mostrarPasswordModal();
        }
        
        return user;
    } catch (error) {
        console.error('Error en autenticación:', error);
        throw error;
    }
}

// Manejar conexión exitosa
async function manejarConexionExitosa(estado) {
    actualizarEstadoUI('connected', 'Sesión conectada');
    
    // Ocultar QR si está visible
    document.getElementById('qr')?.classList.add('hidden');
    document.getElementById('recargarQRBtn')?.classList.add('hidden');
    
    // Mostrar botón de token
    document.getElementById('verTokenBtn')?.classList.remove('hidden');

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

// Manejar reconexión
async function manejarReconexion() {
    try {
        await iniciarSesion(sessionId);
        cargarQR(sessionId);
        
        // Iniciar intervalo para verificar estado
        if (!intervaloEstado) {
            intervaloEstado = setInterval(() => verificarEstadoSesion(), 2000);
        }
    } catch (error) {
        console.error('Error en reconexión:', error);
        mostrarAlerta('Error al conectar con WhatsApp', 'error');
    }
}

// Verificar estado de sesión periódicamente
async function verificarEstadoSesion() {
    try {
        const estado = await obtenerEstado(sessionId);

        // Actualizar UI según estado
        switch (estado.connectionState) {
            case 'connected':
                manejarConexionExitosa(estado);
                limpiarIntervalos();
                break;
            case 'waiting_qr':
            case 'qr':
                actualizarEstadoUI('waiting', 'Esperando escaneo de QR...');
                manejarNuevoQR(estado.qrCode, sessionId);
                break;
            case 'disconnected':
                actualizarEstadoUI('disconnected', 'Sesión desconectada');
                break;
            default:
                actualizarEstadoUI('error', 'Estado desconocido');
        }
    } catch (error) {
        console.error('Error al verificar estado:', error);
        actualizarEstadoUI('error', 'Error al verificar estado');
    }
}

// Actualizar UI del estado de conexión
// Actualizar UI del estado de conexión
function actualizarEstadoUI(estado, mensaje) {
    const estadoElement = document.getElementById('estadoConexion');
    const iconElement = document.getElementById('statusIcon');
    const textElement = document.getElementById('statusText');
    const unlinkBtn = document.getElementById('unlinkDeviceBtn');

    if (!estadoElement || !iconElement || !textElement) return;

    // Reset classes
    estadoElement.className = 'mb-8 p-4 rounded-lg border flex items-center';
    iconElement.className = 'text-xl mr-3';

    // Aplicar clases según estado
    estadoElement.classList.add(...CSS.connectionStatus[estado].split(' '));

    // Configurar icono y texto
    switch (estado) {
        case 'connected':
            iconElement.innerHTML = ICONS.check;
            if (unlinkBtn) unlinkBtn.disabled = false; // ✅ habilitar
            break;
        case 'waiting':
        case 'disconnected':
        case 'error':
        default:
            iconElement.innerHTML = {
                waiting: ICONS.loading,
                disconnected: ICONS.warning,
                error: ICONS.error
            }[estado] || ICONS.error;

            if (unlinkBtn) unlinkBtn.disabled = true; // ❌ deshabilitar
            break;
    }

    textElement.textContent = mensaje;
}


// Manejar nuevo QR
function manejarNuevoQR(nuevoQRTexto, sessionId) {
    if (nuevoQRTexto && nuevoQRTexto !== ultimoTextoQR) {
        ultimoTextoQR = nuevoQRTexto;

        if (qrUpdateTimeout) clearTimeout(qrUpdateTimeout);

        qrUpdateTimeout = setTimeout(async () => {
            // Verifica que siga en estado 'waiting_qr'
            const estado = await obtenerEstado(sessionId);
            if (estado.connectionState === 'waiting_qr' || estado.connectionState === 'qr') {
                cargarQR(sessionId);
            }
        }, 500);
    }
}

// Cargar QR
async function cargarQR(sessionId, intentos = 0) {
    try {
        // Verificar estado actual antes de cargar QR
        const estadoActual = await obtenerEstado(sessionId);
        if (estadoActual.connectionState === 'connected') {
            console.log('Sesión ya conectada. No se mostrará el QR.');
            document.getElementById('qr')?.classList.add('hidden');
            document.getElementById('recargarQRBtn')?.classList.add('hidden');
            return; // No continuar con carga de QR
        }

        // Solicitar QR
        const response = await fetch(`/api/qr/${sessionId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('No se pudo obtener el QR');
        }

        const data = await response.json();
        ultimoQRMostrado = data.qr;
        actualizarInterfazQR(data.qr);
        document.getElementById('recargarQRBtn')?.classList.add('hidden');
        document.getElementById('verTokenBtn')?.classList.add('hidden');

    } catch (error) {
        console.error('Error al cargar QR:', error);

        if (intentos < 3) {
            setTimeout(() => cargarQR(sessionId, intentos + 1), 2000);
        } else {
            mostrarAlerta('Error al cargar código QR', 'error');
            document.getElementById('recargarQRBtn')?.classList.remove('hidden');
        }
    }
}


// Actualizar interfaz con nuevo QR
function actualizarInterfazQR(qrDataUrl) {
    const qrDiv = document.getElementById('qr');
    if (!qrDiv) return;

    qrDiv.classList.remove('hidden');
    qrDiv.innerHTML = '';

    const img = document.createElement('img');
    img.src = qrDataUrl;
    img.alt = 'Código QR';
    img.className = 'w-full h-auto max-w-xs mx-auto';
    qrDiv.appendChild(img);
}

// Reiniciar sesión
async function reiniciarSesion() {
    const recargarBtn = document.getElementById('recargarQRBtn');
    if (recargarBtn) recargarBtn.classList.add('hidden');

    try {
        await fetch(`/api/init-session/${sessionId}`, { 
            method: 'POST', 
            credentials: 'include' 
        });
        cargarQR(sessionId);
        verificarEstadoSesion();
    } catch (error) {
        console.error('Error al reiniciar sesión:', error);
        mostrarAlerta('Error al reiniciar sesión', 'error');
        if (recargarBtn) recargarBtn.classList.remove('hidden');
    }
}

// Mostrar modal de token
function mostrarTokenModal(token, esPrimeraVez = false) {
    const modal = document.getElementById('tokenModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    
    if (token && esPrimeraVez) {
        document.getElementById('passwordPrompt').classList.add('hidden');
        document.getElementById('tokenDisplay').classList.remove('hidden');
        document.getElementById('tokenValue').textContent = token;
    } else {
        document.getElementById('passwordPrompt').classList.remove('hidden');
        document.getElementById('tokenDisplay').classList.add('hidden');
        document.getElementById('tokenPassword').focus();
    }
}

// Ocultar modal de token
function ocultarModalToken() {
    const modal = document.getElementById('tokenModal');
    if (modal) modal.classList.add('hidden');
    
    // Resetear formulario
    document.getElementById('passwordPrompt').classList.remove('hidden');
    document.getElementById('tokenDisplay').classList.add('hidden');
    document.getElementById('tokenPassword').value = '';
}

// Mostrar modal de cambio de contraseña
function mostrarPasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('newPassword')?.focus();
    }
}

// Verificar contraseña para token
async function verificarContrasena() {
    const password = document.getElementById('tokenPassword').value;
    if (!password) {
        mostrarAlerta('Por favor ingresa tu contraseña', 'error');
        return;
    }

    const btn = document.getElementById('confirmTokenAccess');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${ICONS.loading} Verificando...`;

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

        // Mostrar token
        document.getElementById('passwordPrompt').classList.add('hidden');
        document.getElementById('tokenDisplay').classList.remove('hidden');
        document.getElementById('tokenValue').textContent = data.token;
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta(error.message, 'error');
        document.getElementById('tokenPassword').value = '';
        document.getElementById('tokenPassword').focus();
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Copiar token al portapapeles
async function copiarToken() {
    try {
        const token = document.getElementById('tokenValue').textContent;
        await navigator.clipboard.writeText(token);
        mostrarAlerta('Token copiado al portapapeles', 'success');
    } catch (error) {
        console.error('Error al copiar:', error);
        mostrarAlerta('Error al copiar token', 'error');
    }
}

// Descargar token como archivo
function descargarToken() {
    const token = document.getElementById('tokenValue').textContent;
    const blob = new Blob([token], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-token-${sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Cerrar sesión
async function cerrarSesion() {
    try {
        await fetch(`/api/logout/${sessionId}`, { 
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/';
    } catch (error) {
        console.error('Error en logout:', error);
        mostrarAlerta('Error al cerrar sesión', 'error');
    }
}

// Desvincular dispositivo
async function desvincularDispositivo() {
    try {
        const response = await fetch(`/api/unlink-device/${sessionId}`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = '/user.html';
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al desvincular dispositivo');
        }
    } catch (error) {
        console.error('Error al desvincular:', error);
        mostrarAlerta(error.message, 'error');
    } finally {
        document.getElementById('unlinkModal').classList.add('hidden');
    }
}

// Mostrar alerta
function mostrarAlerta(mensaje, tipo = 'info') {
    const alerta = document.getElementById('alerta');
    if (!alerta) return;

    // Reset classes sin volver a añadir 'hidden'
    alerta.className = 'p-3 rounded-lg mb-4 text-center';
   
    
    // Aplicar clases según tipo
    switch (tipo) {
        case 'error':
            alerta.classList.add('bg-red-100', 'text-red-800', 'dark:bg-red-900', 'dark:text-red-200');
            break;
        case 'success':
            alerta.classList.add('bg-green-100', 'text-green-800', 'dark:bg-green-900', 'dark:text-green-200');
            break;
        case 'warning':
            alerta.classList.add('bg-yellow-100', 'text-yellow-800', 'dark:bg-yellow-900', 'dark:text-yellow-200');
            break;
        default:
            alerta.classList.add('bg-blue-100', 'text-blue-800', 'dark:bg-blue-900', 'dark:text-blue-200');
    }
    
    alerta.textContent = mensaje;
    alerta.classList.remove('hidden');
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        alerta.classList.add('hidden');
    }, 5000);
}

// Limpiar intervalos
function limpiarIntervalos() {
    if (intervaloEstado) {
        clearInterval(intervaloEstado);
        intervaloEstado = null;
    }
    if (qrRefreshInterval) {
        clearInterval(qrRefreshInterval);
        qrRefreshInterval = null;
    }
    if (qrUpdateTimeout) {
        clearTimeout(qrUpdateTimeout);
        qrUpdateTimeout = null;
    }
}

// Obtener estado del servidor
async function obtenerEstado(sessionId) {
    try {
        const response = await fetch(`/api/status/${sessionId}`, { 
            credentials: 'include' 
        });
        return response.ok ? await response.json() : { connectionState: 'unknown' };
    } catch (error) {
        console.error('Error al obtener estado:', error);
        return { connectionState: 'unknown' };
    }
}
// Iniciar sesión
async function iniciarSesion(sessionId) {
    try {
        const response = await fetch(`/api/init-session/${sessionId}`, { 
            method: 'POST', 
            credentials: 'include' 
        });
        if (!response.ok) throw new Error();
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        throw error;
    }
}

// Manejar envío de formulario de cambio de contraseña
async function manejarCambioPassword(e) {
    e.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('passwordError');

    errorDiv.classList.add('hidden');
    
    // Validar contraseñas
    if (newPassword !== confirmPassword) {
        errorDiv.textContent = 'Las contraseñas no coinciden';
        errorDiv.classList.remove('hidden');
        return;
    }

        // Validaciones de seguridad
    const validaciones = [
        { condicion: newPassword.length >= 8, mensaje: 'La contraseña debe tener al menos 8 caracteres' },
        { condicion: /[A-Z]/.test(newPassword), mensaje: 'Debe incluir al menos una letra mayúscula' },
        { condicion: /[a-z]/.test(newPassword), mensaje: 'Debe incluir al menos una letra minúscula' },
        { condicion: /[0-9]/.test(newPassword), mensaje: 'Debe incluir al menos un número' },
        { condicion: /[^A-Za-z0-9]/.test(newPassword), mensaje: 'Debe incluir al menos un carácter especial (ej: !@#$%^&*)' }
    ];
    
    // Verificar cada validación
    for (const validacion of validaciones) {
        if (!validacion.condicion) {
            errorDiv.textContent = validacion.mensaje;
            errorDiv.classList.remove('hidden');
            return;
        }
    }
    
    const saveBtn = document.getElementById('savePasswordBtn');
    const originalText = saveBtn.textContent;
    try {
        // Deshabilitar botón mientras se procesa
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';
        
        const response = await fetch('/api/cambiar-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al cambiar contraseña');
        }
        // Éxito
        document.getElementById('passwordModal').classList.add('hidden');
        mostrarAlerta('Contraseña actualizada correctamente. Tu cuenta ahora está más segura.', 'success');
        passwordTemporalPendiente = false;
        
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        errorDiv.textContent = error.message || 'Error al cambiar contraseña';
        errorDiv.classList.remove('hidden');
    } finally {
        // Restaurar botón
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}