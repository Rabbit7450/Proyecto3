// ===============================
// 🌐 Navegación SPA + Login/Logout
// ===============================

function notifyUser(title, message, type = 'info', duration = 5000) {
  if (typeof window.notify === 'function' && window.notify !== notifyUser) {
    window.notify(title, message, type, duration);
    return;
  }

  if (window.notificationSystem && typeof window.notificationSystem.showNotification === 'function') {
    window.notificationSystem.showNotification(title, message, type, duration);
    return;
  }

  // Fallback minimal toast using Bootstrap alerts
  let container = document.getElementById('fallbackNotificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'fallbackNotificationContainer';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '2000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px';
    document.body.appendChild(container);
  }

  const typeMap = {
    success: 'alert-success',
    error: 'alert-danger',
    warning: 'alert-warning',
    info: 'alert-info'
  };
  const alertClass = typeMap[type] || typeMap.info;

  const alertEl = document.createElement('div');
  alertEl.className = `alert ${alertClass} shadow-sm fade show`;
  alertEl.setAttribute('role', 'alert');
  alertEl.innerHTML = `<strong>${title}</strong><div>${message}</div>`;
  container.appendChild(alertEl);

  setTimeout(() => {
    alertEl.classList.remove('show');
    alertEl.classList.add('hide');
    setTimeout(() => {
      if (alertEl.parentNode) {
        alertEl.parentNode.removeChild(alertEl);
      }
    }, 300);
  }, duration);
}

