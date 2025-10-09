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

  // Funcionalidad del formulario de login (simplificada)
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('username').value;
      if (username) {
        alert(`¡Bienvenido, ${username}!`);
        showPage('home');
      } else {
        alert('Por favor, ingrese un usuario.');
      }
    });
  }

  // Actualizar el año de copyright dinámicamente
  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});