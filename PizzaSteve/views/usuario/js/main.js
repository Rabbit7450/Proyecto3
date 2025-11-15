// Panel de Cliente - JavaScript Principal
document.addEventListener('DOMContentLoaded', function() {
    initializeClientPanel();
});

function initializeClientPanel() {
    // Verificar autenticación
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (!usuario) {
        window.location.href = '../../index.html';
        return;
    }

    // Configurar navegación
    setupNavigation();
    
    // Cargar información inicial
    loadUserInfo();
    
    // Inicializar event listeners
    setupEventListeners();
}

function notifyClientPanel(title, message, type = 'info', duration = 5000) {
    if (typeof window.notify === 'function') {
        window.notify(title, message, type, duration);
        return;
    }

    if (window.notificationSystem && typeof window.notificationSystem.showNotification === 'function') {
        window.notificationSystem.showNotification(title, message, type, duration);
        return;
    }

    console[type === 'error' ? 'error' : 'log'](`${title}: ${message}`);
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar .nav-link[data-section]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Actualizar estado activo
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function showSection(section) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.style.display = 'none';
    });
    
    // Mostrar sección seleccionada
    const selectedSection = document.getElementById(section);
    if (selectedSection) {
        selectedSection.style.display = 'block';
        
        // Cargar datos específicos de la sección
        switch(section) {
            case 'profile':
                loadProfileData();
                break;
            case 'orders':
                loadOrders();
                break;
            case 'addresses':
                loadAddresses();
                break;
            case 'payment':
                loadPaymentMethods();
                break;
            case 'favorites':
                loadFavorites();
                break;
        }
    }
}

function setupEventListeners() {
    // Formulario de actualización de perfil
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        // Validación en tiempo real
        const nameInput = document.getElementById('profileName');
        const emailInput = document.getElementById('profileEmail');
        const phoneInput = document.getElementById('profilePhone');
        const addressInput = document.getElementById('profileAddress');
        
        if (nameInput) {
            nameInput.addEventListener('blur', () => validateProfileName(nameInput));
            nameInput.addEventListener('input', () => {
                if (nameInput.classList.contains('is-invalid')) {
                    validateProfileName(nameInput);
                }
            });
        }
        
        if (emailInput) {
            emailInput.addEventListener('blur', function() {
                if (!this.value || !this.validity.valid) {
                    this.classList.add('is-invalid');
                } else {
                    this.classList.remove('is-invalid');
                }
            });
        }
        
        if (phoneInput) {
            phoneInput.addEventListener('blur', () => validateProfilePhone(phoneInput));
            phoneInput.addEventListener('input', function() {
                // Solo permitir números, espacios, guiones, paréntesis y +
                this.value = this.value.replace(/[^\d\s\-\+\(\)]/g, '');
                if (this.classList.contains('is-invalid')) {
                    validateProfilePhone(phoneInput);
                }
            });
        }
        
        if (addressInput) {
            addressInput.addEventListener('blur', () => validateProfileAddress(addressInput));
            addressInput.addEventListener('input', () => {
                if (addressInput.classList.contains('is-invalid')) {
                    validateProfileAddress(addressInput);
                }
            });
        }
        
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Botones de acciones
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('reorder-btn')) {
            const orderId = e.target.getAttribute('data-order-id');
            reorderItems(orderId);
        }
        
        if (e.target.classList.contains('track-order-btn')) {
            const orderId = e.target.getAttribute('data-order-id');
            trackOrder(orderId);
        }
        
        if (e.target.classList.contains('rate-order-btn')) {
            const orderId = e.target.getAttribute('data-order-id');
            rateOrder(orderId);
        }
    });
}

// Función para cargar información del usuario
async function loadUserInfo() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (!usuario) {
        window.location.href = '../../index.html';
        return;
    }

    document.getElementById('userName').textContent = usuario.nombre || 'Usuario';
    document.getElementById('userEmail').textContent = usuario.email || 'usuario@ejemplo.com';
    document.getElementById('userPhone').textContent = usuario.telefono || 'No especificado';
    document.getElementById('userAddress').textContent = usuario.direccion || 'No especificada';
    
    // Cargar pedidos del usuario
    await loadOrders();
    
    // Iniciar verificación de actualizaciones de pedidos
    if (window.checkOrderUpdates) {
        window.checkOrderUpdates(usuario.id_usuario);
    }
}