document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-link");

  // Toggle de tema manual (persistente) - Usa ThemeManager centralizado
  // El tema se inicializa automáticamente por theme-manager.js
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = window.toggleTheme ? window.toggleTheme() : (window.ThemeManager ? window.ThemeManager.toggle() : 'light');
      themeBtn.innerHTML = next === 'light' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon"></i>';
    });
    
    // Actualizar icono según tema actual
    const updateIcon = () => {
      const current = window.getCurrentTheme ? window.getCurrentTheme() : (window.ThemeManager ? window.ThemeManager.get() : 'light');
      themeBtn.innerHTML = current === 'light' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon"></i>';
    };
    
    // Actualizar icono al cargar
    setTimeout(updateIcon, 100);
    
    // Escuchar cambios de tema
    window.addEventListener('themechange', updateIcon);
  }

  // --- Navegación SPA ---
  navLinks.forEach(link => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const page = this.getAttribute("data-page");
      if (page) {
        mostrarSeccion(page);
      }
    });
  });

  // --- Botón "ORDENAR AHORA" ---
  const orderNowBtn = document.getElementById("orderNowBtn");
  if (orderNowBtn) {
    orderNowBtn.addEventListener("click", (e) => {
      e.preventDefault();
      mostrarSeccion("menu");
    });
  }

  // --- Formulario de Login ---
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    // Validación en tiempo real
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    
    if (emailInput) {
      emailInput.addEventListener("blur", function() {
        if (!this.value || !this.validity.valid) {
          this.classList.add("is-invalid");
        } else {
          this.classList.remove("is-invalid");
        }
      });
    }
    
    if (passwordInput) {
      passwordInput.addEventListener("blur", function() {
        if (!this.value || this.value.length < 6) {
          this.classList.add("is-invalid");
        } else {
          this.classList.remove("is-invalid");
        }
      });
    }
    
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      // Validación antes de enviar
      let isValid = true;
      if (emailInput && (!emailInput.value || !emailInput.validity.valid)) {
        emailInput.classList.add("is-invalid");
        isValid = false;
      }
      if (passwordInput && (!passwordInput.value || passwordInput.value.length < 6)) {
        passwordInput.classList.add("is-invalid");
        isValid = false;
      }
      
      if (!isValid) {
        return;
      }

      const formData = new FormData(loginForm);

      try {
        // Convertir FormData a JSON
        const formDataObj = {};
        formData.forEach((value, key) => {
          formDataObj[key] = value;
        });
        
        const response = await fetch("api/login.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: formDataObj.email || formDataObj.username,
            password: formDataObj.password
          })
        });

        if (!response.ok) {
          const text = await response.text();
          console.error("Error del servidor:", text);
          try {
            const errorResult = JSON.parse(text);
            let errorMessage = errorResult.message || 'Error al iniciar sesión';
            
            // Mostrar intentos restantes si están disponibles
            if (errorResult.attempts_remaining !== undefined) {
              const remaining = errorResult.attempts_remaining;
              const total = errorResult.attempts_total || 5;
              
              if (remaining > 0) {
                errorMessage += ` (Intentos restantes: ${remaining} de ${total})`;
              } else {
                errorMessage += ` (Se ha deshabilitado el inicio de sesión. Intenta más tarde.)`;
              }
            }
            
            notifyUser('Inicio de sesión', errorMessage, 'error');
          } catch (e) {
            notifyUser('Inicio de sesión', 'Error al iniciar sesión. Por favor intenta de nuevo.', 'error');
          }
          return;
        }
        
        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch (err) {
          console.error("Error al parsear JSON:", err, "Respuesta:", text);
          notifyUser('Respuesta inválida', 'El servidor no devolvió JSON válido.', 'error');
          return;
        }
        
        // Mostrar intentos restantes si el login falló
        if (!result.success && result.attempts_remaining !== undefined) {
          const remaining = result.attempts_remaining;
          const total = result.attempts_total || 5;
          
          let errorMessage = result.message || 'Error al iniciar sesión';
          if (remaining > 0) {
            errorMessage += ` (Intentos restantes: ${remaining} de ${total})`;
          } else {
            errorMessage += ` (Se ha deshabilitado el inicio de sesión. Intenta más tarde.)`;
          }
          
          notifyUser('Inicio de sesión', errorMessage, 'error');
          return;
        }
        
        if (!result.success) {
          notifyUser('Inicio de sesión', result.message || 'Error al iniciar sesión', 'error');
          return;
        }
        
        console.log("Respuesta login:", result);

        if (result.success) {
          // Limpiar cualquier mensaje de intentos si el login fue exitoso
          const userId = result.id_usuario
            ?? result.user_id
            ?? result.id
            ?? result.usuario_id
            ?? result.idUsuario
            ?? null;
          
          const normalizedUser = {
            id_usuario: userId,
            user_id: userId,
            id: userId,
            nombre: result.nombre ?? result.username ?? '',
            rol: (result.role ?? result.rol ?? 'cliente').toLowerCase()
          };

          // Persistir siempre en un formato consistente
          localStorage.setItem("usuario", JSON.stringify(normalizedUser));

          const nombreSeguro = (typeof escapeHtml !== 'undefined' && typeof escapeHtml === 'function') 
            ? escapeHtml(normalizedUser.nombre) 
            : (normalizedUser.nombre || '').replace(/[&<>"']/g, function(m) {
                const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
                return map[m] || m;
              });
          document.getElementById("loginNavItem").outerHTML =
            `<li class="nav-item">
              <a class="nav-link" href="#" id="logoutBtn">👋 Hola, ${nombreSeguro} (Salir)</a>
            </li>`;

          // Redirección según rol
          const userRole = normalizedUser.rol;
          switch (userRole) {
            case "admin":
              window.location.href = "views/admin/index.html";
              break;
            case "vendedor":
              window.location.href = "views/vendedor/index.html";
              break;
            case "cliente":
              mostrarSeccion("menu"); 
              break;
            case "repartidor":
              window.location.href = "views/delivery/index.html";
              break;
            default:
              mostrarSeccion("menu");
          }
        } else {
          notifyUser('Inicio de sesión', result.message || 'No se pudo iniciar sesión.', 'warning');
        }
      } catch (error) {
        console.error("Error en login:", error);
        notifyUser('Inicio de sesión', 'Ocurrió un error al intentar iniciar sesión.', 'error');
      }
    });
  }

  // --- Formulario de Registro ---
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    // Validación en tiempo real
    const nombreInput = document.getElementById("nombre");
    const emailRegInput = document.getElementById("emailReg");
    const passwordRegInput = document.getElementById("passwordReg");
    const telefonoRegInput = document.getElementById("telefonoReg");
    
    // Función auxiliar para validar nombre
    function validateName(input) {
      const value = input.value.trim();
      const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
      if (!value || value.length < 2 || !nameRegex.test(value)) {
        input.classList.add("is-invalid");
        return false;
      }
      input.classList.remove("is-invalid");
      return true;
    }
    
    // Función auxiliar para validar teléfono
    function validatePhone(input) {
      const value = input.value.trim();
      const digitsOnly = value.replace(/\D/g, '');
      if (!value || digitsOnly.length < 7 || digitsOnly.length > 15) {
        input.classList.add("is-invalid");
        return false;
      }
      input.classList.remove("is-invalid");
      return true;
    }
    
    if (nombreInput) {
      nombreInput.addEventListener("blur", () => validateName(nombreInput));
      nombreInput.addEventListener("input", () => {
        if (nombreInput.classList.contains("is-invalid")) {
          validateName(nombreInput);
        }
      });
    }
    
    if (emailRegInput) {
      emailRegInput.addEventListener("blur", function() {
        if (!this.value || !this.validity.valid) {
          this.classList.add("is-invalid");
        } else {
          this.classList.remove("is-invalid");
        }
      });
    }
    
    if (passwordRegInput) {
      passwordRegInput.addEventListener("blur", function() {
        if (!this.value || this.value.length < 6) {
          this.classList.add("is-invalid");
        } else {
          this.classList.remove("is-invalid");
        }
      });
    }
    
    if (telefonoRegInput) {
      telefonoRegInput.addEventListener("blur", () => validatePhone(telefonoRegInput));
      telefonoRegInput.addEventListener("input", function() {
        // Solo permitir números, espacios, guiones, paréntesis y +
        this.value = this.value.replace(/[^\d\s\-\+\(\)]/g, '');
        if (this.classList.contains("is-invalid")) {
          validatePhone(telefonoRegInput);
        }
      });
    }
    
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      // Validación antes de enviar
      let isValid = true;
      if (nombreInput && !validateName(nombreInput)) isValid = false;
      if (emailRegInput && (!emailRegInput.value || !emailRegInput.validity.valid)) {
        emailRegInput.classList.add("is-invalid");
        isValid = false;
      }
      if (passwordRegInput && (!passwordRegInput.value || passwordRegInput.value.length < 6)) {
        passwordRegInput.classList.add("is-invalid");
        isValid = false;
      }
      if (telefonoRegInput && !validatePhone(telefonoRegInput)) isValid = false;
      
      if (!isValid) {
        return;
      }

      // Convertir FormData a objeto JSON
      const formDataObj = {};
      const formData = new FormData(registerForm);
      formData.forEach((value, key) => {
        formDataObj[key] = value;
      });

      try {
        const response = await fetch("api/register.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formDataObj)
        });

        if (!response.ok) {
          const text = await response.text();
          console.error("Error del servidor:", text);
          try {
            const errorResult = JSON.parse(text);
            notifyUser('Registro', errorResult.message || 'Error al registrar', 'error');
          } catch (e) {
            notifyUser('Registro', 'Error al registrar. Por favor intenta de nuevo.', 'error');
          }
          return;
        }

        const result = await response.json();
        console.log("Respuesta registro:", result);

        if (result.success) {
          notifyUser('Registro', 'Registro exitoso. Ahora puedes iniciar sesión.', 'success');
          mostrarSeccion("login");
        } else {
          notifyUser('Registro', result.message || 'No se pudo completar el registro.', 'warning');
        }
      } catch (error) {
        console.error("Error en registro:", error);
        notifyUser('Registro', 'Ocurrió un error al intentar registrarte.', 'error');
      }
    });
  }

  // Mostrar registro desde login
  document.getElementById("showRegister")?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarSeccion("register");
  });

  // Mostrar login desde registro
  document.getElementById("showLogin")?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarSeccion("login");
  });

  // --- Logout ---
  document.addEventListener("click", async (e) => {
    if (e.target.id === "logoutBtn") {
      await fetch("controllers/logout.php");
      localStorage.removeItem("usuario");
      location.reload();
    }
  });

  // --- Año dinámico ---
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // --- Cargar productos desde la API ---
  loadProducts();
  
  // --- Inicializar carrito ---
  initializeCart();

  // --- Inicializar búsqueda y filtrado ---
  initializeSearchAndFilter();

  // Actualizar icono de toggle según tema actual
  const themeBtnInit = document.getElementById('themeToggle');
  if (themeBtnInit) {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    themeBtnInit.innerHTML = current === 'light' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon"></i>';
  }
});

