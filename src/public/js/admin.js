// Verificar sesión y rol
let currentAdminUsername = null;

// Elementos del DOM
const DOM = {
    nombreUsuario: document.getElementById('nombreUsuario'),
    unlinkDeviceBtn: document.getElementById('unlinkDeviceBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    registerForm: document.getElementById('registerForm'),
    telefonoInput: document.getElementById('telefono'),
    resultado: document.getElementById('resultado'),
    tablaUsuarios: document.getElementById('tablaUsuarios'),
    tablaActividad: document.getElementById('tablaActividad'),
    tablaDispositivos: document.getElementById('tablaDispositivos'),
    modalInfo: document.getElementById('modalInfo'),
    modalTitle: document.querySelector('#modalInfo h3'),
    infoValue: document.getElementById('infoValue'),
    copyInfoBtn: document.getElementById('copyInfoBtn'),
    closeInfoBtn: document.getElementById('closeInfoBtn'),
    searchUsers: document.getElementById('searchUsers'),
    searchDevices: document.getElementById('searchDevices'),
    filterAll: document.getElementById('filterAll'),
    filterConnected: document.getElementById('filterConnected'),
    filterDisconnected: document.getElementById('filterDisconnected')

};

// Clases CSS reutilizables
const CSS = {
    tableHeader: 'px-4 py-3 text-left font-medium border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 sticky top-0 z-1',
    tableCell: 'px-4 py-2 border-b border-gray-200 dark:border-gray-700',
    buttonPrimary: 'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm',
    buttonSecondary: 'bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm',
    buttonDanger: 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm'
};

// Inicialización
async function init() {
    try {
        const user = await fetchData('/api/me');
        
        if (user.role !== 'admin') {
            showError('No tienes permisos para acceder a esta página.');
            redirectTo('/');
            return;
        }

        currentAdminUsername = user.username;
        DOM.nombreUsuario.textContent = `Bienvenido, ${user.username}`;
        DOM.nombreUsuario.classList.remove('hidden');
        
        cargarUsuarios();
        cargarDispositivos();
        setupEventListeners();
        setupSearch();
    } catch (error) {
        showError('Necesitas iniciar sesión.');
        redirectTo('/');
    }
}

// Configurar event listeners
function setupEventListeners() {
    DOM.logoutBtn.addEventListener('click', handleLogout);
    DOM.registerForm.addEventListener('submit', handleRegister);
    DOM.closeInfoBtn.addEventListener('click', () => DOM.modalInfo.classList.add('hidden'));
    DOM.filterAll.addEventListener('click', () => filterDevicesByStatus('all'));
    DOM.filterConnected.addEventListener('click', () => filterDevicesByStatus('conectado'));
    DOM.filterDisconnected.addEventListener('click', () => filterDevicesByStatus('desconectado'));
    DOM.modalInfo.addEventListener('click', (e) => {
        if (e.target === DOM.modalInfo) DOM.modalInfo.classList.add('hidden');
    });
}

// Añade esta función después de setupEventListeners()
function setupSearch() {
    if (DOM.searchUsers) {
        DOM.searchUsers.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = DOM.tablaUsuarios.querySelectorAll('tbody tr');
            
            let foundResults = false;
            
            rows.forEach(row => {
                // No filtrar la fila "sin resultados" si existe
                if (row.classList.contains('no-results')) {
                    row.remove();
                    return;
                }
                
                const text = row.textContent.toLowerCase();
                const match = text.includes(searchTerm);
                
                row.style.display = match ? '' : 'none';
                if (match) foundResults = true;
            });
            
            // Mostrar mensaje si no hay resultados
            if (!foundResults && searchTerm) {
                const tbody = DOM.tablaUsuarios.querySelector('tbody');
                const noResultsRow = document.createElement('tr');
                noResultsRow.classList.add('no-results');
                noResultsRow.innerHTML = `
                    <td colspan="4" class="${CSS.tableCell} text-center text-gray-500">
                        No se encontraron usuarios que coincidan con "${searchTerm}"
                    </td>
                `;
                tbody.appendChild(noResultsRow);
            }
        });
    }

     // Búsqueda de dispositivos (nuevo)
    if (DOM.searchDevices) {
        DOM.searchDevices.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = DOM.tablaDispositivos.querySelectorAll('tbody tr');
            
            let foundResults = false;
            
            rows.forEach(row => {
                // No filtrar la fila "sin resultados" si existe
                if (row.classList.contains('no-results')) {
                    row.remove();
                    return;
                }
                
                const text = row.textContent.toLowerCase();
                const match = text.includes(searchTerm);
                
                row.style.display = match ? '' : 'none';
                if (match) foundResults = true;
            });
            
            // Mostrar mensaje si no hay resultados
            if (!foundResults && searchTerm) {
                const tbody = DOM.tablaDispositivos.querySelector('tbody');
                const noResultsRow = document.createElement('tr');
                noResultsRow.classList.add('no-results');
                noResultsRow.innerHTML = `
                    <td colspan="7" class="${CSS.tableCell} text-center text-gray-500">
                        No se encontraron dispositivos que coincidan con "${searchTerm}"
                    </td>
                `;
                tbody.appendChild(noResultsRow);
            }
        });
    }
}

