// =================================================================
// CONFIGURATION & INITIALIZATION
// =================================================================
const orsApiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijg5ODZiMzE3ZGJjZjQzNmZhOTUzMGQxMmVlMzJlMDNlIiwiaCI6Im11cm11cjY0In0=';
let currentRouteLayer = null;
let allOrders = [];

function notifyDelivery(message, type = 'info', title = 'Panel de repartidor') {
    if (typeof window.notify === 'function') {
        window.notify(title, message, type);
        return;
    }

    if (window.notificationSystem && typeof window.notificationSystem.showNotification === 'function') {
        window.notificationSystem.showNotification(title, message, type);
        return;
    }

    console[type === 'error' ? 'error' : 'log'](`${title}: ${message}`);
}

async function logoutDeliveryUser() {
    try {
        await apiFetch('../../api/logout.php', { method: 'POST' });
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
    try {
        localStorage.removeItem('usuario');
    } catch (storageError) {
        console.warn('No se pudo limpiar la sesión local:', storageError);
    }
    window.location.href = '../../Index.html';
}

const map = L.map('map').setView([-16.495, -68.133], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const sucursales = {
    "Los Pinos": { lat: -16.54303, lng: -68.07412 },
    "Sopocachi": { lat: -16.507, lng: -68.127 },
    "Miraflores": { lat: -16.5055, lng: -68.1222 }
};

for (const sucursal in sucursales) {
    const marker = L.marker([sucursales[sucursal].lat, sucursales[sucursal].lng]).addTo(map);
    marker.bindPopup(`<b>Pizza Steve - ${sucursal}</b>`);
}

// =================================================================
// AUTHENTICATION & API HELPERS
// =================================================================

// Helper para hacer peticiones API con autenticación
const apiFetch = async (url, options = {}) => {
    const defaultOptions = {
        credentials: 'include', // Siempre incluir cookies de sesión
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    return fetch(url, { ...defaultOptions, ...options });
};

// Verificar sesión en el servidor
async function checkSession() {
    try {
        const response = await apiFetch('../../api/session_check.php', {
            method: 'GET'
        });
        
        const data = await response.json();
        
        if (data.success && data.authenticated) {
            // Verificar que el usuario tenga rol de repartidor
            if (data.user && data.user.role && data.user.role.toLowerCase() === 'repartidor') {
                return true;
            } else {
                notifyDelivery('No tienes permisos para acceder al panel de repartidor.', 'error');
                window.location.href = '../../Index.html';
                return false;
            }
        } else {
            // Sesión inválida o usuario desactivado
            notifyDelivery('Por favor, inicia sesión para acceder al panel de repartidor.', 'warning');
            window.location.href = '../../Index.html';
            return false;
        }
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        notifyDelivery('Error al verificar la sesión. Por favor, intenta nuevamente.', 'error');
        window.location.href = '../../Index.html';
        return false;
    }
}

// Manejo de respuestas con verificación de autenticación
async function handleResponse(response) {
    // Si la respuesta es un error 401 o 403, verificar si es por sesión inválida
    if (response.status === 401 || response.status === 403) {
        try {
            const data = await response.clone().json();
            if (data.redirect === true) {
                // Sesión inválida, redirigir al login
                notifyDelivery(data.message || 'Su sesión ha expirado. Será redirigido al login.', 'warning');
                window.location.href = '../../Index.html';
                throw new Error('Sesión inválida');
            }
        } catch (e) {
            // No es JSON, continuar normalmente
        }
    }
    
    if (!response.ok) {
        const text = await response.text();
        let errorMessage = 'Error en la petición';
        try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
            errorMessage = text || `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }
    return response.json();
}

// =================================================================
// DATA FETCHING
// =================================================================
async function loadDataFromAPI() {
    try {
        const response = await apiFetch('../../api/orders.php');
        const data = await handleResponse(response);
        allOrders = data;
        renderDashboard();
        renderPendingOrders();
    } catch (error) {
        console.error("Error fetching data from API:", error);
        const orderList = document.getElementById('pending-orders-list');
        if (orderList) {
            orderList.innerHTML = `<li class="text-red-400">Error al cargar los datos: ${error.message}</li>`;
        }
    }
}

// =================================================================
// RENDERING LOGIC (Updated for Tailwind/Bootstrap)
// =================================================================

function renderDashboard() {
    let completed = 0;
    let pending = 0;
    let earnings = 0;
    const payments = { efectivo: 0, transferencia: 0, qr: 0 };

    allOrders.forEach(order => {
        if (order.status === 'completed') {
            completed++;
            earnings += order.price;
            if (payments.hasOwnProperty(order.paymentType)) {
                payments[order.paymentType]++;
            }
        } else if (order.status === 'pending' || order.status === 'ready_for_delivery' || order.status === 'out_for_delivery') {
            pending++;
        }
    });

    // Update the text content of the static elements in the HTML
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-earnings').textContent = `Bs. ${earnings.toFixed(2)}`;
    document.getElementById('stat-cash').textContent = payments.efectivo;
    document.getElementById('stat-transfer').textContent = payments.transferencia;
    document.getElementById('stat-qr').textContent = payments.qr;
}

function renderPendingOrders() {
    const orderList = document.getElementById('pending-orders-list');
    orderList.innerHTML = '';

    // Mostrar pedidos pendientes, listos para entrega y en camino
    const pendingOrders = allOrders.filter(order => 
        order.status === 'pending' || 
        order.status === 'ready_for_delivery' || 
        order.status === 'out_for_delivery'
    );

    if (pendingOrders.length === 0) {
        const li = document.createElement('li');
        li.className = 'text-gray-500 dark:text-gray-400 text-center p-4';
        li.textContent = 'No hay pedidos pendientes.';
        orderList.appendChild(li);
        return;
    }

    pendingOrders.forEach(order => {
        const listItem = document.createElement('li');
        listItem.className = 'bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow transition-shadow duration-300 hover:shadow-lg';

        const title = document.createElement('h3');
        title.className = 'font-bold text-lg text-brand-red mb-2';
        title.textContent = `${order.id} - ${order.customerName}`;

        // Dirección con mejor formato
        const addressContainer = document.createElement('div');
        addressContainer.className = 'mb-2';
        const addressLabel = document.createElement('strong');
        addressLabel.className = 'text-sm text-gray-700 dark:text-gray-300';
        addressLabel.textContent = 'Dirección: ';
        const address = document.createElement('span');
        address.className = 'text-sm text-gray-600 dark:text-gray-400';
        address.textContent = order.address || 'No especificada';
        addressContainer.appendChild(addressLabel);
        addressContainer.appendChild(address);

        const amount = document.createElement('p');
        amount.className = 'text-sm text-gray-600 dark:text-gray-300 my-1';
        amount.innerHTML = `<strong>Monto:</strong> Bs. ${order.price.toFixed(2)}`;

        const payment = document.createElement('p');
        payment.className = 'text-sm text-gray-600 dark:text-gray-300 my-1';
        payment.innerHTML = `<strong>Pago:</strong> ${order.paymentType || 'No especificado'}`;

        const statusBadge = document.createElement('span');
        statusBadge.className = 'badge mb-2';
        if (order.status === 'pending') {
            statusBadge.className += ' bg-warning text-dark';
            statusBadge.textContent = 'Pendiente';
        } else if (order.status === 'ready_for_delivery') {
            statusBadge.className += ' bg-primary text-white';
            statusBadge.textContent = 'Listo para Entrega';
        } else if (order.status === 'out_for_delivery') {
            statusBadge.className += ' bg-info text-white';
            statusBadge.textContent = 'En Camino';
        }

        // Botones de acción según el estado
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex flex-col gap-2 mt-3';

        if (order.status === 'pending' || order.status === 'ready_for_delivery') {
            // Botón para aceptar y cambiar a "en camino"
            const acceptBtn = document.createElement('button');
            acceptBtn.className = 'btn btn-primary w-full transition-transform duration-200 hover:scale-105';
            acceptBtn.textContent = order.status === 'pending' ? 'Aceptar Pedido' : 'Iniciar Entrega';
            acceptBtn.dataset.orderId = order.id_pedido || order.id.replace('ORD-', '');
            acceptBtn.dataset.action = 'accept';
            acceptBtn.addEventListener('click', handleOrderAction);
            buttonContainer.appendChild(acceptBtn);
        }

        if (order.status === 'out_for_delivery') {
            // Botón para ver ruta
            const routeBtn = document.createElement('button');
            routeBtn.className = 'btn btn-info w-full transition-transform duration-200 hover:scale-105';
            routeBtn.textContent = 'Ver Ruta';
            routeBtn.dataset.orderId = order.id;
            routeBtn.addEventListener('click', handleAcceptOrder);
            buttonContainer.appendChild(routeBtn);

            // Botón para marcar como entregado
            const deliverBtn = document.createElement('button');
            deliverBtn.className = 'btn btn-success w-full transition-transform duration-200 hover:scale-105';
            deliverBtn.textContent = 'Marcar como Entregado';
            deliverBtn.dataset.orderId = order.id_pedido || order.id.replace('ORD-', '');
            deliverBtn.dataset.action = 'deliver';
            deliverBtn.addEventListener('click', handleOrderAction);
            buttonContainer.appendChild(deliverBtn);
        }

        listItem.appendChild(title);
        listItem.appendChild(addressContainer);
        listItem.appendChild(amount);
        listItem.appendChild(payment);
        listItem.appendChild(statusBadge);
        listItem.appendChild(buttonContainer);
        orderList.appendChild(listItem);
    });
}

// =================================================================
// EVENT HANDLERS & ROUTING
// =================================================================

// Función para manejar acciones de pedidos (aceptar, entregar)
async function handleOrderAction(event) {
    const orderId = event.target.dataset.orderId;
    const action = event.target.dataset.action;
    const order = allOrders.find(o => (o.id_pedido == orderId) || (o.id === `ORD-${String(orderId).padStart(3, '0')}`));

    if (!order) {
        console.error("Order not found!");
        notifyDelivery('Error: Pedido no encontrado.', 'error');
        return;
    }

    if (action === 'accept') {
        // Cambiar estado a "en camino"
        await updateOrderStatus(orderId, 'out_for_delivery');
    } else if (action === 'deliver') {
        // Mostrar modal de confirmación para entregar
        showDeliveryConfirmationModal(order, orderId);
    }
}

// Función para actualizar el estado del pedido
async function updateOrderStatus(orderId, newStatus) {
    try {
        // Verificar si el pedido ya está completado antes de intentar actualizarlo
        const order = allOrders.find(o => (o.id_pedido == orderId) || (o.id === `ORD-${String(orderId).padStart(3, '0')}`));
        if (order && order.status === 'completed') {
            notifyDelivery('Este pedido ya ha sido entregado y no puede ser modificado.', 'warning');
            return;
        }
        
        const response = await apiFetch('../../api/orders.php', {
            method: 'PUT',
            body: JSON.stringify({
                id_pedido: parseInt(orderId),
                estado: newStatus
            })
        });

        const result = await handleResponse(response);

        if (result.success) {
            // Recargar datos
            await loadDataFromAPI();
            
            // Si el estado es "en camino", mostrar la ruta
            if (newStatus === 'out_for_delivery') {
                const order = allOrders.find(o => (o.id_pedido == orderId) || (o.id === `ORD-${String(orderId).padStart(3, '0')}`));
                if (order) {
                    showRouteOnMap(order);
                }
            }
        } else {
            notifyDelivery('Error: ' + (result.message || 'No se pudo actualizar el pedido'), 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        notifyDelivery('Error al actualizar el pedido: ' + error.message, 'error');
    }
}

// Función para mostrar ruta en el mapa
function showRouteOnMap(order) {
    if (!order.branch || !order.branch.coordinates) {
        notifyDelivery('Error: No se encontraron las coordenadas de la sucursal para este pedido.', 'error');
        return;
    }

    const startPoint = order.branch.coordinates;
    const endPoint = order.coordinates;

    // Clear previous markers and routes
    clearMap();

    // Add marker for the branch (start)
    const startMarker = L.marker([startPoint.lat, startPoint.lng], {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
        })
    }).addTo(map);
    startMarker.bindPopup(`<b>📍 Salida:</b> ${order.branch.name}<br><small>${order.branch.name}</small>`);

    // Add marker for the customer (end) con mejor información
    const endMarker = L.marker([endPoint.lat, endPoint.lng], {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
        })
    }).addTo(map);
    endMarker.bindPopup(`
        <b>🏠 Entrega:</b> ${order.customerName}<br>
        <b>Dirección:</b> ${order.address || 'No especificada'}<br>
        <b>Pedido:</b> ${order.id}<br>
        <b>Monto:</b> Bs. ${order.price.toFixed(2)}<br>
        <b>Pago:</b> ${order.paymentType || 'No especificado'}
    `);

    // Get and display the route
    getRoute(startPoint, endPoint);
}

function handleAcceptOrder(event) {
    const orderId = event.target.dataset.orderId;
    const order = allOrders.find(o => o.id === orderId);

    if (!order) {
        console.error("Order not found!");
        return;
    }

    showRouteOnMap(order);
}

function clearMap() {
    if (currentRouteLayer) {
        map.removeLayer(currentRouteLayer);
    }
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker && !Object.values(sucursales).some(s => s.lat === layer.getLatLng().lat && s.lng === layer.getLatLng().lng)) {
            map.removeLayer(layer);
        }
    });
}

async function getRoute(start, end) {
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsApiKey}&start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('ORS API Error:', errorData);
            notifyDelivery(`Error al obtener la ruta: ${errorData.error.message}`, 'error');
            return;
        }
        const data = await response.json();
        const route = data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        currentRouteLayer = L.polyline(route, { color: '#D92B2B', weight: 5, opacity: 0.8 }); // Use brand-red color
        currentRouteLayer.addTo(map);
        const bounds = L.latLngBounds(route);
        map.fitBounds(bounds, { padding: [50, 50] });
    } catch (error) {
        console.error('Error fetching route from OpenRouteService:', error);
        notifyDelivery('No se pudo contactar al servicio de rutas.', 'error');
    }
}

// =================================================================
// DELIVERY CONFIRMATION MODAL
// =================================================================

let currentDeliveryOrder = null;
let currentDeliveryOrderId = null;

function showDeliveryConfirmationModal(order, orderId) {
    currentDeliveryOrder = order;
    currentDeliveryOrderId = orderId;
    
    const modal = new bootstrap.Modal(document.getElementById('deliveryConfirmModal'));
    const orderInfo = document.getElementById('deliveryOrderInfo');
    
    orderInfo.innerHTML = `
        <strong>Pedido:</strong> ${order.id}<br>
        <strong>Cliente:</strong> ${order.customerName}<br>
        <strong>Dirección:</strong> ${order.address || 'No especificada'}<br>
        <strong>Monto:</strong> Bs. ${order.price.toFixed(2)}<br>
        <strong>Método de Pago:</strong> ${order.paymentType || 'No especificado'}
    `;
    
    // Reset form
    document.getElementById('deliveryNotes').value = '';
    document.getElementById('confirmDelivery').checked = false;
    
    modal.show();
}

// =================================================================
// INITIAL LOAD
// =================================================================

// Event listener para el botón de confirmar entrega
document.addEventListener('DOMContentLoaded', async () => {
    const logoutBtn = document.getElementById('logoutButton');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const confirmed = window.confirm('¿Deseas cerrar sesión?');
            if (!confirmed) return;
            await logoutDeliveryUser();
        });
    }

    // Verificar sesión antes de cargar datos
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) {
        return; // checkSession ya redirige al login
    }
    
    // Cargar datos si la sesión es válida
    await loadDataFromAPI();
    
    const confirmBtn = document.getElementById('confirmDeliveryBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const checkbox = document.getElementById('confirmDelivery');
            if (!checkbox.checked) {
                notifyDelivery('Por favor, confirma que el pedido ha sido entregado.', 'warning');
                return;
            }
            
            if (!currentDeliveryOrderId) {
                notifyDelivery('Error: No se pudo identificar el pedido.', 'error');
                return;
            }
            
            // Deshabilitar botón mientras se procesa
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Procesando...';
            
            try {
                await updateOrderStatus(currentDeliveryOrderId, 'completed');
                
                // Cerrar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('deliveryConfirmModal'));
                if (modal) {
                    modal.hide();
                }
                
                // Limpiar mapa
                clearMap();
                
                notifyDelivery('¡Pedido marcado como entregado exitosamente!', 'success');
            } catch (error) {
                console.error('Error confirming delivery:', error);
                notifyDelivery('Error al confirmar la entrega: ' + error.message, 'error');
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="bi bi-check-circle"></i> Confirmar Entrega';
            }
        });
    }
});