// Función para cargar datos del perfil
function loadProfileData() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (usuario) {
        document.getElementById('profileName').value = usuario.nombre || '';
        document.getElementById('profileEmail').value = usuario.email || '';
        document.getElementById('profilePhone').value = usuario.telefono || '';
        document.getElementById('profileAddress').value = usuario.direccion || '';
    }
}

// Función para validar nombre
function validateProfileName(input) {
    const value = input.value.trim();
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
    if (!value || value.length < 2 || !nameRegex.test(value)) {
        input.classList.add("is-invalid");
        return false;
    }
    input.classList.remove("is-invalid");
    return true;
}

// Función para validar teléfono
function validateProfilePhone(input) {
    const value = input.value.trim();
    const digitsOnly = value.replace(/\D/g, '');
    if (!value || digitsOnly.length < 7 || digitsOnly.length > 15) {
        input.classList.add("is-invalid");
        return false;
    }
    input.classList.remove("is-invalid");
    return true;
}

// Función para validar dirección
function validateProfileAddress(input) {
    const value = input.value.trim();
    if (value && value.length < 5) {
        input.classList.add("is-invalid");
        return false;
    }
    input.classList.remove("is-invalid");
    return true;
}

// Función para manejar actualización de perfil
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    // Validar campos antes de enviar
    const nameInput = document.getElementById('profileName');
    const emailInput = document.getElementById('profileEmail');
    const phoneInput = document.getElementById('profilePhone');
    const addressInput = document.getElementById('profileAddress');
    
    let isValid = true;
    if (nameInput && !validateProfileName(nameInput)) isValid = false;
    if (emailInput && (!emailInput.value || !emailInput.validity.valid)) {
        emailInput.classList.add("is-invalid");
        isValid = false;
    }
    if (phoneInput && !validateProfilePhone(phoneInput)) isValid = false;
    if (addressInput && !validateProfileAddress(addressInput)) isValid = false;
    
    if (!isValid) {
        if (window.notificationSystem) {
            window.notificationSystem.showNotification(
                'Error de Validación',
                'Por favor corrija los errores en el formulario',
                'error'
            );
        }
        return;
    }
    
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const updatedData = {
        id_usuario: usuario.id_usuario,
        nombre: nameInput.value.trim(),
        correo_electronico: emailInput.value.trim(),
        telefono: phoneInput.value.trim(),
        direccion: addressInput.value.trim()
    };
    
    try {
        const response = await fetch('../../api/users.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Actualizar datos en localStorage
            localStorage.setItem('usuario', JSON.stringify({...usuario, ...updatedData}));
            
            // Mostrar notificación de éxito
            if (window.notificationSystem) {
                window.notificationSystem.showNotification(
                    'Perfil Actualizado',
                    'Tu información ha sido actualizada exitosamente',
                    'success'
                );
            }
            
            // Recargar información
            loadUserInfo();
        } else {
            if (window.notificationSystem) {
                window.notificationSystem.showNotification(
                    'Error al Actualizar',
                    result.message || 'No se pudo actualizar tu información',
                    'error'
                );
            }
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        if (window.notificationSystem) {
            window.notificationSystem.showNotification(
                'Error',
                'Error al actualizar el perfil',
                'error'
            );
        }
    }
}

// Función para cargar pedidos
async function loadOrders() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (!usuario) return;
    
    try {
        const response = await fetch(`../../api/orders.php?user_id=${usuario.id_usuario}`);
        const orders = await response.json();
        
        displayOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('ordersList').innerHTML = '<p class="text-center text-muted">Error al cargar pedidos</p>';
    }
}

