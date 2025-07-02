document.addEventListener('DOMContentLoaded', () => {
    // Al cargar login.html, verificar si ya hay sesión activa
  fetch('/api/me', {
      credentials: 'include' // Asegura que las cookies se envíen con la solicitud
  })
    .then(res => {
      if (!res.ok) throw new Error('No autorizado');
      return res.json();
    })
    .then(user => {
      if (user.role === 'admin') {
        window.location.href = '/admin.html';
      } else {
        window.location.href = '/user.html'; // o la página del usuario común
      }
    })
    .catch(() => {
      // No hacer nada, mostrar el formulario de login
    });
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const ruta = username === 'admin' ? '/api/login-admin' : '/api/login-user';

    const res = await fetch(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (res.ok) {
      if (data.role === 'admin') {
        window.location.href = '/admin.html';
      } else {
        window.location.href = '/user.html';
      }
    } else {
      alert(data.error || 'Error al iniciar sesión');
    }
  });
});