// Tamaños de pizza y multiplicadores
const SIZE_FACTORS = { small: 1.0, medium: 1.3, large: 1.6 };
const SIZE_LABELS = { small: 'Pequeña', medium: 'Mediana', large: 'Familiar' };

// Utilidad: Formato de moneda Bolivianos (Bs)
function formatCurrencyBOB(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 'Bs 0.00';
  return 'Bs ' + n.toFixed(2);
}

// ===============================
// 📌 Función para mostrar secciones
// ===============================
function mostrarSeccion(pageId) {
  document.querySelectorAll("main > section").forEach(section => {
    section.classList.remove("active");
    section.style.display = "none";
  });

  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add("active");
    target.style.display = "block";
  }
}

// ===============================
// 🛒 SISTEMA DE CARRITO DE COMPRAS
// ===============================

// Función para inicializar el carrito
function initializeCart() {
  if (!localStorage.getItem('cart')) {
    localStorage.setItem('cart', JSON.stringify([]));
  }
  updateCartCounter();
}

// Función para cargar productos desde la API
async function loadProducts() {
  try {
    const response = await fetch('api/products.php');
    const loadedProducts = await response.json();
    
    if (loadedProducts.length > 0) {
      products = loadedProducts;
      filteredProducts = [...products];
      renderProducts(filteredProducts);
      return;
    }
  } catch (error) {
    console.error('Error al cargar productos:', error);
  }
  
  // Si no hay productos o hay error, usar datos de muestra
  products = [
    { id_producto: 1, nombre: 'Pizza Margarita', precio: 65.00, descripcion: 'Salsa de tomate, mozzarella y albahaca', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/3915857/pexels-photo-3915857.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 2, nombre: 'Pizza Pepperoni', precio: 75.00, descripcion: 'Salsa de tomate, mozzarella y pepperoni', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 3, nombre: 'Pizza Hawaiana', precio: 80.00, descripcion: 'Jamón, piña y mozzarella', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 4, nombre: 'Pizza Champiñón', precio: 70.00, descripcion: 'Mozzarella, champiñón y cebolla', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/3915857/pexels-photo-3915857.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 5, nombre: 'Pizza 4 Estaciones', precio: 90.00, descripcion: 'Jamón, champiñón, pimiento y aceituna', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 6, nombre: 'Pizza Ranchera', precio: 85.00, descripcion: 'Salsa ranch, pepperoni, salchicha y cebolla', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 7, nombre: 'Pizza Vegetariana', precio: 78.00, descripcion: 'Mozzarella, tomate, champiñón, pimiento, cebolla', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/3915857/pexels-photo-3915857.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 8, nombre: 'Pizza Napolitana', precio: 72.00, descripcion: 'Tomate fresco, mozzarella, orégano y albahaca', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 9, nombre: 'Pizza BBQ Chicken', precio: 88.00, descripcion: 'Pollo deshebrado, salsa bbq, cebolla y mozzarella', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 10, nombre: 'Pizza Carnes', precio: 95.00, descripcion: 'Jamón, pepperoni, salchicha y carne molida', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/3915857/pexels-photo-3915857.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 11, nombre: 'Pizza de Quesos', precio: 82.00, descripcion: 'Mozzarella, parmesano y queso crema', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 12, nombre: 'Pizza Mexicana', precio: 87.00, descripcion: 'Carne molida, jalapeño, cebolla y salsa picante', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 13, nombre: 'Pizza de Anchoas', precio: 77.00, descripcion: 'Anchoas, mozzarella y orégano', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/3915857/pexels-photo-3915857.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 14, nombre: 'Pizza de Salchicha', precio: 73.00, descripcion: 'Salchicha alemana y mozzarella', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id_producto: 15, nombre: 'Pizza de Pimientos', precio: 68.00, descripcion: 'Pimiento verde, rojo, mozzarella y tomate', categoria: 'Pizza', imagen: 'https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg?auto=compress&cs=tinysrgb&w=600' }
  ];
  
  filteredProducts = [...products];
  renderProducts(filteredProducts);
}