// Funciones de utilidad
async function fetchData(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'include',
        ...options
    });
    return await response.json();
}

function showError(message) {
    alert(message);
}

function redirectTo(path) {
    window.location.href = path;
}

function showModal(title, content) {
    DOM.modalTitle.textContent = title;
    DOM.infoValue.textContent = content;
    DOM.modalInfo.classList.remove('hidden');
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        alert('✅ Copiado al portapapeles');
    } catch {
        alert('❌ No se pudo copiar automáticamente. Cópiala manualmente.');
    }
}

// Manejadores de eventos
async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    redirectTo('/');
}

// En la función handleRegister
async function handleRegister(e) {
    e.preventDefault();
    
    const telefono = DOM.telefonoInput.value.trim();
    DOM.resultado.textContent = 'Procesando...';
    // Inicializar numeroNormalizado 
    let numeroNormalizado = telefono.replace(/\D/g, '');
    
    // Si el usuario solo ingresa 9 dígitos (sin el 593), añadir el prefijo automáticamente
    // ya que la interfaz ya muestra +593 visualmente
    if (numeroNormalizado.length === 9 && /^9\d{8}$/.test(numeroNormalizado)) {
      numeroNormalizado = '593' + numeroNormalizado;
    }
    // Normalizar si empieza con 0
    else if (numeroNormalizado.startsWith('0')) {
      numeroNormalizado = '593' + numeroNormalizado.substring(1);
    }
    
    // Validar formato ecuatoriano
    const numeroRegex = /^593\d{9}$/;
    if (!numeroRegex.test(numeroNormalizado)) {
      DOM.resultado.textContent = '❌ El número debe tener formato ecuatoriano: 593 seguido de 9 dígitos';
      DOM.resultado.classList.remove('text-green-500');
      DOM.resultado.classList.add('text-red-500');
      return;
    }

    try {
        const response = await fetch('/admin/register-number', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefono: numeroNormalizado }) // Usar número normalizado
        });

        const data = await response.json();

        
// Reemplaza la parte de mostrar credenciales con esta versión mejorada
if (!response.ok) {
    DOM.resultado.textContent = `❌ Error: ${data.error}`;
    DOM.resultado.classList.remove('text-green-500');
    DOM.resultado.classList.add('text-red-500');
    return;
}

// Reemplaza el bloque HTML de resultado con esta versión actualizada:

DOM.resultado.innerHTML = `
    <div class="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
        <div class="flex items-center gap-2 mb-2">
            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span class="font-medium text-green-800 dark:text-green-200">${data.message}</span>
        </div>
        
        <div class="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-1 items-center text-sm">
            <span class="text-gray-600 dark:text-gray-400">Usuario:</span>
            <span class="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">${data.credentials.username}</span>
            <span></span>
            
            <span class="text-gray-600 dark:text-gray-400">Contraseña:</span>
            <span class="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">${data.credentials.password}</span>
            <button onclick="copyToClipboard('${data.credentials.password}')" 
                   class="inline-flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded h-[18px] w-[18px]" 
                   title="Copiar contraseña">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            </button>
            
            <span class="text-gray-600 dark:text-gray-400">Dispositivo:</span>
            <span class="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">${data.device.id} (${data.device.estado})</span>
            <span></span>
        </div>
        
        <div class="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-1 items-center text-sm mt-3">
            <span></span>
            <button onclick="resetRegistrationForm()" 
                class="font-mono bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-1.5 py-0.5 rounded text-center">
                Volver
            </button>
            <span></span>
        </div>
    </div>
`;