// Función para mostrar pedidos
function displayOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    
    if (!orders || orders.length === 0) {
        ordersList.innerHTML = '<p class="text-center text-muted">No tienes pedidos registrados</p>';
        return;
    }
    
    ordersList.innerHTML = orders.map(order => `
        <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <strong>Pedido #${order.id}</strong>
                    <span class="badge bg-${getStatusColor(order.status)} ms-2">${getStatusText(order.status)}</span>
                </div>
                <small class="text-muted">${formatDate(order.fecha)}</small>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Total:</strong> $${order.total}</p>
                        <p><strong>Pago:</strong> ${getPaymentIcon(order.payment_method)} ${order.payment_method}</p>
                        <p><strong>Dirección:</strong> ${order.address}</p>
                    </div>
                    <div class="col-md-6">
                        <div class="d-grid gap-2">
                            <button class="btn btn-sm btn-outline-primary track-order-btn" data-order-id="${order.id}">
                                <i class="bi bi-geo-alt"></i> Rastrear Pedido
                            </button>
                            <button class="btn btn-sm btn-outline-success reorder-btn" data-order-id="${order.id}">
                                <i class="bi bi-arrow-repeat"></i> Reordenar
                            </button>
                            ${order.status === 'entregado' ? `
                                <button class="btn btn-sm btn-outline-warning rate-order-btn" data-order-id="${order.id}">
                                    <i class="bi bi-star"></i> Calificar
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Funciones auxiliares
function getStatusColor(status) {
    const colors = {
        'pendiente': 'warning',
        'preparando': 'info',
        'en_camino': 'primary',
        'entregado': 'success',
        'cancelado': 'danger'
    };
    return colors[status] || 'secondary';
}

function getStatusText(status) {
    const texts = {
        'pendiente': 'Pendiente',
        'preparando': 'En Preparación',
        'en_camino': 'En Camino',
        'entregado': 'Entregado',
        'cancelado': 'Cancelado'
    };
    return texts[status] || status;
}

function getPaymentIcon(method) {
    const icons = {
        'tarjeta': 'bi-credit-card',
        'efectivo': 'bi-cash',
        'paypal': 'bi-paypal'
    };
    return icons[method] ? `<i class="bi ${icons[method]}"></i>` : '';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Funciones de acción
function trackOrder(orderId) {
    if (window.notificationSystem) {
        window.notificationSystem.showNotification(
            'Rastreo de Pedido',
            `Rastreando pedido #${orderId}...`,
            'info'
        );
    }
    // Aquí iría la lógica de rastreo real
}

function reorderItems(orderId) {
    if (window.notificationSystem) {
        window.notificationSystem.showNotification(
            'Reordenar',
            `Reordenando items del pedido #${orderId}...`,
            'info'
        );
    }
    // Aquí iría la lógica de reordenar
}

function rateOrder(orderId) {
    if (window.notificationSystem) {
        window.notificationSystem.showNotification(
            'Calificar Pedido',
            `Abriendo calificación para pedido #${orderId}`,
            'info'
        );
    }
    // Aquí iría la lógica de calificación
}

// Funciones para cargar otras secciones
async function loadAddresses() {
    // Implementar carga de direcciones
    document.getElementById('addressesList').innerHTML = '<p class="text-center text-muted">Función en desarrollo</p>';
}

async function loadPaymentMethods() {
    // Implementar carga de métodos de pago
    document.getElementById('paymentMethodsList').innerHTML = '<p class="text-center text-muted">Función en desarrollo</p>';
}

async function loadFavorites() {
    // Implementar carga de favoritos
    document.getElementById('favoritesList').innerHTML = '<p class="text-center text-muted">Función en desarrollo</p>';
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('usuario');
    window.location.href = '../../index.html';
}

// Función para validar formulario de dirección
function validateAddressForm() {
    const aliasInput = document.getElementById('addressAlias');
    const streetInput = document.getElementById('addressStreet');
    const coloniaInput = document.getElementById('addressColonia');
    const cpInput = document.getElementById('addressCP');
    
    let isValid = true;
    
    // Validar alias
    if (aliasInput) {
        const aliasValue = aliasInput.value.trim();
        const aliasRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s'-]+$/;
        if (!aliasValue || aliasValue.length < 2 || aliasValue.length > 50 || !aliasRegex.test(aliasValue)) {
            aliasInput.classList.add('is-invalid');
            isValid = false;
        } else {
            aliasInput.classList.remove('is-invalid');
        }
    }
    
    // Validar calle
    if (streetInput) {
        const streetValue = streetInput.value.trim();
        if (!streetValue || streetValue.length < 5) {
            streetInput.classList.add('is-invalid');
            isValid = false;
        } else {
            streetInput.classList.remove('is-invalid');
        }
    }
    
    // Validar colonia
    if (coloniaInput) {
        const coloniaValue = coloniaInput.value.trim();
        const coloniaRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s'-]+$/;
        if (!coloniaValue || coloniaValue.length < 2 || !coloniaRegex.test(coloniaValue)) {
            coloniaInput.classList.add('is-invalid');
            isValid = false;
        } else {
            coloniaInput.classList.remove('is-invalid');
        }
    }
    
    // Validar código postal
    if (cpInput) {
        const cpValue = cpInput.value.trim();
        const cpRegex = /^[0-9]+$/;
        if (!cpValue || cpValue.length < 4 || cpValue.length > 10 || !cpRegex.test(cpValue)) {
            cpInput.classList.add('is-invalid');
            isValid = false;
        } else {
            cpInput.classList.remove('is-invalid');
        }
    }
    
    return isValid;
}

// Función para agregar dirección
function addAddress() {
    if (!validateAddressForm()) {
        notifyClientPanel('Error de Validación', 'Por favor corrija los errores en el formulario de dirección', 'error');
        return;
    }
    
    const addressData = {
        alias: document.getElementById('addressAlias').value.trim(),
        street: document.getElementById('addressStreet').value.trim(),
        colonia: document.getElementById('addressColonia').value.trim(),
        codigo_postal: document.getElementById('addressCP').value.trim(),
        referencias: document.getElementById('addressReferencias').value.trim()
    };
    
    // Aquí iría la lógica para guardar la dirección (API call)
    // Por ahora solo mostramos un mensaje
    notifyClientPanel('Dirección Agregada', 'La dirección ha sido agregada exitosamente', 'success');
    
    // Cerrar modal y limpiar formulario
    const modal = bootstrap.Modal.getInstance(document.getElementById('addAddressModal'));
    if (modal) {
        modal.hide();
    }
    document.getElementById('addAddressForm').reset();
    
    // Recargar direcciones
    loadAddresses();
}

// Agregar evento de logout si existe el botón
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Agregar event listeners para botones de pedidos (delegación de eventos)
    document.addEventListener('click', function(e) {
        if (e.target.closest('.track-order-btn')) {
            const orderId = e.target.closest('.track-order-btn').dataset.orderId;
            trackOrder(orderId);
        } else if (e.target.closest('.reorder-btn')) {
            const orderId = e.target.closest('.reorder-btn').dataset.orderId;
            reorderItems(orderId);
        } else if (e.target.closest('.rate-order-btn')) {
            const orderId = e.target.closest('.rate-order-btn').dataset.orderId;
            rateOrder(orderId);
        }
    });
    
    // Validación en tiempo real para formulario de dirección
    const addressAlias = document.getElementById('addressAlias');
    const addressStreet = document.getElementById('addressStreet');
    const addressColonia = document.getElementById('addressColonia');
    const addressCP = document.getElementById('addressCP');
    
    if (addressAlias) {
        addressAlias.addEventListener('blur', function() {
            const value = this.value.trim();
            const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s'-]+$/;
            if (!value || value.length < 2 || value.length > 50 || !regex.test(value)) {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });
    }
    
    if (addressStreet) {
        addressStreet.addEventListener('blur', function() {
            const value = this.value.trim();
            if (!value || value.length < 5) {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });
    }
    
    if (addressColonia) {
        addressColonia.addEventListener('blur', function() {
            const value = this.value.trim();
            const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s'-]+$/;
            if (!value || value.length < 2 || !regex.test(value)) {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });
    }
    
    if (addressCP) {
        addressCP.addEventListener('blur', function() {
            const value = this.value.trim();
            const regex = /^[0-9]+$/;
            if (!value || value.length < 4 || value.length > 10 || !regex.test(value)) {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });
        
        addressCP.addEventListener('input', function() {
            // Solo permitir números
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }
});