// Mapeo de nombres de productos a archivos de imágenes
const productImageMap = {
  'margarita': 'margarita.png',
  'margherita': 'margarita.png', // Variante del nombre
  'pepperoni': 'pepperoni.png',
  'hawaiana': 'hawaiana.png',
  'champiñón': 'pizza-con-champinones.jpg',
  'champinon': 'pizza-con-champinones.jpg',
  'champiñones': 'pizza-con-champinones.jpg',
  '4 estaciones': '4_estaciones.jpg',
  'cuatro estaciones': '4_estaciones.jpg',
  'ranchera': 'ranchera.jpg',
  'vegetariana': 'veggie.png',
  'veggie': 'veggie.png',
  'napolitana': 'napolitana.jpg',
  'bbq': 'BBQ_Chiken.webp',
  'bbq chicken': 'BBQ_Chiken.webp',
  'carnes': 'carnes.png',
  'quesos': 'pizza-cuatro-quesos.webp',
  'cuatro quesos': 'pizza-cuatro-quesos.webp',
  'mexicana': 'pizza_mexicana.jpg',
  'anchoas': 'pizza-de-anchoas.jpg',
  'salchicha': 'pizza_salchicha.jpg',
  'pimiento': 'Pizza_pimiento.jpg',
  'pimientos': 'Pizza_pimiento.jpg'
};