DOM.resultado.classList.remove('text-red-500');
DOM.resultado.classList.add('text-green-500');
        
        // Recargar usuarios
        cargarUsuarios();
        cargarDispositivos();
        
        // Limpiar el campo
        DOM.telefonoInput.value = '';
        
    } catch (error) {
        DOM.resultado.textContent = '❌ Error de conexión';
        DOM.resultado.classList.remove('text-green-500');
        DOM.resultado.classList.add('text-red-500');
    }
}

function resetRegistrationForm() {
    DOM.telefonoInput.value = '';
    DOM.resultado.innerHTML = '';
    DOM.telefonoInput.focus();
}

// Cargar lista de usuarios
async function cargarUsuarios() {
    try {
        const data = await fetchData('/admin/usuarios');
        const usuariosVisibles = data.data.filter(user => user.username !== currentAdminUsername);

        DOM.tablaUsuarios.innerHTML = `
            <thead>
                <tr>
                    <th class="${CSS.tableHeader}">ID</th>
                    <th class="${CSS.tableHeader}">Username</th>
                    <th class="${CSS.tableHeader}">Rol</th>
                    <th class="${CSS.tableHeader}">Acciones</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                ${usuariosVisibles.map(user => `
                    <tr>
                        <td class="${CSS.tableCell}">${user.id}</td>
                        <td class="${CSS.tableCell}">${user.username}</td>
                        <td class="${CSS.tableCell}">${user.role}</td>
                        <td class="${CSS.tableCell} space-x-2">
                            <button onclick="asignarPassword(${user.id})" class="${CSS.buttonSecondary} text-sm">
                                Nueva contraseña
                            </button>
                            <button onclick="verActividad(${user.id}, '${user.username}')" class="${CSS.buttonPrimary} text-sm">
                                Ver actividad
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
    } catch (error) {
        DOM.tablaUsuarios.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-red-500">Error al cargar usuarios</td></tr>';
    }
}

// Cargar lista de dispositivos
async function cargarDispositivos() {
    try {
        const data = await fetchData('/admin/dispositivos');

        DOM.tablaDispositivos.innerHTML = `
            <thead>
                <tr>
                    <th class="${CSS.tableHeader}">ID</th>
                    <th class="${CSS.tableHeader}">Teléfono</th>
                    <th class="${CSS.tableHeader}">Estado</th>
                    <th class="${CSS.tableHeader}">Token</th>
                    <th class="${CSS.tableHeader}">Expiración</th>
                    <th class="${CSS.tableHeader}">Usuario</th>
                    <th class="${CSS.tableHeader}">Acciones</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                ${data.data.map(device => `
                    <tr>
                        <td class="${CSS.tableCell}">${device.id}</td>
                        <td class="${CSS.tableCell}">${device.telefono}</td>
                        <td class="${CSS.tableCell}">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                device.estado === 'activo' ? 'bg-green-100 text-green-800' : 
                                device.estado === 'inactivo' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                            }">
                                ${device.estado}
                            </span>
                        </td>
                        <td class="${CSS.tableCell}">
                            ${device.token ? `
                                <div class="flex items-center">
                                    <button onclick="copyToClipboard('${device.token}')" class="ml-2 text-blue-500 hover:text-blue-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                    </button>
                                </div>
                            ` : 'N/A'}
                        </td>
                        <td class="${CSS.tableCell}">${device.expiraHasta ? new Date(device.expiraHasta).toLocaleString() : 'N/A'}</td>
                        <td class="${CSS.tableCell}">${device.User?.username || 'Sin asignar'}</td>
                        <td class="${CSS.tableCell}">
                            <button onclick="regenerarToken(${device.id})" class="${CSS.buttonPrimary} text-sm">
                                Nuevo token
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
    } catch (error) {
        DOM.tablaDispositivos.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-red-500">Error al cargar dispositivos</td></tr>';
    }
}

