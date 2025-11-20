// ===============================
// 💳 PÁGINA DE CHECKOUT
// ===============================

document.addEventListener('DOMContentLoaded', function() {
    // Cargar el resumen del carrito
    loadOrderSummary();
    
    // Establecer fecha mínima (hoy)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fechaEntrega').setAttribute('min', today);
    document.getElementById('fechaEntrega').value = today;
    
    // Cargar información del usuario si está logueado
    loadUserInfo();
    
    // Mostrar/ocultar opciones de pago según el método seleccionado
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', handlePaymentMethodChange);
    });
    
    // Calcular cambio cuando se ingresa monto en efectivo
    const montoEfectivoInput = document.getElementById('montoEfectivo');
    if (montoEfectivoInput) {
        montoEfectivoInput.addEventListener('input', calculateChange);
        montoEfectivoInput.addEventListener('change', calculateChange);
    }
    
    // Calcular cambio cuando cambia el total del pedido
    // Esto se ejecutará cuando se actualice el resumen del pedido
    const originalLoadOrderSummary = loadOrderSummary;
    loadOrderSummary = function() {
        originalLoadOrderSummary();
        // Si el método de pago es efectivo, recalcular cambio
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
        if (paymentMethod && paymentMethod.value === 'efectivo') {
            calculateChange();
        }
    };
});

// Función para cargar el resumen del pedido
function loadOrderSummary() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const orderSummary = document.getElementById('orderSummary');
    
    if (cart.length === 0) {
        orderSummary.innerHTML = '<p class="text-center text-muted">Tu carrito está vacío</p>';
        document.getElementById('totalAmount').textContent = 'Bs. 0.00';
        return;
    }
    
    let total = 0;
    
    orderSummary.innerHTML = cart.map(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        
        return `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <strong>${item.name}</strong>
                    <br>
                    <small class="text-muted">Cantidad: ${item.quantity}</small>
                </div>
                <span>Bs. ${subtotal.toFixed(2)}</span>
            </div>
        `;
    }).join('');
    
    document.getElementById('totalAmount').textContent = `Bs. ${total.toFixed(2)}`;
}

// Función para cargar información del usuario
function loadUserInfo() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (usuario) {
        document.getElementById('nombre').value = usuario.nombre || '';
        // Aquí podrías cargar más información del usuario si la tienes
    }
}

// Función para manejar el cambio de método de pago
function handlePaymentMethodChange(event) {
    const paymentMethod = event.target.value;
    const efectivoOptions = document.getElementById('efectivoOptions');
    
    if (paymentMethod === 'efectivo') {
        efectivoOptions.style.display = 'block';
        // Calcular cambio si ya hay un monto ingresado
        calculateChange();
    } else {
        efectivoOptions.style.display = 'none';
    }
}

// Función para calcular y mostrar el cambio
function calculateChange() {
    const montoEfectivo = parseFloat(document.getElementById('montoEfectivo').value) || 0;
    const totalAmount = parseFloat(document.getElementById('totalAmount').textContent.replace('Bs. ', '').replace(',', '')) || 0;
    const cambioInfo = document.getElementById('cambioInfo');
    const cambioAmount = document.getElementById('cambioAmount');
    
    if (montoEfectivo > 0 && montoEfectivo >= totalAmount) {
        const cambio = montoEfectivo - totalAmount;
        cambioAmount.textContent = `Bs. ${cambio.toFixed(2)}`;
        cambioInfo.style.display = 'block';
    } else if (montoEfectivo > 0 && montoEfectivo < totalAmount) {
        const faltante = totalAmount - montoEfectivo;
        cambioAmount.textContent = `Faltan Bs. ${faltante.toFixed(2)}`;
        cambioInfo.className = 'mt-2 alert alert-warning mb-0';
        cambioInfo.style.display = 'block';
    } else {
        cambioInfo.style.display = 'none';
    }
}

// Función para validar el formulario
function validateForm() {
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const fechaEntrega = document.getElementById('fechaEntrega').value;
    const horaEntrega = document.getElementById('horaEntrega').value;
    
    if (!nombre || !telefono || !direccion || !fechaEntrega || !horaEntrega) {
        notify('Checkout', 'Por favor, completa todos los campos obligatorios', 'warning');
        return false;
    }
    
    // Validar teléfono (solo números y mínimo 7 dígitos)
    const phoneRegex = /^[0-9]{7,15}$/;
    if (!phoneRegex.test(telefono)) {
        notify('Checkout', 'Por favor, ingresa un número de teléfono válido', 'warning');
        return false;
    }
    
    // Validar fecha (no puede ser anterior a hoy)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let selectedDate = null;
    if (fechaEntrega) {
        const [year, month, day] = fechaEntrega.split('-').map(Number);
        selectedDate = new Date(year, month - 1, day);
        selectedDate.setHours(0, 0, 0, 0);
    }

    if (!selectedDate || Number.isNaN(selectedDate.getTime())) {
        notify('Checkout', 'Selecciona una fecha de entrega válida.', 'warning');
        return false;
    }

    if (selectedDate < todayStart) {
        notify('Checkout', 'La fecha de entrega no puede ser anterior a hoy', 'warning');
        return false;
    }
    
    return true;
}