// Función para obtener la imagen del producto
function getProductImage(productName) {
  if (!productName) return 'https://via.placeholder.com/300x200';
  
  const nombreLower = productName.toLowerCase().trim();
  
  // Remover "pizza" del inicio si existe para mejor matching
  const nombreSinPizza = nombreLower.replace(/^pizza\s+/, '');
  
  // Buscar coincidencia exacta o parcial
  for (const [key, imageFile] of Object.entries(productImageMap)) {
    if (nombreLower.includes(key) || nombreSinPizza.includes(key)) {
      // Construir ruta relativa desde Index.html (raíz del proyecto)
      const imagePath = `views/vendedor/assets/img/${imageFile}`;
      return imagePath;
    }
  }
  
  // Si no hay coincidencia, usar imagen por defecto
  return 'https://via.placeholder.com/300x200';
}

// Función para renderizar productos en el menú
function renderProducts(products) {
  const pizzaMenu = document.getElementById('pizzaMenu');
  if (!pizzaMenu) return;
  
  if (products.length === 0) {
    pizzaMenu.innerHTML = `
      <div class="col-12">
        <div class="text-center">
          <i class="bi bi-search display-4 text-muted"></i>
          <p class="text-muted">No se encontraron productos que coincidan con tu búsqueda</p>
        </div>
      </div>
    `;
    return;
  }
  
  // Función auxiliar para escape HTML (si no está definida globalmente)
  const escapeHtmlLocal = typeof escapeHtml !== 'undefined' && typeof escapeHtml === 'function' 
    ? escapeHtml 
    : function(text) {
        if (text === null || text === undefined) return '';
        const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
        return String(text).replace(/[&<>"']/g, m => map[m]);
      };
  
  pizzaMenu.innerHTML = products.map(product => {
    const nombreSeguro = escapeHtmlLocal(product.nombre || '');
    const descripcionSegura = escapeHtmlLocal(product.descripcion || '');
    // Usar la función getProductImage para obtener la imagen correcta
    // Priorizar imagen de la API, sino usar mapeo local
    let imagenSegura = product.imagen;
    if (!imagenSegura || imagenSegura.includes('pexels.com') || imagenSegura.includes('placeholder')) {
      imagenSegura = getProductImage(product.nombre);
    }
    
    return `
    <div class="col">
      <div class="card h-100 shadow-sm">
        <img src="${imagenSegura}" class="card-img-top" alt="${nombreSeguro}" style="height: 200px; object-fit: cover;" onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=Imagen+no+disponible';">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${nombreSeguro}</h5>
          <p class="card-text flex-grow-1">${descripcionSegura}</p>

          <div class="row g-2 align-items-center mb-2">
            <div class="col-7">
              <select class="form-select form-select-sm" id="size-${product.id_producto}" onchange="updateCardPrice(${product.id_producto}, ${product.precio})">
                <option value="small">Pequeña</option>
                <option value="medium" selected>Mediana</option>
                <option value="large">Familiar</option>
              </select>
            </div>
            <div class="col-5 text-end">
              <span id="price-${product.id_producto}" class="h6 mb-0 fw-bold text-primary">${formatCurrencyBOB(product.precio * SIZE_FACTORS.medium)}</span>
            </div>
          </div>

          <div class="d-flex justify-content-end">
            <button class="btn btn-primary" data-product-id="${product.id_producto}" data-product-name="${nombreSeguro}" data-product-price="${product.precio}" onclick="handleAddToCart(this)">
              <i class="bi bi-cart-plus"></i> Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

// Función para recalcular el precio visible en la tarjeta
function updateCardPrice(id, basePrice) {
  const sel = document.getElementById(`size-${id}`);
  const priceEl = document.getElementById(`price-${id}`);
  if (!sel || !priceEl) return;
  const factor = SIZE_FACTORS[sel.value] || 1.0;
  const newPrice = Number(basePrice) * factor;
  priceEl.textContent = formatCurrencyBOB(newPrice);
}

// Función para manejar el botón Agregar con tamaño
function handleAddToCart(button) {
  const id = parseInt(button.getAttribute('data-product-id'));
  const name = button.getAttribute('data-product-name');
  const basePrice = parseFloat(button.getAttribute('data-product-price'));
  
  const sizeSel = document.getElementById(`size-${id}`);
  const size = sizeSel ? sizeSel.value : 'medium';
  const factor = SIZE_FACTORS[size] || 1.0;
  const finalPrice = Number(basePrice) * factor;
  
  console.log(`Agregando: ${name}, Tamaño: ${size}, Precio: ${finalPrice}`);
  addToCart(id, name, finalPrice, size);
}

// Función para verificar si el usuario está logueado
function checkUserSession() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const userId = usuario?.id_usuario ?? usuario?.user_id ?? usuario?.id;
    return Boolean(userId ?? false);
  } catch (error) {
    console.error('Error al verificar la sesión almacenada:', error);
    return false;
  }
}

// Función para mostrar modal de login requerido
function showLoginRequiredModal() {
  // Crear modal si no existe
  let loginModal = document.getElementById('loginRequiredModal');
  if (!loginModal) {
    loginModal = document.createElement('div');
    loginModal.id = 'loginRequiredModal';
    loginModal.className = 'modal fade';
    loginModal.setAttribute('tabindex', '-1');
    loginModal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Inicio de Sesión Requerido</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>Para agregar productos al carrito, necesitas iniciar sesión.</p>
            <p class="text-muted">¿Deseas iniciar sesión ahora?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" id="goToLoginBtn">Iniciar Sesión</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(loginModal);
    
    // Event listener para el botón de login
    document.getElementById('goToLoginBtn').addEventListener('click', () => {
      const modal = bootstrap.Modal.getInstance(loginModal);
      if (modal) modal.hide();
      mostrarSeccion('login');
    });
  }
  
  // Mostrar el modal
  const modal = new bootstrap.Modal(loginModal);
  modal.show();
}

// Función para agregar productos al carrito
function addToCart(id, name, price, size = 'medium') {
  // Verificar si el usuario está logueado
  if (!checkUserSession()) {
    showLoginRequiredModal();
    return;
  }
  
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  // Clave única por id+size para diferenciar tamaños
  const key = `${id}-${size}`;
  const existingItem = cart.find(item => item.key === key);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      key,
      id,
      name,
      size,
      price,
      quantity: 1
    });
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCounter();
  showNotification(`Agregado: ${name} (${SIZE_LABELS[size]})`, 'success');
}

// Función para actualizar el contador del carrito
function updateCartCounter() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  let cartCounter = document.getElementById('cartCounter');
  if (!cartCounter) {
    const navbar = document.querySelector('.navbar-nav');
    const cartNavItem = document.createElement('li');
    cartNavItem.className = 'nav-item';
    cartNavItem.innerHTML = `
      <a class="nav-link position-relative" href="#" onclick="showCart()" data-bs-toggle="modal" data-bs-target="#cartModal">
        <i class="bi bi-cart3"></i> Carrito
        <span id="cartCounter" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
          ${totalItems}
        </span>
      </a>
    `;
    navbar.appendChild(cartNavItem);
  } else {
    cartCounter.textContent = totalItems;
    cartCounter.style.display = totalItems > 0 ? 'block' : 'none';
  }
}

// Función para mostrar el carrito
function showCart() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const cartModalBody = document.getElementById('cartModalBody');
  
  if (cart.length === 0) {
    cartModalBody.innerHTML = '<p class="text-center">Tu carrito está vacío</p>';
    return;
  }
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  cartModalBody.innerHTML = `
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Precio</th>
            <th>Cantidad</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${cart.map(item => `
            <tr>
              <td>${item.name}<div class="text-muted small">${item.size ? SIZE_LABELS[item.size] : 'Mediana'}</div></td>
              <td>${formatCurrencyBOB(item.price)}</td>
              <td>
                <div class="input-group input-group-sm" style="width: 120px;">
                  <button class="btn btn-outline-secondary" onclick="updateQuantity('${item.key}', ${item.quantity - 1})">-</button>
                  <input type="text" class="form-control text-center" value="${item.quantity}" readonly>
                  <button class="btn btn-outline-secondary" onclick="updateQuantity('${item.key}', ${item.quantity + 1})">+</button>
                </div>
              </td>
              <td>${formatCurrencyBOB(item.price * item.quantity)}</td>
              <td>
                <button class="btn btn-sm btn-danger" onclick="removeFromCart('${item.key}')">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="d-flex justify-content-between align-items-center mt-3">
      <h5>Total: ${formatCurrencyBOB(total)}</h5>
      <button class="btn btn-success" onclick="proceedToCheckout()">Proceder al pago</button>
    </div>
  `;
}

// Función para actualizar cantidad
function updateQuantity(key, newQuantity) {
  if (newQuantity <= 0) {
    removeFromCart(key);
    return;
  }
  
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const item = cart.find(item => item.key === key);
  
  if (item) {
    item.quantity = newQuantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCounter();
    showCart();
  }
}

// Función para eliminar producto del carrito
function removeFromCart(key) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart = cart.filter(item => item.key !== key);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCounter();
  showCart();
}

// Función para proceder al checkout
function proceedToCheckout() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  if (!usuario) {
    notifyUser('Inicio de sesión requerido', 'Por favor inicia sesión para continuar con tu pedido', 'warning');
    mostrarSeccion('login');
    return;
  }
  
  window.location.href = 'checkout.html';
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
  notifyUser('Pizza Steve', message, type);
}

// Variables globales para productos y filtrado
let products = [];
let filteredProducts = [];

// Función para inicializar búsqueda y filtrado
function initializeSearchAndFilter() {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const priceFilter = document.getElementById('priceFilter');

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
  if (categoryFilter) {
    categoryFilter.addEventListener('change', applyFilters);
  }
  if (priceFilter) {
    priceFilter.addEventListener('change', applyFilters);
  }
}

// Función para aplicar filtros y búsqueda
function applyFilters() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const selectedCategory = document.getElementById('categoryFilter')?.value || '';
  const selectedPrice = document.getElementById('priceFilter')?.value || '';

  filteredProducts = products.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm) ||
                         product.descripcion.toLowerCase().includes(searchTerm);
    
    const matchesCategory = !selectedCategory || product.categoria === selectedCategory;
    
    let matchesPrice = true;
    if (selectedPrice) {
      const [min, max] = selectedPrice.split('-').map(Number);
      matchesPrice = product.precio >= min && (max ? product.precio <= max : true);
    }

    return matchesSearch && matchesCategory && matchesPrice;
  });

  renderProducts(filteredProducts);
}

