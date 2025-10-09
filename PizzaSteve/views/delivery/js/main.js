// =================================================================
// CONFIGURATION & INITIALIZATION
// =================================================================
const orsApiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijg5ODZiMzE3ZGJjZjQzNmZhOTUzMGQxMmVlMzJlMDNlIiwiaCI6Im11cm11cjY0In0=';
let currentRouteLayer = null;
let allOrders = [];

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
// DATA FETCHING
// =================================================================
async function loadDataFromAPI() {
    try {
        const response = await fetch('../../api/orders.php');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allOrders = await response.json();
        renderDashboard();
        renderPendingOrders();
    } catch (error) {
        console.error("Error fetching data from API:", error);
        const orderList = document.getElementById('pending-orders-list');
        orderList.innerHTML = `<li class="text-red-400">Error al cargar los datos. Asegúrate de que el backend esté funcionando.</li>`;
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
        } else if (order.status === 'pending') {
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

    const pendingOrders = allOrders.filter(order => order.status === 'pending');

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
        title.className = 'font-bold text-lg text-brand-red';
        title.textContent = `${order.id} - ${order.customerName}`;

        const address = document.createElement('p');
        address.className = 'text-sm text-gray-600 dark:text-gray-300 my-1';
        address.textContent = order.address;

        const amount = document.createElement('p');
        amount.className = 'text-sm text-gray-600 dark:text-gray-300 my-1';
        amount.innerHTML = `<strong>Monto:</strong> Bs. ${order.price.toFixed(2)}`;

        const payment = document.createElement('p');
        payment.className = 'text-sm text-gray-600 dark:text-gray-300 my-1';
        payment.innerHTML = `<strong>Pago:</strong> ${order.paymentType}`;

        const button = document.createElement('button');
        button.className = 'btn btn-success w-full mt-4 transition-transform duration-200 hover:scale-105';
        button.textContent = 'Aceptar Pedido';
        button.dataset.orderId = order.id;

        listItem.appendChild(title);
        listItem.appendChild(address);
        listItem.appendChild(amount);
        listItem.appendChild(payment);
        listItem.appendChild(button);
        orderList.appendChild(listItem);
    });

    document.querySelectorAll('.accept-btn').forEach(button => {
        button.addEventListener('click', handleAcceptOrder);
    });
}

// =================================================================
// EVENT HANDLERS & ROUTING
// =================================================================

function handleAcceptOrder(event) {
    const orderId = event.target.dataset.orderId;
    const order = allOrders.find(o => o.id === orderId);

    if (!order) {
        console.error("Order not found!");
        return;
    }

    if (!order.branch || !order.branch.coordinates) {
        alert("Error: No se encontraron las coordenadas de la sucursal para este pedido.");
        return;
    }

    const startPoint = order.branch.coordinates;
    const endPoint = order.coordinates;

    // Clear previous markers and routes
    clearMap();

    // Add marker for the branch (start)
    L.marker([startPoint.lat, startPoint.lng])
        .addTo(map)
        .bindPopup(`<b>Salida:</b> ${order.branch.name}`);

    // Add marker for the customer (end)
    L.marker([endPoint.lat, endPoint.lng])
        .addTo(map)
        .bindPopup(`<b>Entrega:</b> ${order.customerName}`);

    // Get and display the route
    getRoute(startPoint, endPoint);
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
            alert(`Error al obtener la ruta: ${errorData.error.message}`);
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
        alert("No se pudo contactar al servicio de rutas.");
    }
}

// =================================================================
// INITIAL LOAD
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadDataFromAPI();
});