// Función para confirmar el pedido
async function confirmOrder() {
    if (!validateForm()) {
        return;
    }
    
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        notify('Checkout', 'Tu carrito está vacío', 'warning');
        return;
    }

    const usuarioStorage = localStorage.getItem('usuario');
    if (!usuarioStorage) {
        notify('Checkout', 'Debes iniciar sesión para confirmar tu pedido.', 'error');
        window.location.href = 'index.html#login';
        return;
    }

    let usuarioData;
    try {
        usuarioData = JSON.parse(usuarioStorage);
    } catch (err) {
        console.error('No se pudo leer la información de usuario almacenada:', err);
        notify('Checkout', 'Ocurrió un problema con tu sesión. Inicia sesión nuevamente.', 'error');
        localStorage.removeItem('usuario');
        window.location.href = 'index.html#login';
        return;
    }

    const userId = usuarioData?.id_usuario ?? usuarioData?.user_id ?? usuarioData?.id ?? null;
    
    if (!userId) {
        notify('Checkout', 'No pudimos identificar tu cuenta. Inicia sesión de nuevo.', 'error');
        window.location.href = 'index.html#login';
        return;
    }
    
    // Obtener datos del formulario
    const customerName = document.getElementById('nombre').value.trim();
    const phone = document.getElementById('telefono').value.trim();
    const address = document.getElementById('direccion').value.trim();
    const postalCode = document.getElementById('codigoPostal').value.trim();
    const references = document.getElementById('referencias').value.trim();
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const deliveryDate = document.getElementById('fechaEntrega').value;
    const deliveryTime = document.getElementById('horaEntrega').value;
    const saveAddress = document.getElementById('guardarDireccion').checked;
    const cashAmount = document.getElementById('montoEfectivo').value.trim();
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (paymentMethod === 'efectivo') {
        const efectivoNumber = parseFloat(cashAmount.replace(',', '.'));
        if (Number.isNaN(efectivoNumber)) {
            notify('Checkout', 'Ingresa un monto en efectivo válido.', 'warning');
            return;
        }
        if (efectivoNumber < totalAmount) {
            notify('Checkout', `El monto en efectivo debe ser al menos Bs. ${totalAmount.toFixed(2)}.`, 'warning');
            return;
        }
    }

    const orderProducts = cart.map(item => ({
        id_producto: item.id ?? item.productId ?? item.id_producto ?? null,
        cantidad: item.quantity ?? item.qty ?? 1,
        precio: item.price ?? 0,
        size: item.size ?? null,
        nombre: item.name ?? ''
    })).filter(producto => producto.id_producto);

    if (orderProducts.length === 0) {
        notify('Checkout', 'No se pudieron determinar los productos del pedido.', 'error');
        return;
    }

    const orderPayload = {
        usuario_id: userId,
        total: totalAmount,
        productos: orderProducts,
        metodo_pago: paymentMethod,
        direccion: address,
        referencias,
        telefono: phone,
        codigo_postal: postalCode,
        fecha_entrega: deliveryDate,
        hora_entrega: deliveryTime,
        guardar_direccion: saveAddress,
        monto_efectivo: paymentMethod === 'efectivo' ? parseFloat(cashAmount.replace(',', '.')) : null,
        customer_name: customerName
    };
    
    try {
        // Enviar pedido a la API
        const response = await fetch('api/orders.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(orderPayload)
        });

        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            console.error('No se pudo interpretar la respuesta del servidor:', parseError);
            notify('Checkout', 'El servidor devolvió una respuesta inesperada.', 'error');
            return;
        }

        if (!response.ok) {
            const message = result?.message || `Error ${response.status}: ${response.statusText}`;
            if (response.status === 401 || response.status === 403) {
                notify('Checkout', message, 'error');
                window.location.href = 'index.html#login';
            } else {
                notify('Checkout', 'Error al procesar el pedido: ' + message, 'error');
            }
            return;
        }
        
        if (result.success) {
            // Limpiar carrito
            localStorage.removeItem('cart');
            
            // Redirigir a la página de recibo con QR
            const orderId = result.orderId || (result.id_pedido ? 'ORD-' + String(result.id_pedido).padStart(3, '0') : '');
            window.location.href = `order-receipt.html?orderId=${orderId}`;
        } else {
            notify('Checkout', 'Error al procesar el pedido: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        notify('Checkout', 'Error al procesar el pedido. Por favor, intenta nuevamente.', 'error');
    }
}

// Función para mostrar modal de confirmación
function showConfirmationModal(orderId) {
    document.getElementById('orderNumber').textContent = `Número de pedido: ${orderId}`;
    document.getElementById('deliveryTime').textContent = document.getElementById('horaEntrega').value;
    
    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    modal.show();
}

// Función para ir a mis pedidos
function goToMyOrders() {
    window.location.href = 'views/usuario/index.html';
}

// Función para volver al menú
function goBack() {
    window.location.href = 'index.html#menu';
}

// Función para obtener ubicación actual (opcional)
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Aquí podrías usar las coordenadas para autocompletar la dirección
                console.log('Ubicación obtenida:', position.coords);
                notify('Checkout', 'Ubicación obtenida exitosamente. Puedes usarla para una entrega más precisa.', 'success');
            },
            (error) => {
                console.error('Error al obtener ubicación:', error);
                notify('Checkout', 'No se pudo obtener tu ubicación. Por favor, ingresa tu dirección manualmente.', 'warning');
            }
        );
    } else {
        notify('Checkout', 'Tu navegador no soporta geolocalización.', 'warning');
    }
}