// --- Restaurar sesión si existe ---
const usuarioGuardado = localStorage.getItem("usuario");
if (usuarioGuardado) {
  try {
    const user = JSON.parse(usuarioGuardado);
    const nombreBase = user?.nombre ?? user?.username ?? '';
    const rolNormalizado = (user?.rol ?? user?.role ?? 'cliente').toLowerCase();

    // Usar escapeHtml para prevenir XSS
    const nombreSeguro = (typeof escapeHtml !== 'undefined' && typeof escapeHtml === 'function') 
      ? escapeHtml(nombreBase) 
      : (nombreBase || '').replace(/[&<>"']/g, function(m) {
          const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
          return map[m] || m;
        });

    const loginNavItem = document.getElementById("loginNavItem");
    if (loginNavItem) {
      loginNavItem.outerHTML =
        `<li class="nav-item">
           <a class="nav-link" href="#" id="logoutBtn">👋 Hola, ${nombreSeguro} (Salir)</a>
         </li>`;
    }

    switch (rolNormalizado) {
      case "admin":
        window.location.href = "views/admin/index.html";
        break;
      case "vendedor":
        window.location.href = "views/vendedor/index.html";
        break;
      case "cliente":
        mostrarSeccion("menu");
        break;
      case "repartidor":
        window.location.href = "views/delivery/index.html";
        break;
      default:
        mostrarSeccion("home");
    }
  } catch (error) {
    console.error('No se pudo restaurar la sesión almacenada:', error);
    localStorage.removeItem("usuario");
  }
}

