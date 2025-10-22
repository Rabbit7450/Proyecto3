// Este archivo maneja la navegación principal y la interacción general del UI.

document.addEventListener('DOMContentLoaded', function() {
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.getAttribute('data-page');
      showPage(page);
    });
  });
  
  function showPage(pageId) {
    document.querySelectorAll('main > section').forEach(section => {
      section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(pageId);
    if (targetSection) {
      targetSection.classList.add('active');
    }
  }

  // Botón "ORDENAR AHORA" que lleva al menú
  const orderNowBtn = document.getElementById('orderNowBtn');
  if (orderNowBtn) {
    orderNowBtn.addEventListener('click', function(e) {
      e.preventDefault();
      showPage('menu');
    });
  }

  // Funcionalidad del formulario de login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      fetch('api/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          switch (data.role) {
            case 'admin':
              window.location.href = 'views/admin/index.html';
              break;
            case 'vendedor':
              window.location.href = 'views/vendedor/index.html';
              break;
            case 'usuario':
              window.location.href = 'views/usuario/index.html';
              break;
            case 'delivery':
              window.location.href = 'views/delivery/index.html';
              break;
            default:
              showPage('home');
          }
        } else {
          alert(data.message);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Ocurrió un error al intentar iniciar sesión.');
      });
    });
  }

  // Actualizar el año de copyright dinámicamente
  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});