// Asignar nueva contraseña
async function asignarPassword(userId) {
    if (!confirm("¿Deseas asignar una nueva contraseña aleatoria a este usuario?")) return;

    try {
        const data = await fetchData(`/admin/usuarios/${userId}/password`, {
            method: 'PUT'
        });

        showModal('Nueva contraseña asignada', data.nuevaPassword);
        DOM.copyInfoBtn.onclick = () => copyToClipboard(data.nuevaPassword);
    } catch (error) {
        showError(`Error: ${error.error || 'No se pudo asignar la contraseña'}`);
    }
}

// Regenerar token de dispositivo
async function regenerarToken(deviceId) {
    if (!confirm("¿Deseas generar un nuevo token para este dispositivo?")) return;

    try {
        const data = await fetchData(`/admin/dispositivos/${deviceId}/token`, {
            method: 'PUT'
        });

        showModal('Nuevo token generado', data.token);
        DOM.copyInfoBtn.onclick = () => copyToClipboard(data.token);
        cargarDispositivos();
    } catch (error) {
        showError(`Error: ${error.error || 'No se pudo generar el token'}`);
    }
}

// Ver actividad de usuario
async function verActividad(userId, username) {
    try {
        const data = await fetchData(`/admin/usuarios/${userId}/actividad`);
        const tbody = DOM.tablaActividad.querySelector('tbody');
        
        if (data.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-500">Sin actividad registrada</td></tr>`;
            return;
        }

        tbody.innerHTML = data.data.map(log => `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="${CSS.tableCell}">${new Date(log.createdAt).toLocaleString()}</td>
                <td class="${CSS.tableCell}">${log.descripcion}</td>
                <td class="${CSS.tableCell}">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        log.accion === 'login' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        log.accion === 'logout' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }">
                        ${log.accion}
                    </span>
                </td>
                <td class="${CSS.tableCell}">${log.ip}</td>
                <td class="${CSS.tableCell}">${username}</td>
            </tr>
        `).join('');
    } catch (error) {
        const tbody = DOM.tablaActividad.querySelector('tbody');
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Error al cargar actividad</td></tr>`;
    }
}

// Nueva función para filtrar por estado
function filterDevicesByStatus(status) {
    // Actualizar estado activo de los botones
    DOM.filterAll.className = status === 'all' 
        ? 'px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition'
        : 'px-3 py-1.5 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition';
    
    DOM.filterConnected.className = status === 'conectado'
        ? 'px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition'
        : 'px-3 py-1.5 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition';
    
    DOM.filterDisconnected.className = status === 'desconectado'
        ? 'px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition'
        : 'px-3 py-1.5 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition';
    
    // Filtrar las filas de dispositivos
    const rows = DOM.tablaDispositivos.querySelectorAll('tbody tr');
    let foundResults = false;
    
    rows.forEach(row => {
        if (row.classList.contains('no-results')) {
            row.remove();
            return;
        }
        
        if (status === 'all') {
            row.style.display = '';
            foundResults = true;
            return;
        }
        
        // Buscar el estado en la tercera columna (índice 2)
        const estadoCell = row.querySelector('td:nth-child(3)');
        const estadoTexto = estadoCell ? estadoCell.textContent.trim().toLowerCase() : '';
        const match = estadoTexto === status;
        
        row.style.display = match ? '' : 'none';
        if (match) foundResults = true;
    });
    
    // Mostrar mensaje si no hay resultados
    if (!foundResults && status !== 'all') {
        const tbody = DOM.tablaDispositivos.querySelector('tbody');
        const noResultsRow = document.createElement('tr');
        noResultsRow.classList.add('no-results');
        noResultsRow.innerHTML = `
            <td colspan="7" class="${CSS.tableCell} text-center text-gray-500">
                No se encontraron dispositivos ${status === 'conectado' ? 'conectados' : 'desconectados'}
            </td>
        `;
        tbody.appendChild(noResultsRow);
    }
}
// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', init);