// Funciones para filtrado y ordenamiento
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const sortFilter = document.getElementById('sortFilter');
const pizzaMenu = document.getElementById('pizzaMenu');

let pizzas = [
  {
    id: 1,
    name: 'Pizza Margherita',
    category: 'tradicional',
    price: 75,
    popular: 4,
    description: 'Salsa de tomate, mozzarella y albahaca',
    image: 'assets/images/pizzas/margherita.jpg'
  },
  // Agrega más pizzas aquí...
];

// Función para filtrar y ordenar pizzas
function filterAndSortPizzas() {
  let filteredPizzas = [...pizzas];

  // Filtrar por búsqueda
  const searchTerm = searchInput.value.toLowerCase();
  if (searchTerm) {
    filteredPizzas = filteredPizzas.filter(pizza => 
      pizza.name.toLowerCase().includes(searchTerm) ||
      pizza.description.toLowerCase().includes(searchTerm)
    );
  }

  // Filtrar por categoría
  const selectedCategory = categoryFilter.value;
  if (selectedCategory) {
    filteredPizzas = filteredPizzas.filter(pizza => 
      pizza.category === selectedCategory
    );
  }

  // Ordenar
  const sortBy = sortFilter.value;
  filteredPizzas.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'popular':
        return b.popular - a.popular;
      default:
        return 0;
    }
  });

  displayPizzas(filteredPizzas);
}

