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
    closeInfoBtn: document.getElementById('closeInfoBtn')
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
    DOM.modalInfo.addEventListener('click', (e) => {
        if (e.target === DOM.modalInfo) DOM.modalInfo.classList.add('hidden');
    });
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

async function handleRegister(e) {
    e.preventDefault();
    const telefono = DOM.telefonoInput.value.trim();

    try {
        const data = await fetchData('/admin/register-number', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefono })
        });

        DOM.resultado.textContent = JSON.stringify(data, null, 2);
        DOM.resultado.classList.remove('text-red-500');
        DOM.resultado.classList.add('text-green-500');
        
        cargarUsuarios();
        cargarDispositivos();
        DOM.telefonoInput.value = '';
    } catch (error) {
        DOM.resultado.textContent = `❌ Error: ${error.error || 'Error desconocido'}`;
        DOM.resultado.classList.remove('text-green-500');
        DOM.resultado.classList.add('text-red-500');
    }
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
                                    <span class="truncate max-w-xs">${device.token.substring(0, 15)}...</span>
                                    <button onclick="copyToClipboard('${device.token}')" class="ml-2 text-blue-500 hover:text-blue-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                    </button>
                                </div>
                            ` : 'N/A'}
                        </td>
                        <td class="${CSS.tableCell}">${device.expiraHasta ? new Date(device.expiraHuta).toLocaleString() : 'N/A'}</td>
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

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', init);