// Función para mostrar las pizzas
function displayPizzas(pizzasToShow) {
  pizzaMenu.innerHTML = '';
  
  pizzasToShow.forEach(pizza => {
    const pizzaCard = `
      <div class="col">
        <div class="card h-100">
          <img src="${pizza.image}" class="card-img-top" alt="${pizza.name}">
          <div class="card-body">
            <h5 class="card-title">${pizza.name}</h5>
            <p class="card-text">${pizza.description}</p>
            <p class="card-text">
              <small class="text-muted">Categoría: ${pizza.category}</small>
            </p>
            <div class="d-flex justify-content-between align-items-center">
              <span class="h5 mb-0">Bs. ${pizza.price}</span>
              <button class="btn btn-primary" onclick="addToCart(${pizza.id})">
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    pizzaMenu.innerHTML += pizzaCard;
  });
}

// Eventos para los filtros
searchInput.addEventListener('input', filterAndSortPizzas);
categoryFilter.addEventListener('change', filterAndSortPizzas);
sortFilter.addEventListener('change', filterAndSortPizzas);

// Cargar pizzas al iniciar
document.addEventListener('DOMContentLoaded', () => {
  displayPizzas(pizzas);
});

// NOTA: Esta función addToCart está duplicada y no se usa.
// La función correcta está más arriba (línea ~579) con verificación de sesión.
// Se mantiene comentada por si hay referencias antiguas.
/*
function addToCart(pizzaId) {
  const pizza = pizzas.find(p => p.id === pizzaId);
  if (pizza) {
    // Implementar lógica del carrito
    console.log(`Pizza agregada al carrito: ${pizza.name}`);
  }
}
*/

// Array de promociones
const promotions = [
  {
    id: 1,
    title: "2x1 Martes de Pepperoni",
    description: "Todos los martes, lleva 2 pizzas de pepperoni por el precio de 1",
    startDate: "2025-10-01",
    endDate: "2025-12-31",
    discount: 50.00,
    image: "assets/images/promotions/2x1-pepperoni.jpg",
    active: true
  },
  {
    id: 2,
    title: "Delivery gratis Miércoles",
    description: "Delivery sin costo en todos tus pedidos los días miércoles",
    startDate: "2025-10-01",
    endDate: "2025-12-31",
    discount: 10.00,
    image: "assets/images/promotions/free-delivery.jpg",
    active: true
  },
  {
    id: 3,
    title: "Fines de semana 15% off",
    description: "Disfruta un 15% de descuento en todas las pizzas los fines de semana",
    startDate: "2025-10-01",
    endDate: "2025-12-31",
    discount: 15.00,
    image: "assets/images/promotions/weekend-discount.jpg",
    active: true
  }
];

// Función para mostrar las promociones
function displayPromotions() {
  const promoContainer = document.getElementById('promoContainer');
  promoContainer.innerHTML = '';

  promotions.forEach(promo => {
    if (promo.active) {
      const promoCard = `
        <div class="col">
          <div class="card h-100 promotion-card">
            <div class="card-body">
              <div class="ribbon-wrapper">
                <div class="ribbon">${promo.discount}% OFF</div>
              </div>
              <h3 class="card-title">${promo.title}</h3>
              <p class="card-text">${promo.description}</p>
              <div class="promo-dates">
                <small class="text-muted">
                  Válido desde: ${formatDate(promo.startDate)} 
                  hasta: ${formatDate(promo.endDate)}
                </small>
              </div>
              <button class="btn btn-primary mt-3" onclick="applyPromotion(${promo.id})">
                Aprovechar Promoción
              </button>
            </div>
          </div>
        </div>
      `;
      promoContainer.innerHTML += promoCard;
    }
  });
}

// Función para formatear fechas
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('es-ES', options);
}

// Función para aplicar la promoción
function applyPromotion(promoId) {
  const promotion = promotions.find(p => p.id === promoId);
  if (promotion) {
    // Aquí puedes agregar la lógica para aplicar la promoción al carrito
    notifyUser('Promoción aplicada', `Promoción "${promotion.title}" aplicada correctamente`, 'success');
  }
}

// Agregar estilos CSS para las promociones
const styles = `
  .promotion-card {
    border: none;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease;
  }

  .promotion-card:hover {
    transform: translateY(-5px);
  }

  .ribbon-wrapper {
    position: absolute;
    top: 0;
    right: 0;
    width: 100px;
    height: 100px;
    overflow: hidden;
  }

  .ribbon {
    background: #ff4444;
    color: white;
    text-align: center;
    padding: 5px 0;
    width: 150px;
    position: absolute;
    top: 20px;
    right: -40px;
    transform: rotate(45deg);
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;

// Agregar los estilos al documento
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

// Cargar las promociones cuando se muestre la sección
document.addEventListener('DOMContentLoaded', () => {
  // ...existing code...
  displayPromotions();
});
