    // Variable para el intervalo de verificación de sesión
    let sessionCheckInterval = null;
    let salesChart = null;
    let topProductsChart = null;
    let allUsersData = [];
    let userStatusFilter = 'active';

    function escapeText(value) {
        if (value === null || value === undefined) return '';
        if (typeof escapeHtml === 'function') {
            return escapeHtml(value);
        }
        const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
        return String(value).replace(/[&<>"']/g, m => map[m]);
    }

    function notifyAdmin(message, type = 'info', title = 'Panel de administrador') {
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
    
    // =================================================================
    // PAGINATION SYSTEM
    // =================================================================
    const paginationState = {}; // Almacenar estado de paginación por tabla
    
    /**
     * Inicializa o actualiza la paginación para una tabla
     * @param {string} tableId - ID del tbody de la tabla
     * @param {Array} data - Array completo de datos
     * @param {Function} renderFunction - Función que renderiza una fila (recibe item, index)
     * @param {number} itemsPerPage - Items por página (default: 6)
     */
    function initPagination(tableId, data, renderFunction, itemsPerPage = 6) {
        if (!data || !Array.isArray(data)) {
            data = [];
        }
        
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        // Inicializar estado si no existe
        if (!paginationState[tableId]) {
            paginationState[tableId] = {
                currentPage: 1,
                itemsPerPage: itemsPerPage,
                data: data,
                renderFunction: renderFunction
            };
        } else {
            // Actualizar datos y resetear página si los datos cambiaron
            paginationState[tableId].data = data;
            paginationState[tableId].renderFunction = renderFunction;
            paginationState[tableId].itemsPerPage = itemsPerPage;
        }
        
        renderTablePage(tableId);
        renderPaginationControls(tableId, totalPages);
    }
    
    /**
     * Renderiza la página actual de la tabla
     */
    function renderTablePage(tableId) {
        const state = paginationState[tableId];
        if (!state) return;
        
        const tableBody = document.getElementById(tableId);
        if (!tableBody) return;
        
        const { currentPage, itemsPerPage, data, renderFunction } = state;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = data.slice(startIndex, endIndex);
        
        tableBody.innerHTML = '';
        
        if (pageData.length === 0) {
            const colCount = tableBody.closest('table')?.querySelectorAll('thead th').length || 1;
            tableBody.innerHTML = `<tr><td colspan="${colCount}" class="text-center">No hay datos para mostrar</td></tr>`;
            return;
        }
        
        pageData.forEach((item, index) => {
            const row = renderFunction(item, startIndex + index);
            if (row) {
                tableBody.appendChild(row);
            }
        });
    }
    
    /**
     * Renderiza los controles de paginación
     */
    function renderPaginationControls(tableId, totalPages) {
        const state = paginationState[tableId];
        if (!state) return;
        
        const { currentPage } = state;
        const paginationId = `${tableId}Pagination`;
        
        // Buscar o crear contenedor de paginación
        let paginationContainer = document.getElementById(paginationId);
        const tableBody = document.getElementById(tableId);
        
        if (!tableBody) return;
        
        // Si no existe, crear después de la tabla
        if (!paginationContainer) {
            const table = tableBody.closest('table');
            if (table) {
                paginationContainer = document.createElement('div');
                paginationContainer.id = paginationId;
                paginationContainer.className = 'd-flex justify-content-center mt-3';
                table.parentNode.insertBefore(paginationContainer, table.nextSibling);
            } else {
                return;
            }
        }
        
        // Si solo hay una página o menos, ocultar paginación
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        // Generar HTML de paginación Bootstrap
        let paginationHTML = '<nav aria-label="Navegación de páginas"><ul class="pagination pagination-sm mb-0">';
        
        // Botón Anterior
        paginationHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Anterior">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>`;
        
        // Números de página
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        if (startPage > 1) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }
        
        // Botón Siguiente
        paginationHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Siguiente">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>`;
        
        paginationHTML += '</ul></nav>';
        paginationContainer.innerHTML = paginationHTML;
        
        // Agregar event listeners
        paginationContainer.querySelectorAll('.page-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.dataset.page);
                if (page >= 1 && page <= totalPages && page !== currentPage) {
                    state.currentPage = page;
                    renderTablePage(tableId);
                    renderPaginationControls(tableId, totalPages);
                    // Scroll suave hacia la tabla
                    tableBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }
    
    // Verificar sesión en el servidor
    async function checkSession() {
        try {
            const response = await apiFetch('../../api/session_check.php', {
                method: 'GET'
            });
            
            const data = await response.json();
            
            if (data.success && data.authenticated) {
                return true;
            } else {
                // Sesión inválida o usuario desactivado
                return false;
            }
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            return false;
        }
    }
    
    // Iniciar monitoreo periódico de sesión
    function startSessionMonitoring() {
        // Verificar cada 30 segundos
        sessionCheckInterval = setInterval(async () => {
            const isValid = await checkSession();
            if (!isValid) {
                // Detener el intervalo
                if (sessionCheckInterval) {
                    clearInterval(sessionCheckInterval);
                }
                
                // Mostrar mensaje y redirigir
                notifyAdmin('Su sesión ha expirado o su cuenta ha sido desactivada. Será redirigido al login.', 'warning');
                window.location.href = '../../Index.html';
            }
        }, 30000); // 30 segundos
        
        // También verificar cuando la ventana vuelve a tener foco
        window.addEventListener('focus', async () => {
            const isValid = await checkSession();
            if (!isValid) {
                if (sessionCheckInterval) {
                    clearInterval(sessionCheckInterval);
                }
                notifyAdmin('Su sesión ha expirado o su cuenta ha sido desactivada. Será redirigido al login.', 'warning');
                window.location.href = '../../Index.html';
            }
        });
    }
    
    // Detener monitoreo de sesión (al hacer logout, etc.)
    function stopSessionMonitoring() {
        if (sessionCheckInterval) {
            clearInterval(sessionCheckInterval);
            sessionCheckInterval = null;
        }
    }
    
    // Función para cerrar sesión
    window.logout = async function() {
        if (!confirm('¿Está seguro de que desea cerrar sesión?')) return;
        
        stopSessionMonitoring();
        
        try {
            // Llamar al endpoint de logout si existe, o simplemente redirigir
            await apiFetch('../../api/logout.php', { 
                method: 'POST'
            });
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
        
        // Limpiar localStorage si existe
        localStorage.removeItem('usuario');
        
        // Redirigir al login
        window.location.href = '../../Index.html';
    };

document.addEventListener('DOMContentLoaded', function() {
        const userFilterGroup = document.getElementById('userStatusFilters');
        if (userFilterGroup) {
            userFilterGroup.addEventListener('click', (event) => {
                const button = event.target.closest('button[data-filter]');
                if (!button) return;
                const newFilter = button.dataset.filter;
                if (!newFilter || newFilter === userStatusFilter) return;
                userStatusFilter = newFilter;
                renderUsersTable();
            });
        }

        // Verificar sesión antes de cargar cualquier cosa
        checkSession().then(isValid => {
            if (!isValid) {
                // Sesión inválida, redirigir al login
                notifyAdmin('Su sesión ha expirado o su cuenta ha sido desactivada. Será redirigido al login.', 'warning');
                window.location.href = '../../Index.html';
                return;
            }
            
            // Inicializar verificación periódica de sesión (cada 30 segundos)
            startSessionMonitoring();
            
            initializeAdminPanel();
        }).catch(error => {
            console.error('Error verificando sesión:', error);
            notifyAdmin('Error al verificar la sesión. Será redirigido al login.', 'error');
            window.location.href = '../../Index.html';
        });
    });
    
    function initializeAdminPanel() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    const sections = document.querySelectorAll('.content section');
    const sectionTitle = document.getElementById('section-title');

    // --- Sidebar Toggle --- //
        if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
        }

    // --- Navigation Logic --- //
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if(this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
            } else {
                return;
            }

            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (!targetSection) return;

            sections.forEach(section => {
                if (section.id !== targetId) {
                    section.classList.add('d-none');
                    section.classList.remove('fade-in');
                }
            });

            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            const linkText = this.querySelector('.sidebar-text').textContent;
                if (sectionTitle) sectionTitle.textContent = linkText;
            
            targetSection.classList.remove('d-none');
            targetSection.classList.add('fade-in');

            switch (targetId) {
                    case 'dashboard': loadDashboard(); break;
                case 'products': loadProducts(); break;
                    case 'stock': loadStock(); break;
                case 'orders': loadOrders(); break;
                    case 'users': loadUsers(); break;
                    case 'branches': loadBranches(); break;
                    case 'delivery': loadDelivery(); break;
                    case 'promotions': loadPromotions(); break;
            }
        });
    });

        // Load initial section
        const hash = window.location.hash.substring(1) || 'dashboard';
        const hashSection = document.getElementById(hash);
        if (hashSection) {
            sections.forEach(section => {
                if (section.id !== hash) {
                    section.classList.add('d-none');
                } else {
                    section.classList.remove('d-none');
                }
            });
            
            navLinks.forEach(link => {
                if (link.getAttribute('href') === `#${hash}`) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
            
            if (sectionTitle) {
                const activeLink = document.querySelector(`.nav-link[href="#${hash}"]`);
                if (activeLink) {
                    sectionTitle.textContent = activeLink.querySelector('.sidebar-text').textContent;
                }
            }
            
            // Load data for initial section
            switch(hash) {
                case 'dashboard': loadDashboard(); break;
                case 'products': loadProducts(); break;
                case 'stock': loadStock(); break;
                case 'users': loadUsers(); break;
                case 'orders': loadOrders(); break;
                case 'branches': loadBranches(); break;
                case 'delivery': loadDelivery(); break;
                case 'promotions': loadPromotions(); break;
            }
        }
    }

    // --- API and Data Handling --- //
    async function handleResponse(response) {
        // Si la respuesta es un error 401 o 403, verificar si es por sesión inválida
        if (response.status === 401 || response.status === 403) {
            try {
                const data = await response.clone().json();
                if (data.redirect === true) {
                    // Sesión inválida, redirigir al login
                    stopSessionMonitoring();
                    notifyAdmin(data.message || 'Su sesión ha expirado. Será redirigido al login.', 'warning');
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

    function showMessage(message, type = 'success') {
        // Crear notificación toast mejorada
        const toastContainer = document.getElementById('toastContainer') || createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white ${type === 'success' ? 'bg-success' : 'bg-danger'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remover toast del DOM después de que se oculte
        toast.addEventListener('hidden.bs.toast', function() {
            toast.remove();
        });
    }
    
    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
        return container;
    }

    // --- Dashboard Section --- //
    async function loadDashboard() {
        try {
            const response = await apiFetch('../../api/stats.php');
            const result = await handleResponse(response);
            
            if (result.success && result.data) {
                const stats = result.data;
                
                // Update stats cards con validación
                const salesToday = parseFloat(stats.sales_today || 0);
                const pendingOrders = parseInt(stats.pending_orders || 0);
                const totalRevenue = parseFloat(stats.total_revenue || 0);
                const activeUsers = parseInt(stats.active_users || 0);
                
                document.getElementById('stat-sales-today').textContent = `Bs. ${salesToday.toFixed(2)}`;
                document.getElementById('stat-pending-orders').textContent = pendingOrders;
                document.getElementById('stat-total-revenue').textContent = `Bs. ${totalRevenue.toFixed(2)}`;
                document.getElementById('stat-active-users').textContent = activeUsers;
                
                // Load sales chart
                loadSalesChart(stats.sales_by_day || []);
                
                // Load top products chart
                loadTopProductsChart(stats.top_products || []);
            } else {
                console.error('Error loading dashboard:', result.message || 'Error desconocido');
                showMessage('Error al cargar las estadísticas del dashboard', 'error');
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showMessage('Error al cargar el dashboard. Verifique la conexión con el servidor.', 'error');
        }
    }

    function loadSalesChart(salesData) {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;
        
        if (salesChart) salesChart.destroy();
        
        // Validar y procesar datos
        if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
            // Si no hay datos, mostrar gráfico vacío con etiquetas de días de la semana
            const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                    labels: daysOfWeek,
                datasets: [{
                        label: 'Ventas',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        backgroundColor: 'rgba(217, 43, 43, 0.1)',
                        borderColor: '#D92B2B',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return 'Bs. ' + value.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });
            return;
        }
        
        const labels = salesData.map(item => {
            try {
                const date = new Date(item.date);
                if (isNaN(date.getTime())) {
                    return item.date; // Si la fecha es inválida, mostrar el valor original
                }
                return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
            } catch (e) {
                return item.date || 'Fecha inválida';
            }
        });
        const data = salesData.map(item => {
            const total = parseFloat(item.total || 0);
            return isNaN(total) ? 0 : total;
        });
        
        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas',
                    data: data,
                    backgroundColor: 'rgba(217, 43, 43, 0.1)',
                    borderColor: '#D92B2B',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Bs. ' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    function loadTopProductsChart(products) {
        const ctx = document.getElementById('topProductsChart');
        if (!ctx) return;
        
        if (topProductsChart) topProductsChart.destroy();
        
        if (!products || !Array.isArray(products) || products.length === 0) {
            // Mostrar mensaje si no hay datos
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">No hay datos de productos vendidos</p>';
            return;
        }
        
        const labels = products.map(item => item.nombre || 'Producto sin nombre');
        const data = products.map(item => parseInt(item.cantidad || 0));
        
        topProductsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(217, 43, 43, 0.8)',
                        'rgba(242, 169, 0, 0.8)',
                        'rgba(45, 42, 38, 0.8)',
                        'rgba(108, 117, 125, 0.8)',
                        'rgba(40, 167, 69, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // --- Products Section --- //
    async function loadProducts() {
        try {
            await loadBranchesForSelect('productBranch');
            await loadBranchesForSelect('editProductBranch');
            
            const response = await apiFetch('../../api/products.php');
            const data = await handleResponse(response);
            const tableBody = document.getElementById('productsTableBody');
            tableBody.innerHTML = '';
            
            if (!data || !Array.isArray(data) || data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No hay productos registrados</td></tr>';
                return;
            }
            
            data.forEach(item => {
                if (!item.id_producto) return; // Saltar items inválidos
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id_producto}</td>
                    <td>${item.nombre || '-'}</td>
                    <td>${item.descripcion || '-'}</td>
                    <td>${item.categoria || 'Pizza'}</td>
                    <td>Bs. ${parseFloat(item.precio || 0).toFixed(2)}</td>
                    <td>${item.stock_disponible || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-product" data-id="${item.id_producto}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-product" data-id="${item.id_producto}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            document.querySelectorAll('.edit-product').forEach(btn => {
                btn.addEventListener('click', () => editProduct(btn.dataset.id));
            });
            
            document.querySelectorAll('.delete-product').forEach(btn => {
                btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
            });
        } catch (error) {
            console.error('Error loading products:', error);
            const tableBody = document.getElementById('productsTableBody');
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error al cargar productos: ${error.message}</td></tr>`;
            }
            showMessage('Error al cargar los productos: ' + error.message, 'error');
        }
    }

    document.getElementById('addProductForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            const nameInput = document.getElementById('productName');
            const priceInput = document.getElementById('productPrice');
            const stockInput = document.getElementById('productStock');
            
            // Validar nombre del producto (sin números)
            if (!nameInput.value.trim()) {
                if (typeof showFieldError === 'function') {
                    showFieldError(nameInput, 'El nombre del producto es requerido');
                } else {
                    showMessage('El nombre del producto es requerido', 'error');
                }
                return;
            }
            
            // Validar que el nombre no contenga números
            if (typeof validateProductNameField === 'function') {
                if (!validateProductNameField(nameInput)) {
                    return;
                }
            } else if (typeof isValidProductName === 'function') {
                if (!isValidProductName(nameInput.value)) {
                    if (typeof showFieldError === 'function') {
                        showFieldError(nameInput, 'El nombre solo puede contener letras, espacios y acentos. No se permiten números.');
                    } else {
                        showMessage('El nombre del producto solo puede contener letras, espacios y acentos. No se permiten números.', 'error');
                    }
                    return;
                }
            } else {
                // Validación básica si las funciones no están disponibles
                const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
                if (!nameRegex.test(nameInput.value.trim()) || nameInput.value.trim().length < 2) {
                    if (typeof showFieldError === 'function') {
                        showFieldError(nameInput, 'El nombre solo puede contener letras, espacios y acentos. Mínimo 2 caracteres.');
                    } else {
                        showMessage('El nombre del producto solo puede contener letras, espacios y acentos. Mínimo 2 caracteres.', 'error');
                    }
                    return;
                }
            }
            
            if (typeof validatePriceField === 'function' && !validatePriceField(priceInput)) return;
            if (typeof validateStockField === 'function' && !validateStockField(stockInput)) return;
            
            const price = parseFloat(priceInput.value);
            const stock = parseInt(stockInput.value) || 0;
            
            if (price <= 0) {
                if (typeof showFieldError === 'function') {
                    showFieldError(priceInput, 'El precio debe ser mayor a 0');
                } else {
                    showMessage('El precio debe ser mayor a 0', 'error');
                }
                return;
            }
            
            if (stock < 0) {
                if (typeof showFieldError === 'function') {
                    showFieldError(stockInput, 'El stock no puede ser negativo');
                } else {
                    showMessage('El stock no puede ser negativo', 'error');
                }
                return;
            }
            
            const formData = {
                name: nameInput.value.trim(),
                description: document.getElementById('productDescription').value.trim(),
                price: price,
                categoria: document.getElementById('productCategory').value,
                stock_disponible: stock,
                sucursal_id: document.getElementById('productBranch').value || null
            };
            
            const response = await apiFetch('../../api/products.php', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            
            if (data.success) {
                loadProducts();
                this.reset();
                const tab = new bootstrap.Tab(document.querySelector('a[href="#view-products"]'));
                tab.show();
            }
        } catch (error) {
            console.error('Error adding product:', error);
            showMessage('Error al agregar el producto: ' + error.message, 'error');
        }
    });

    async function editProduct(id) {
        try {
            const response = await apiFetch(`../../api/products.php?id=${id}`);
            const product = await handleResponse(response);
            
            document.getElementById('editProductId').value = product.id_producto;
            document.getElementById('editProductName').value = product.nombre;
            document.getElementById('editProductDescription').value = product.descripcion || '';
            document.getElementById('editProductCategory').value = product.categoria || 'Pizza';
            document.getElementById('editProductPrice').value = product.precio;
            document.getElementById('editProductStock').value = product.stock_disponible || 0;
            document.getElementById('editProductBranch').value = product.sucursal_id || '';
            
            const modal = new bootstrap.Modal(document.getElementById('editProductModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading product:', error);
            showMessage('Error al cargar el producto', 'error');
        }
    }

    document.getElementById('editProductForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            const nameInput = document.getElementById('editProductName');
            
            // Validar nombre del producto (sin números)
            if (!nameInput.value.trim()) {
                if (typeof showFieldError === 'function') {
                    showFieldError(nameInput, 'El nombre del producto es requerido');
                } else {
                    showMessage('El nombre del producto es requerido', 'error');
                }
                return;
            }
            
            // Validar que el nombre no contenga números
            if (typeof validateProductNameField === 'function') {
                if (!validateProductNameField(nameInput)) {
                    return;
                }
            } else if (typeof isValidProductName === 'function') {
                if (!isValidProductName(nameInput.value)) {
                    if (typeof showFieldError === 'function') {
                        showFieldError(nameInput, 'El nombre solo puede contener letras, espacios y acentos. No se permiten números.');
                    } else {
                        showMessage('El nombre del producto solo puede contener letras, espacios y acentos. No se permiten números.', 'error');
                    }
                    return;
                }
            } else {
                // Validación básica si las funciones no están disponibles
                const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
                if (!nameRegex.test(nameInput.value.trim()) || nameInput.value.trim().length < 2) {
                    if (typeof showFieldError === 'function') {
                        showFieldError(nameInput, 'El nombre solo puede contener letras, espacios y acentos. Mínimo 2 caracteres.');
                    } else {
                        showMessage('El nombre del producto solo puede contener letras, espacios y acentos. Mínimo 2 caracteres.', 'error');
                    }
                    return;
                }
            }
            
            const formData = {
                id: document.getElementById('editProductId').value,
                name: nameInput.value.trim(),
                description: document.getElementById('editProductDescription').value.trim(),
                price: parseFloat(document.getElementById('editProductPrice').value),
                categoria: document.getElementById('editProductCategory').value,
                stock_disponible: parseInt(document.getElementById('editProductStock').value) || 0,
                sucursal_id: document.getElementById('editProductBranch').value || null
            };
            
            const response = await apiFetch('../../api/products.php', {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            
            if (data.success) {
                loadProducts();
                const modal = bootstrap.Modal.getInstance(document.getElementById('editProductModal'));
                modal.hide();
            }
        } catch (error) {
            console.error('Error updating product:', error);
            showMessage('Error al actualizar el producto', 'error');
        }
    });

    async function deleteProduct(id) {
        if (!confirm('¿Estás seguro de que quieres desactivar este producto?')) return;
        
        try {
            const response = await apiFetch(`../../api/products.php?id=${id}`, { method: 'DELETE' });
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
                if (data.success) loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            showMessage('Error al eliminar el producto', 'error');
        }
    }

    // --- Stock Section --- //
    async function loadStock() {
        try {
            const response = await apiFetch('../../api/products.php');
            const data = await handleResponse(response);
            const tableBody = document.getElementById('stockTableBody');
            tableBody.innerHTML = '';
            
            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No hay productos</td></tr>';
                return;
            }
            
            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.nombre}</td>
                    <td><strong>${item.stock_disponible || 0}</strong></td>
                    <td>
                        <input type="number" class="form-control form-control-sm stock-quantity" 
                               data-id="${item.id_producto}" value="0" min="0" style="width: 100px;">
                    </td>
                    <td>
                        <button class="btn btn-sm btn-success update-stock" data-id="${item.id_producto}">
                            <i class="bi bi-plus-circle"></i> Agregar
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            document.querySelectorAll('.update-stock').forEach(btn => {
                btn.addEventListener('click', () => {
                    const productId = btn.dataset.id;
                    const input = document.querySelector(`.stock-quantity[data-id="${productId}"]`);
                    const quantity = parseInt(input.value);
                    if (quantity > 0) {
                        updateStock(productId, quantity);
                    } else {
                        showMessage('Ingrese una cantidad mayor a 0', 'error');
                    }
                });
            });
            
            // Search functionality
            document.getElementById('stockSearch')?.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                const rows = tableBody.querySelectorAll('tr');
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            });
        } catch (error) {
            console.error('Error loading stock:', error);
        }
    }

    async function updateStock(productId, quantity) {
        try {
            if (quantity <= 0) {
                showMessage('La cantidad debe ser mayor a 0', 'error');
                return;
            }
            
            const response = await apiFetch('../../api/stock.php', {
                method: 'PUT',
                body: JSON.stringify({
                    id_producto: parseInt(productId),
                    cantidad: parseInt(quantity),
                    operacion: 'agregar'
                })
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            if (data.success) {
                loadStock();
                loadProducts(); // Refresh products table too
                // Limpiar el input
                document.querySelector(`.stock-quantity[data-id="${productId}"]`).value = 0;
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            showMessage('Error al actualizar el stock: ' + error.message, 'error');
        }
    }

    // --- Orders Section --- //
    async function loadOrders() {
        try {
            await loadDeliveryForSelect();
            
            const response = await apiFetch('../../api/orders.php');
            const data = await handleResponse(response);
            
            if (!data || !Array.isArray(data)) {
                const tableBody = document.getElementById('ordersTableBody');
                if (tableBody) {
                    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No hay pedidos</td></tr>';
                }
                return;
            }
            
            // Función para renderizar una fila
            const renderRow = (item) => {
                const statusBadge = getStatusBadge(item.status);
                const paymentBadge = item.pago_confirmado 
                    ? '<span class="badge bg-success">Confirmado</span>' 
                    : '<span class="badge bg-warning">Pendiente</span>';
                
                const row = document.createElement('tr');
                row.setAttribute('data-status', item.status);
                row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.customerName}</td>
                    <td>${item.fecha_pedido || '-'}</td>
                    <td>Bs. ${parseFloat(item.price).toFixed(2)}</td>
                    <td>${statusBadge}</td>
                    <td>${paymentBadge}</td>
                    <td>${item.repartidorNombre || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary view-order" data-id="${item.id}" title="Ver Detalles">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${item.status === 'completed' ? '' : `
                        <button class="btn btn-sm btn-success change-status" data-id="${item.id_pedido}" data-status="${item.status}" title="Cambiar Estado">
                            <i class="bi bi-arrow-repeat"></i>
                        </button>
                        `}
                    </td>
                `;
                
                // Agregar event listeners
                row.querySelector('.view-order')?.addEventListener('click', () => viewOrderDetails(item.id));
                row.querySelector('.change-status')?.addEventListener('click', () => {
                    const orderId = 'ORD-' + String(item.id_pedido).padStart(3, '0');
                    viewOrderDetails(orderId);
                });
                
                return row;
            };
            
            // Inicializar paginación
            initPagination('ordersTableBody', data, renderRow, 6);
            
            // Filter functionality - aplicar filtro a los datos antes de paginar
            const filterElement = document.getElementById('orderStatusFilter');
            if (filterElement && !filterElement.hasAttribute('data-listener-added')) {
                filterElement.setAttribute('data-listener-added', 'true');
                filterElement.addEventListener('change', function(e) {
                    const filterValue = e.target.value;
                    const filteredData = filterValue ? data.filter(item => item.status === filterValue) : data;
                    initPagination('ordersTableBody', filteredData, renderRow, 6);
                });
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    // Estados válidos estandarizados
    const validOrderStates = ['pending', 'preparing', 'ready_for_delivery', 'out_for_delivery', 'completed', 'cancelled'];
    
    function getStatusBadge(status) {
        const statusMap = {
            'pending': '<span class="badge bg-warning">Pendiente</span>',
            'preparing': '<span class="badge bg-info">En Preparación</span>',
            'ready_for_delivery': '<span class="badge bg-primary">Listo para Entrega</span>',
            'out_for_delivery': '<span class="badge bg-secondary">En Camino</span>',
            'completed': '<span class="badge bg-success">Completado</span>',
            'cancelled': '<span class="badge bg-danger">Cancelado</span>'
        };
        return statusMap[status] || `<span class="badge bg-secondary">${status}</span>`;
    }
    
    function getStatusLabel(status) {
        const statusLabels = {
            'pending': 'Pendiente',
            'preparing': 'En Preparación',
            'ready_for_delivery': 'Listo para Entrega',
            'out_for_delivery': 'En Camino',
            'completed': 'Completado',
            'cancelled': 'Cancelado'
        };
        return statusLabels[status] || status;
    }

    async function viewOrderDetails(orderId) {
        try {
            const response = await apiFetch(`../../api/orders.php?id=${orderId}`);
            const order = await handleResponse(response);
            
            if (!order) {
                showMessage('Pedido no encontrado', 'error');
                return;
            }
            
            const modalContent = document.getElementById('orderDetailsContent');
            let productsHtml = '';
            if (order.products && Array.isArray(order.products) && order.products.length > 0) {
                productsHtml = '<table class="table table-sm"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio Unit.</th><th>Subtotal</th></tr></thead><tbody>';
                order.products.forEach(product => {
                    const cantidad = parseInt(product.cantidad_producto) || 0;
                    const precio = parseFloat(product.precio_u) || 0;
                    const subtotal = precio * cantidad;
                    productsHtml += `<tr><td>${product.nombre || 'Producto desconocido'}</td><td>${cantidad}</td><td>Bs. ${precio.toFixed(2)}</td><td>Bs. ${subtotal.toFixed(2)}</td></tr>`;
                });
                productsHtml += '</tbody></table>';
            } else {
                productsHtml = '<p class="text-muted">No hay productos registrados para este pedido.</p>';
            }
            
            // Separar comprobantes de pago y fotos de entrega
            const paymentReceipts = order.receipts ? order.receipts.filter(r => !r.tipo_comprobante || r.tipo_comprobante === 'pago') : [];
            const deliveryPhotos = order.receipts ? order.receipts.filter(r => r.tipo_comprobante === 'entrega') : [];
            
            // Generar HTML para comprobantes de pago
            let receiptsHtml = '';
            if (paymentReceipts.length > 0) {
                receiptsHtml = '<div class="row mt-3">';
                paymentReceipts.forEach((receipt, index) => {
                    const receiptUrl = `../../${receipt.ruta_archivo}`;
                    const isImage = receipt.tipo_archivo && receipt.tipo_archivo.startsWith('image/');
                    const fileSize = receipt.tamano_archivo ? (receipt.tamano_archivo / 1024).toFixed(2) + ' KB' : 'N/A';
                    const uploadDate = receipt.fecha_subida ? new Date(receipt.fecha_subida).toLocaleString('es-BO') : 'N/A';
                    
                    receiptsHtml += `
                        <div class="col-md-6 mb-3">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">Comprobante de Pago ${index + 1}</h6>
                                    <small class="text-muted">Subido: ${uploadDate}</small>
                                </div>
                                <div class="card-body text-center">
                                    ${isImage ? `
                                        <img src="${receiptUrl}" alt="Comprobante" class="img-fluid mb-2" style="max-height: 300px; cursor: pointer;" 
                                             onclick="window.open('${receiptUrl}', '_blank')">
                                    ` : `
                                        <div class="p-4">
                                            <i class="bi bi-file-earmark-pdf" style="font-size: 3rem; color: #dc3545;"></i>
                                            <p class="mt-2">Archivo PDF</p>
                                            <a href="${receiptUrl}" target="_blank" class="btn btn-sm btn-primary">
                                                <i class="bi bi-download"></i> Ver/Descargar
                                            </a>
                                        </div>
                                    `}
                                    <div class="mt-2">
                                        <small class="text-muted">Tamaño: ${fileSize}</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                receiptsHtml += '</div>';
            } else {
                receiptsHtml = '<p class="text-muted mt-3">No hay comprobantes de pago subidos para este pedido.</p>';
            }
            
            // Generar HTML para fotos de entrega
            let deliveryPhotosHtml = '';
            if (deliveryPhotos.length > 0) {
                deliveryPhotosHtml = '<div class="row mt-3">';
                deliveryPhotos.forEach((photo, index) => {
                    const photoUrl = `../../${photo.ruta_archivo}`;
                    const fileSize = photo.tamano_archivo ? (photo.tamano_archivo / 1024).toFixed(2) + ' KB' : 'N/A';
                    const uploadDate = photo.fecha_subida ? new Date(photo.fecha_subida).toLocaleString('es-BO') : 'N/A';
                    
                    deliveryPhotosHtml += `
                        <div class="col-md-6 mb-3">
                            <div class="card border-success">
                                <div class="card-header bg-success text-white">
                                    <h6 class="mb-0"><i class="bi bi-camera"></i> Foto de Entrega ${index + 1}</h6>
                                    <small>Subida: ${uploadDate}</small>
                                </div>
                                <div class="card-body text-center">
                                    <img src="${photoUrl}" alt="Foto de entrega" class="img-fluid mb-2" style="max-height: 300px; cursor: pointer;" 
                                         onclick="window.open('${photoUrl}', '_blank')">
                                    <div class="mt-2">
                                        <small class="text-muted">Tamaño: ${fileSize}</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                deliveryPhotosHtml += '</div>';
            } else {
                deliveryPhotosHtml = '<p class="text-muted mt-3">No hay fotos de entrega registradas para este pedido.</p>';
            }
            
            modalContent.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Información del Cliente</h6>
                        <p><strong>Nombre:</strong> ${order.customerName}</p>
                        <p><strong>Email:</strong> ${order.customerEmail || '-'}</p>
                        <p><strong>Teléfono:</strong> ${order.customerPhone || '-'}</p>
                        <p><strong>Dirección:</strong> ${order.address}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Información del Pedido</h6>
                        <p><strong>ID:</strong> ${order.id}</p>
                        <p><strong>Fecha:</strong> ${order.fecha_pedido}</p>
                        <p><strong>Estado:</strong> ${getStatusBadge(order.status)}</p>
                        <p><strong>Método de Pago:</strong> ${order.paymentType}</p>
                        <p><strong>Pago Confirmado:</strong> ${order.pago_confirmado ? 'Sí' : 'No'}</p>
                        <p><strong>Repartidor:</strong> ${order.repartidorNombre || 'No asignado'}</p>
                        <p><strong>Total:</strong> Bs. ${parseFloat(order.price).toFixed(2)}</p>
                    </div>
                </div>
                <div class="mt-3">
                    <h6>Productos</h6>
                    ${productsHtml || '<p>No hay productos en este pedido</p>'}
                </div>
                <div class="mt-3">
                    <h6><i class="bi bi-receipt"></i> Comprobantes de Pago</h6>
                    ${receiptsHtml}
                </div>
                <div class="mt-3">
                    <h6><i class="bi bi-camera"></i> Fotos de Entrega</h6>
                    ${deliveryPhotosHtml}
                </div>
                ${order.status === 'completed' ? `
                <div class="alert alert-info mt-3">
                    <i class="bi bi-info-circle"></i> Este pedido ya ha sido entregado y no puede ser modificado.
                </div>
                ` : `
                <div class="mt-3">
                    <h6>Cambiar Estado</h6>
                    <select class="form-select mb-2" id="changeOrderStatus">
                        ${validOrderStates.map(state => 
                            `<option value="${state}" ${state === order.status ? 'selected' : ''}>${getStatusLabel(state)}</option>`
                        ).join('')}
                    </select>
                    <button class="btn btn-primary mb-3" onclick="changeOrderStatusFromModal(${order.id_pedido})">Cambiar Estado</button>
                </div>
                <div class="mt-3">
                    <label class="form-label">Asignar Repartidor</label>
                    <select class="form-select" id="assignDelivery">
                        <option value="">Seleccionar repartidor...</option>
                    </select>
                    <button class="btn btn-primary mt-2" onclick="assignDeliveryToOrder(${order.id_pedido})">Asignar</button>
                </div>
                <div class="mt-3">
                    <label class="form-label">Confirmar Pago</label>
                    <button class="btn btn-success" onclick="confirmPayment(${order.id_pedido}, ${order.pago_confirmado ? 'false' : 'true'})">
                        ${order.pago_confirmado ? 'Marcar como No Pagado' : 'Confirmar Pago'}
                    </button>
                </div>
                `}
            `;
            
            // Load delivery options
            await loadDeliveryForSelect('assignDelivery');
            
            const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading order details:', error);
            showMessage('Error al cargar los detalles del pedido', 'error');
        }
    }

    window.assignDeliveryToOrder = async function(orderId) {
        const deliveryId = document.getElementById('assignDelivery').value;
        if (!deliveryId) {
            showMessage('Seleccione un repartidor', 'error');
            return;
        }
        
        try {
            const response = await apiFetch('../../api/orders.php', {
                method: 'PUT',
                body: JSON.stringify({
                    id_pedido: orderId,
                    repartidor_id: parseInt(deliveryId)
                })
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            if (data.success) {
                loadOrders();
                viewOrderDetails('ORD-' + String(orderId).padStart(3, '0'));
            }
        } catch (error) {
            console.error('Error assigning delivery:', error);
            showMessage('Error al asignar repartidor', 'error');
        }
    };
    
    window.changeOrderStatusFromModal = async function(orderId) {
        const newStatus = document.getElementById('changeOrderStatus').value;
        
        if (!confirm(`¿Cambiar estado del pedido a: ${getStatusLabel(newStatus)}?`)) return;
        
        try {
            const response = await apiFetch('../../api/orders.php', {
                method: 'PUT',
                body: JSON.stringify({
                    id_pedido: parseInt(orderId),
                    estado: newStatus
                })
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            
            if (data.success) {
                loadOrders();
                viewOrderDetails('ORD-' + String(orderId).padStart(3, '0'));
            }
        } catch (error) {
            console.error('Error changing order status:', error);
            showMessage('Error al cambiar el estado del pedido', 'error');
        }
    };
    
    window.confirmPayment = async function(orderId, confirm) {
        if (!confirm(confirm ? '¿Confirmar pago de este pedido?' : '¿Marcar este pedido como no pagado?')) return;
        
        try {
            const response = await apiFetch('../../api/orders.php', {
                method: 'PUT',
                body: JSON.stringify({
                    id_pedido: parseInt(orderId),
                    pago_confirmado: confirm
                })
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            
            if (data.success) {
                loadOrders();
                viewOrderDetails('ORD-' + String(orderId).padStart(3, '0'));
            }
        } catch (error) {
            console.error('Error confirming payment:', error);
            showMessage('Error al confirmar el pago', 'error');
        }
    };

    function showChangeStatusModal(orderId, currentStatus) {
        // Abrir modal de detalles del pedido que ya tiene el selector de estado
        viewOrderDetails('ORD-' + String(orderId).padStart(3, '0'));
    }

    // --- Users Section --- //
    async function loadUsers() {
        try {
            await loadRolesForSelect('userRole');
            await loadRolesForSelect('editUserRole');
            
            const response = await apiFetch('../../api/users.php');
            const data = await handleResponse(response);
            
            if (!data || !Array.isArray(data)) {
                allUsersData = [];
            } else {
                allUsersData = data.map(user => ({
                    ...user,
                    activa: user && user.activa !== undefined ? parseInt(user.activa, 10) : 0
                }));
            }
            
            renderUsersTable();
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    function getFilteredUsers() {
        if (!Array.isArray(allUsersData)) return [];
        switch (userStatusFilter) {
            case 'inactive':
                return allUsersData.filter(user => (user.activa ?? 0) === 0);
            case 'all':
                return [...allUsersData];
            case 'active':
            default:
                return allUsersData.filter(user => (user.activa ?? 0) === 1);
        }
    }

    function updateUserFilterButtons() {
        const filtersContainer = document.getElementById('userStatusFilters');
        if (!filtersContainer) return;
        filtersContainer.querySelectorAll('button[data-filter]').forEach(button => {
            if (button.dataset.filter === userStatusFilter) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    function renderUsersTable() {
        updateUserFilterButtons();
        
        const filtered = getFilteredUsers();
        const tableBody = document.getElementById('usersTableBody');
        
        if (!tableBody) return;
        
        if (filtered.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay usuarios para este filtro</td></tr>';
            const paginationContainer = document.getElementById('usersTableBodyPagination');
            if (paginationContainer) paginationContainer.innerHTML = '';
        } else {
            tableBody.innerHTML = '';
            const renderRow = (item) => {
                const isActive = (item.activa ?? 0) === 1;
                const statusBadge = isActive 
                    ? '<span class="badge bg-success">Activo</span>' 
                    : '<span class="badge bg-danger">Inactivo</span>';
                
                const row = document.createElement('tr');
                let actionsHtml = `
                    <button class="btn btn-sm btn-primary edit-user" data-id="${item.id_usuario}" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-user" data-id="${item.id_usuario}" title="Desactivar">
                        <i class="bi bi-person-dash"></i>
                    </button>
                `;
                
                if (!isActive) {
                    actionsHtml = `
                        <button class="btn btn-sm btn-success activate-user" data-id="${item.id_usuario}" title="Activar">
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary edit-user" data-id="${item.id_usuario}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                    `;
                }
                
                row.innerHTML = `
                    <td>${item.id_usuario}</td>
                    <td>${escapeText(item.nombre || '')}</td>
                    <td>${escapeText(item.correo_electronico || '')}</td>
                    <td>${escapeText(item.telefono || '-')}</td>
                    <td>${escapeText(item.rol_nombre || '')}</td>
                    <td>${statusBadge}</td>
                    <td class="d-flex gap-2 flex-wrap">
                        ${actionsHtml}
                    </td>
                `;
                
                row.querySelector('.edit-user')?.addEventListener('click', () => editUser(item.id_usuario));
                row.querySelector('.delete-user')?.addEventListener('click', () => deleteUser(item.id_usuario));
                row.querySelector('.activate-user')?.addEventListener('click', () => activateUser(item.id_usuario));
                
                return row;
            };
            
            if (paginationState['usersTableBody']) {
                paginationState['usersTableBody'].currentPage = 1;
            }
            initPagination('usersTableBody', filtered, renderRow, 6);
        }
        
        const summary = document.getElementById('usersStatusSummary');
        if (summary) {
            let label = 'activos';
            if (userStatusFilter === 'inactive') label = 'inactivos';
            else if (userStatusFilter === 'all') label = 'en total';
            summary.textContent = `Mostrando ${filtered.length} usuario(s) ${label}`;
        }
    }

    async function loadRolesForSelect(selectId) {
        try {
            const response = await apiFetch('../../api/roles.php');
            const roles = await handleResponse(response);
            const select = document.getElementById(selectId);
            if (!select) return;
            
            const currentValue = select.value;
            select.innerHTML = '<option value="">Seleccionar rol...</option>';
            
            if (roles && Array.isArray(roles)) {
                roles.forEach(role => {
                    if (role && role.id_rol && role.nombre) {
                        const option = document.createElement('option');
                        option.value = role.id_rol;
                        option.textContent = role.nombre;
                        select.appendChild(option);
                    }
                });
            }
            
            if (currentValue) select.value = currentValue;
        } catch (error) {
            console.error('Error loading roles:', error);
            showMessage('Error al cargar los roles', 'error');
        }
    }

    document.getElementById('addUserForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            const nameInput = document.getElementById('userName');
            const emailInput = document.getElementById('userEmail');
            const phoneInput = document.getElementById('userPhone');
            const addressInput = document.getElementById('userAddress');
            const passwordInput = document.getElementById('userPassword');
            const rolId = document.getElementById('userRole').value;
            
            // Validación frontend
            if (!rolId) {
                showMessage('Debe seleccionar un rol', 'error');
                return;
            }
            
            // Validar todos los campos (verificar que las funciones existan)
            if (typeof validateNameField === 'function' && !validateNameField(nameInput)) return;
            if (typeof validateEmailField === 'function' && !validateEmailField(emailInput)) return;
            if (phoneInput.value.trim() && typeof validatePhoneField === 'function' && !validatePhoneField(phoneInput)) return;
            if (addressInput.value.trim() && typeof validateAddressField === 'function' && !validateAddressField(addressInput)) return;
            if (typeof validatePasswordField === 'function' && !validatePasswordField(passwordInput)) return;
            
            const email = emailInput.value.trim();
            
            const formData = {
                nombre: document.getElementById('userName').value.trim(),
                correo_electronico: email,
                contrasena: document.getElementById('userPassword').value,
                telefono: document.getElementById('userPhone').value.trim() || '',
                direccion: document.getElementById('userAddress').value.trim() || '',
                fecha_cumpleaños: document.getElementById('userBirthday').value || null,
                rol_id: parseInt(rolId)
            };
            
            if (!formData.nombre || !formData.correo_electronico || !formData.contrasena) {
                showMessage('Nombre, email y contraseña son requeridos', 'error');
                return;
            }
            
            const response = await apiFetch('../../api/users.php', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            
            if (data.success) {
                loadUsers();
                this.reset();
                const tab = new bootstrap.Tab(document.querySelector('a[href="#view-users"]'));
                tab.show();
            }
        } catch (error) {
            console.error('Error adding user:', error);
            showMessage('Error al agregar el usuario: ' + error.message, 'error');
        }
    });

    async function editUser(id) {
        try {
            await loadRolesForSelect('editUserRole');
            
            const response = await apiFetch(`../../api/users.php?id=${id}`);
            const user = await handleResponse(response);
            
            if (!user) {
                showMessage('Usuario no encontrado', 'error');
                return;
            }
            
            document.getElementById('editUserId').value = user.id_usuario;
            document.getElementById('editUserName').value = user.nombre || '';
            document.getElementById('editUserEmail').value = user.correo_electronico || '';
            document.getElementById('editUserPhone').value = user.telefono || '';
            document.getElementById('editUserAddress').value = user.direccion || '';
            document.getElementById('editUserBirthday').value = user.fecha_cumpleaños || '';
            document.getElementById('editUserRole').value = user.rol_id || '';
            document.getElementById('editUserPassword').value = '';
            
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading user:', error);
            showMessage('Error al cargar el usuario: ' + error.message, 'error');
        }
    }

    document.getElementById('editUserForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            const nameInput = document.getElementById('editUserName');
            const emailInput = document.getElementById('editUserEmail');
            const phoneInput = document.getElementById('editUserPhone');
            const addressInput = document.getElementById('editUserAddress');
            const passwordInput = document.getElementById('editUserPassword');
            
            // Validar todos los campos (verificar que las funciones existan)
            if (typeof validateNameField === 'function' && !validateNameField(nameInput)) return;
            if (typeof validateEmailField === 'function' && !validateEmailField(emailInput)) return;
            if (phoneInput.value.trim() && typeof validatePhoneField === 'function' && !validatePhoneField(phoneInput)) return;
            if (addressInput.value.trim() && typeof validateAddressField === 'function' && !validateAddressField(addressInput)) return;
            if (passwordInput.value && typeof validatePasswordField === 'function' && !validatePasswordField(passwordInput)) return;
            
            const email = emailInput.value.trim();
            
            const formData = {
                id: document.getElementById('editUserId').value,
                nombre: document.getElementById('editUserName').value.trim(),
                correo_electronico: email,
                telefono: document.getElementById('editUserPhone').value.trim() || '',
                direccion: document.getElementById('editUserAddress').value.trim() || '',
                fecha_cumpleaños: document.getElementById('editUserBirthday').value || null,
                rol_id: parseInt(document.getElementById('editUserRole').value),
                contrasena: document.getElementById('editUserPassword').value || ''
            };
            
            if (!formData.nombre || !formData.correo_electronico || !formData.rol_id) {
                showMessage('Nombre, email y rol son requeridos', 'error');
                return;
            }
            
            const response = await apiFetch('../../api/users.php', {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            
            if (data.success) {
                loadUsers();
                const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                modal.hide();
            }
        } catch (error) {
            console.error('Error updating user:', error);
            showMessage('Error al actualizar el usuario: ' + error.message, 'error');
        }
    });

    async function activateUser(id) {
        try {
            const response = await apiFetch(`../../api/users.php?id=${id}`);
            const user = await handleResponse(response);
            
            if (!user) {
                showMessage('Usuario no encontrado', 'error');
                return;
            }
            
            const payload = {
                id: user.id_usuario,
                nombre: user.nombre || '',
                correo_electronico: user.correo_electronico || '',
                telefono: user.telefono || '',
                direccion: user.direccion || '',
                fecha_cumpleaños: user.fecha_cumpleaños ?? null,
                rol_id: user.rol_id !== undefined ? parseInt(user.rol_id, 10) || user.rol_id : user.rol_id,
                contrasena: '',
                activa: 1
            };
            
            const updateResponse = await apiFetch('../../api/users.php', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            
            const result = await handleResponse(updateResponse);
            showMessage(result.message || 'Usuario activado exitosamente.', result.success ? 'success' : 'error');
            
            if (result.success) {
                await loadUsers();
            }
        } catch (error) {
            console.error('Error activating user:', error);
            showMessage('Error al activar el usuario: ' + error.message, 'error');
        }
    }

    async function deleteUser(id) {
        // Obtener información del usuario antes de eliminar
        try {
            const userResponse = await apiFetch(`../../api/users.php?id=${id}`);
            const user = await handleResponse(userResponse);
            
            if (!user) {
                showMessage('Usuario no encontrado', 'error');
                return;
            }
            
            // Verificar si es el usuario actual
            const sessionResponse = await apiFetch('../../api/session_check.php');
            const sessionData = await sessionResponse.json();
            
            if (sessionData.success && sessionData.user && sessionData.user.id == id) {
                showMessage('No puede desactivar su propia cuenta. Otro administrador debe hacerlo.', 'error');
                return;
            }
            
            const confirmMessage = `¿Estás seguro de que quieres desactivar al usuario "${user.nombre}"?${sessionData.user && sessionData.user.id == id ? '\n\nADVERTENCIA: No puede desactivar su propia cuenta.' : ''}`;
            
            if (!confirm(confirmMessage)) return;
            
            const response = await apiFetch(`../../api/users.php?id=${id}`, { method: 'DELETE' });
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            
            if (data.success) {
                userStatusFilter = 'inactive';
                await loadUsers();
                
                // Si se desactivó el usuario actual, mostrar advertencia
                if (sessionData.user && sessionData.user.id == id) {
                    setTimeout(() => {
                        notifyAdmin('Su cuenta ha sido desactivada. Será redirigido al login.', 'warning');
                        window.location.href = '../../Index.html';
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            if (error.message && error.message.includes('No puede desactivar')) {
                showMessage(error.message, 'error');
            } else {
                showMessage('Error al eliminar el usuario: ' + error.message, 'error');
            }
        }
    }

    // --- Branches Section --- //
    async function loadBranches() {
        try {
            const response = await apiFetch('../../api/branches.php');
            const data = await handleResponse(response);
            
            if (!data || !Array.isArray(data)) {
                const tableBody = document.getElementById('branchesTableBody');
                if (tableBody) {
                    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No hay sucursales registradas</td></tr>';
                }
                return;
            }
            
            // Función para renderizar una fila
            const renderRow = (item) => {
                const isActive = item.activa == 1 || item.activa === true || item.activa === '1';
                const statusBadge = isActive 
                    ? '<span class="badge bg-success">Activa</span>' 
                    : '<span class="badge bg-danger">Inactiva</span>';
                
                const horario = item.horario_apertura && item.horario_cierre 
                    ? `${item.horario_apertura} - ${item.horario_cierre}`
                    : '-';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id_sucursal}</td>
                    <td>${item.nombre}</td>
                    <td>${item.direccion}</td>
                    <td>${item.telefono || '-'}</td>
                    <td>${horario}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-branch" data-id="${item.id_sucursal}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-branch" data-id="${item.id_sucursal}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                
                // Agregar event listeners
                row.querySelector('.edit-branch')?.addEventListener('click', () => editBranch(item.id_sucursal));
                row.querySelector('.delete-branch')?.addEventListener('click', () => deleteBranch(item.id_sucursal));
                
                return row;
            };
            
            // Inicializar paginación
            initPagination('branchesTableBody', data, renderRow, 6);
        } catch (error) {
            console.error('Error loading branches:', error);
        }
    }

    async function loadBranchesForSelect(selectId) {
        try {
            const response = await apiFetch('../../api/branches.php');
            const branches = await handleResponse(response);
            const select = document.getElementById(selectId);
            if (!select) return;
            
            const currentValue = select.value;
            select.innerHTML = '<option value="">Todas las sucursales</option>';
            branches.forEach(branch => {
                // Convertir activa a boolean correctamente
                const isActive = branch.activa == 1 || branch.activa === true || branch.activa === '1';
                if (isActive) {
                    const option = document.createElement('option');
                    option.value = branch.id_sucursal;
                    option.textContent = branch.nombre;
                    select.appendChild(option);
                }
            });
            if (currentValue) select.value = currentValue;
        } catch (error) {
            console.error('Error loading branches for select:', error);
        }
    }

    document.getElementById('addBranchForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            const nameInput = document.getElementById('branchName');
            const addressInput = document.getElementById('branchAddress');
            const phoneInput = document.getElementById('branchPhone');
            
            // Validar campos (verificar que las funciones existan)
            if (typeof validateNameField === 'function' && !validateNameField(nameInput)) return;
            if (typeof validateAddressField === 'function' && !validateAddressField(addressInput)) return;
            if (phoneInput.value.trim() && typeof validatePhoneField === 'function' && !validatePhoneField(phoneInput)) return;
            
            const nombre = nameInput.value.trim();
            const direccion = addressInput.value.trim();
            
            const horarioApertura = document.getElementById('branchOpen').value;
            const horarioCierre = document.getElementById('branchClose').value;
            
            // Validar que si se proporciona un horario, se proporcionen ambos
            if ((horarioApertura && !horarioCierre) || (!horarioApertura && horarioCierre)) {
                showMessage('Debe proporcionar ambos horarios o ninguno', 'error');
                return;
            }
            
            const formData = {
                nombre: nombre,
                direccion: direccion,
                telefono: document.getElementById('branchPhone').value.trim() || '',
                horario_apertura: horarioApertura || null,
                horario_cierre: horarioCierre || null,
                activa: document.getElementById('branchActive').checked ? 1 : 0
            };
            
            const response = await apiFetch('../../api/branches.php', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            
            if (data.success) {
                loadBranches();
                this.reset();
                const tab = new bootstrap.Tab(document.querySelector('a[href="#view-branches"]'));
                tab.show();
            }
        } catch (error) {
            console.error('Error adding branch:', error);
            showMessage('Error al agregar la sucursal: ' + error.message, 'error');
        }
    });

    async function editBranch(id) {
        try {
            const response = await apiFetch(`../../api/branches.php?id=${id}`);
            const branch = await handleResponse(response);
            
            if (!branch) {
                showMessage('Sucursal no encontrada', 'error');
                return;
            }
            
            document.getElementById('editBranchId').value = branch.id_sucursal;
            document.getElementById('editBranchName').value = branch.nombre;
            document.getElementById('editBranchAddress').value = branch.direccion;
            document.getElementById('editBranchPhone').value = branch.telefono || '';
            
            // Convertir horarios de "HH:MM:SS" a "HH:MM" si es necesario
            const formatTime = (timeStr) => {
                if (!timeStr) return '';
                // Si viene en formato "HH:MM:SS", tomar solo "HH:MM"
                if (timeStr.includes(':') && timeStr.split(':').length === 3) {
                    return timeStr.substring(0, 5);
                }
                return timeStr;
            };
            
            document.getElementById('editBranchOpen').value = formatTime(branch.horario_apertura);
            document.getElementById('editBranchClose').value = formatTime(branch.horario_cierre);
            
            // Convertir activa a boolean correctamente
            const isActive = branch.activa == 1 || branch.activa === true || branch.activa === '1';
            document.getElementById('editBranchActive').checked = isActive;
            
            const modal = new bootstrap.Modal(document.getElementById('editBranchModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading branch:', error);
            showMessage('Error al cargar la sucursal', 'error');
        }
    }
    
    document.getElementById('editBranchForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            const nameInput = document.getElementById('editBranchName');
            const addressInput = document.getElementById('editBranchAddress');
            const phoneInput = document.getElementById('editBranchPhone');
            
            // Validar campos (verificar que las funciones existan)
            if (typeof validateNameField === 'function' && !validateNameField(nameInput)) return;
            if (typeof validateAddressField === 'function' && !validateAddressField(addressInput)) return;
            if (phoneInput.value.trim() && typeof validatePhoneField === 'function' && !validatePhoneField(phoneInput)) return;
            
            const nombre = nameInput.value.trim();
            const direccion = addressInput.value.trim();
            
            const horarioApertura = document.getElementById('editBranchOpen').value.trim();
            const horarioCierre = document.getElementById('editBranchClose').value.trim();
            
            // Validar que si se proporciona un horario, se proporcionen ambos
            if ((horarioApertura && !horarioCierre) || (!horarioApertura && horarioCierre)) {
                showMessage('Debe proporcionar ambos horarios o ninguno', 'error');
                return;
            }
            
            // Validar formato de horarios si se proporcionan
            if (horarioApertura && horarioCierre) {
                const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
                if (!timeRegex.test(horarioApertura) || !timeRegex.test(horarioCierre)) {
                    showMessage('Los horarios deben tener el formato HH:MM (ejemplo: 09:00)', 'error');
                    return;
                }
            }
            
            const formData = {
                id: document.getElementById('editBranchId').value,
                nombre: nombre,
                direccion: direccion,
                telefono: document.getElementById('editBranchPhone').value.trim() || '',
                horario_apertura: horarioApertura || null,
                horario_cierre: horarioCierre || null,
                activa: document.getElementById('editBranchActive').checked ? 1 : 0
            };
            
            const response = await apiFetch('../../api/branches.php', {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            
            if (data.success) {
                loadBranches();
                const modal = bootstrap.Modal.getInstance(document.getElementById('editBranchModal'));
                modal.hide();
            }
        } catch (error) {
            console.error('Error updating branch:', error);
            showMessage('Error al actualizar la sucursal: ' + error.message, 'error');
        }
    });

    async function deleteBranch(id) {
        if (!confirm('¿Estás seguro de que quieres desactivar esta sucursal?')) return;
        
        try {
            const response = await apiFetch(`../../api/branches.php?id=${id}`, { method: 'DELETE' });
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            if (data.success) loadBranches();
        } catch (error) {
            console.error('Error deleting branch:', error);
            showMessage('Error al eliminar la sucursal', 'error');
        }
    }

    // --- Delivery Section --- //
    async function loadDelivery() {
        const tableBody = document.getElementById('deliveryTableBody');
        
        try {
            const response = await apiFetch('../../api/delivery.php');
            
            // Verificar que la respuesta existe
            if (!response) {
                console.error('No response received from server');
                if (tableBody) {
                    tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">No se recibió respuesta del servidor</td></tr>';
                }
                showMessage('No se recibió respuesta del servidor', 'error');
                return;
            }
            
            // Leer el texto de la respuesta primero
            let responseText;
            try {
                responseText = await response.text();
            } catch (textError) {
                console.error('Error reading response text:', textError);
                if (tableBody) {
                    tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al leer la respuesta del servidor</td></tr>';
                }
                showMessage('Error al leer la respuesta del servidor', 'error');
                return;
            }
            
            // Verificar si la respuesta está vacía
            if (!responseText || responseText.trim() === '') {
                console.error('Empty response from server. Status:', response.status, 'StatusText:', response.statusText);
                if (tableBody) {
                    tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Respuesta vacía del servidor (Status: ' + response.status + ')</td></tr>';
                }
                showMessage('El servidor no devolvió datos', 'error');
                return;
            }
            
            console.log('Response received:', responseText.substring(0, 200)); // Log primeros 200 caracteres
            
            // Verificar el status de la respuesta
            if (!response.ok) {
                console.error('Error response:', response.status, responseText);
                let errorMessage = 'Error al cargar los repartidores';
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // Si no es JSON, usar el texto directamente
                    errorMessage = responseText || errorMessage;
                }
                const tableBody = document.getElementById('deliveryTableBody');
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al cargar los repartidores</td></tr>';
                showMessage(errorMessage, 'error');
                return;
            }
            
            // Parsear JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                console.error('Response text:', responseText);
                const tableBody = document.getElementById('deliveryTableBody');
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al procesar la respuesta del servidor</td></tr>';
                showMessage('Error al procesar la respuesta del servidor. Verifique la consola para más detalles.', 'error');
                return;
            }
            
            // Asegurar que data es un array
            if (!Array.isArray(data)) {
                console.error('Expected array but got:', typeof data, data);
                const tableBody = document.getElementById('deliveryTableBody');
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error: formato de respuesta inválido</td></tr>';
                return;
            }
            
            const tableBody = document.getElementById('deliveryTableBody');
            tableBody.innerHTML = '';
            
            if (!data || !Array.isArray(data) || data.length === 0) {
                const tableBody = document.getElementById('deliveryTableBody');
                if (tableBody) {
                    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay repartidores registrados</td></tr>';
                }
                return;
            }
            
            // Función para renderizar una fila
            const renderRow = (item) => {
                const statusBadge = item.estado === 'disponible' 
                    ? '<span class="badge bg-success">Disponible</span>' 
                    : '<span class="badge bg-warning">Ocupado</span>';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id_repartidor}</td>
                    <td>${item.nombre}</td>
                    <td>${item.telefono || '-'}</td>
                    <td>${item.correo_electronico || '-'}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-delivery" data-id="${item.id_repartidor}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-delivery" data-id="${item.id_repartidor}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                
                // Agregar event listeners
                row.querySelector('.edit-delivery')?.addEventListener('click', () => editDelivery(item.id_repartidor));
                row.querySelector('.delete-delivery')?.addEventListener('click', () => deleteDelivery(item.id_repartidor));
                
                return row;
            };
            
            // Inicializar paginación
            initPagination('deliveryTableBody', data, renderRow, 6);
        } catch (error) {
            console.error('Error loading delivery:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            const tableBody = document.getElementById('deliveryTableBody');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al cargar los repartidores: ' + (error.message || 'Error desconocido') + '</td></tr>';
            }
            
            showMessage('Error al cargar los repartidores: ' + (error.message || 'Error desconocido'), 'error');
        }
    }

    async function loadDeliveryForSelect(selectId = 'assignDelivery') {
        try {
            const response = await apiFetch('../../api/delivery.php');
            const deliveries = await handleResponse(response);
            const select = document.getElementById(selectId);
            if (!select) return;
            
            const currentValue = select.value;
            select.innerHTML = '<option value="">Seleccionar repartidor...</option>';
            deliveries.forEach(delivery => {
                if (delivery.estado === 'disponible') {
                    const option = document.createElement('option');
                    option.value = delivery.id_repartidor;
                    option.textContent = delivery.nombre;
                    select.appendChild(option);
                }
            });
            if (currentValue) select.value = currentValue;
        } catch (error) {
            console.error('Error loading delivery for select:', error);
        }
    }

    document.getElementById('addDeliveryForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            const nameInput = document.getElementById('deliveryName');
            const emailInput = document.getElementById('deliveryEmail');
            const phoneInput = document.getElementById('deliveryPhone');
            
            // Validar campos (verificar que las funciones existan)
            if (typeof validateNameField === 'function' && !validateNameField(nameInput)) return;
            if (emailInput.value.trim() && typeof validateEmailField === 'function' && !validateEmailField(emailInput)) return;
            if (phoneInput.value.trim() && typeof validatePhoneField === 'function' && !validatePhoneField(phoneInput)) return;
            
            const nombre = nameInput.value.trim();
            const email = emailInput.value.trim();
            
            const formData = {
                nombre: nombre,
                telefono: document.getElementById('deliveryPhone').value.trim() || '',
                correo_electronico: email || '',
                estado: document.getElementById('deliveryStatus').value,
                fecha_inicio_trabajo: new Date().toISOString().split('T')[0]
            };
            
            const response = await apiFetch('../../api/delivery.php', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            
            if (data.success) {
                // Resetear el formulario primero
                this.reset();
                // Recargar la lista de repartidores
                await loadDelivery();
                // Cambiar a la pestaña de visualización
                const viewTab = document.querySelector('a[href="#view-delivery"]');
                if (viewTab) {
                    const tab = new bootstrap.Tab(viewTab);
                    tab.show();
                }
            }
        } catch (error) {
            console.error('Error adding delivery:', error);
            showMessage('Error al agregar el repartidor: ' + error.message, 'error');
        }
    });

    async function editDelivery(id) {
        try {
            const response = await apiFetch(`../../api/delivery.php?id=${id}`);
            const delivery = await handleResponse(response);
            
            if (!delivery) {
                showMessage('Repartidor no encontrado', 'error');
                return;
            }
            
            document.getElementById('editDeliveryId').value = delivery.id_repartidor;
            document.getElementById('editDeliveryName').value = delivery.nombre;
            document.getElementById('editDeliveryPhone').value = delivery.telefono || '';
            document.getElementById('editDeliveryEmail').value = delivery.correo_electronico || '';
            document.getElementById('editDeliveryStatus').value = delivery.estado || 'disponible';
            
            const modal = new bootstrap.Modal(document.getElementById('editDeliveryModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading delivery:', error);
            showMessage('Error al cargar el repartidor', 'error');
        }
    }
    
    document.getElementById('editDeliveryForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            const nameInput = document.getElementById('editDeliveryName');
            const emailInput = document.getElementById('editDeliveryEmail');
            const phoneInput = document.getElementById('editDeliveryPhone');
            
            // Validar campos (verificar que las funciones existan)
            if (typeof validateNameField === 'function' && !validateNameField(nameInput)) return;
            if (emailInput.value.trim() && typeof validateEmailField === 'function' && !validateEmailField(emailInput)) return;
            if (phoneInput.value.trim() && typeof validatePhoneField === 'function' && !validatePhoneField(phoneInput)) return;
            
            const nombre = nameInput.value.trim();
            const email = emailInput.value.trim();
            
            const formData = {
                id: document.getElementById('editDeliveryId').value,
                nombre: nombre,
                telefono: document.getElementById('editDeliveryPhone').value.trim() || '',
                correo_electronico: email || '',
                estado: document.getElementById('editDeliveryStatus').value
            };
            
            const response = await apiFetch('../../api/delivery.php', {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            
            if (data.success) {
                loadDelivery();
                const modal = bootstrap.Modal.getInstance(document.getElementById('editDeliveryModal'));
                modal.hide();
            }
        } catch (error) {
            console.error('Error updating delivery:', error);
            showMessage('Error al actualizar el repartidor: ' + error.message, 'error');
        }
    });

    async function deleteDelivery(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este repartidor?')) return;
        
        try {
            const response = await apiFetch(`../../api/delivery.php?id=${id}`, { method: 'DELETE' });
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            if (data.success) loadDelivery();
        } catch (error) {
            console.error('Error deleting delivery:', error);
            showMessage('Error al eliminar el repartidor', 'error');
        }
    }

    // --- Promotions Section --- //
    async function loadPromotions() {
        try {
            await loadBranchesForSelect('promotionBranch');
            
            const response = await apiFetch('../../api/promotions.php');
            const data = await handleResponse(response);
            
            if (!data || !Array.isArray(data)) {
                const tableBody = document.getElementById('promotionsTableBody');
                if (tableBody) {
                    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No hay promociones registradas</td></tr>';
                }
                return;
            }
            
            // Función para renderizar una fila
            const renderRow = (item) => {
                const isActive = item.activa == 1 || item.activa === true || item.activa === '1';
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const fechaFin = new Date(item.fecha_fin);
                fechaFin.setHours(0, 0, 0, 0);
                const isExpired = fechaFin < today;
                const shouldBeActive = isActive && !isExpired;
                
                const statusBadge = shouldBeActive 
                    ? '<span class="badge bg-success">Activa</span>' 
                    : '<span class="badge bg-danger">Inactiva</span>';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id_promocion}</td>
                    <td>${item.descripcion}</td>
                    <td>${parseFloat(item.porcentaje_descuento).toFixed(2)}%</td>
                    <td>${item.fecha_inicio}</td>
                    <td>${item.fecha_fin}</td>
                    <td>${item.sucursal_nombre || 'Todas'}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-promotion" data-id="${item.id_promocion}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-promotion" data-id="${item.id_promocion}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                
                // Agregar event listeners
                row.querySelector('.edit-promotion')?.addEventListener('click', () => editPromotion(item.id_promocion));
                row.querySelector('.delete-promotion')?.addEventListener('click', () => deletePromotion(item.id_promocion));
                
                return row;
            };
            
            // Inicializar paginación
            initPagination('promotionsTableBody', data, renderRow, 6);
        } catch (error) {
            console.error('Error loading promotions:', error);
        }
    }

    document.getElementById('addPromotionForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            const discountInput = document.getElementById('promotionDiscount');
            const fechaInicio = document.getElementById('promotionStart').value;
            const fechaFin = document.getElementById('promotionEnd').value;
            
            // Validación frontend
            if (typeof validatePercentageField === 'function' && !validatePercentageField(discountInput)) return;
            
            if (fechaInicio && fechaFin) {
                const inicio = new Date(fechaInicio);
                const fin = new Date(fechaFin);
                if (inicio > fin) {
                    const endInput = document.getElementById('promotionEnd');
                    showFieldError(endInput, 'La fecha de fin debe ser posterior a la fecha de inicio');
                    return;
                }
            }
            
            const descuento = parseFloat(discountInput.value);
            
            const formData = {
                descripcion: document.getElementById('promotionDescription').value.trim(),
                porcentaje_descuento: descuento,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                sucursal_id: document.getElementById('promotionBranch').value || null,
                activa: document.getElementById('promotionActive').checked ? 1 : 0
            };
            
            if (!formData.descripcion || !formData.fecha_inicio || !formData.fecha_fin) {
                showMessage('Descripción, fecha de inicio y fecha de fin son requeridos', 'error');
                return;
            }
            
            const response = await apiFetch('../../api/promotions.php', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            
            if (data.success) {
                loadPromotions();
                this.reset();
                const tab = new bootstrap.Tab(document.querySelector('a[href="#view-promotions"]'));
                tab.show();
            }
        } catch (error) {
            console.error('Error adding promotion:', error);
            showMessage('Error al agregar la promoción: ' + error.message, 'error');
        }
    });

    async function editPromotion(id) {
        try {
            await loadBranchesForSelect('editPromotionBranch');
            
            const response = await apiFetch(`../../api/promotions.php?id=${id}`);
            const promotion = await handleResponse(response);
            
            if (!promotion) {
                showMessage('Promoción no encontrada', 'error');
                return;
            }
            
            document.getElementById('editPromotionId').value = promotion.id_promocion;
            document.getElementById('editPromotionDescription').value = promotion.descripcion;
            document.getElementById('editPromotionDiscount').value = promotion.porcentaje_descuento;
            document.getElementById('editPromotionStart').value = promotion.fecha_inicio;
            document.getElementById('editPromotionEnd').value = promotion.fecha_fin;
            document.getElementById('editPromotionBranch').value = promotion.sucursal_id || '';
            // Convertir activa a boolean correctamente
            const isActive = promotion.activa == 1 || promotion.activa === true || promotion.activa === '1';
            document.getElementById('editPromotionActive').checked = isActive;
            
            const modal = new bootstrap.Modal(document.getElementById('editPromotionModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading promotion:', error);
            showMessage('Error al cargar la promoción', 'error');
        }
    }
    
    document.getElementById('editPromotionForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            const discountInput = document.getElementById('editPromotionDiscount');
            const fechaInicio = document.getElementById('editPromotionStart').value;
            const fechaFin = document.getElementById('editPromotionEnd').value;
            
            // Validación frontend
            if (typeof validatePercentageField === 'function' && !validatePercentageField(discountInput)) return;
            
            if (fechaInicio && fechaFin) {
                const inicio = new Date(fechaInicio);
                const fin = new Date(fechaFin);
                if (inicio > fin) {
                    const endInput = document.getElementById('editPromotionEnd');
                    showFieldError(endInput, 'La fecha de fin debe ser posterior a la fecha de inicio');
                    return;
                }
            }
            
            const descuento = parseFloat(discountInput.value);
            
            const formData = {
                id: document.getElementById('editPromotionId').value,
                descripcion: document.getElementById('editPromotionDescription').value.trim(),
                porcentaje_descuento: descuento,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                sucursal_id: document.getElementById('editPromotionBranch').value || null,
                activa: document.getElementById('editPromotionActive').checked ? 1 : 0
            };
            
            if (!formData.descripcion || !formData.fecha_inicio || !formData.fecha_fin) {
                showMessage('Descripción, fecha de inicio y fecha de fin son requeridos', 'error');
                return;
            }
            
            const response = await apiFetch('../../api/promotions.php', {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            
            if (data.success) {
                loadPromotions();
                const modal = bootstrap.Modal.getInstance(document.getElementById('editPromotionModal'));
                modal.hide();
            }
        } catch (error) {
            console.error('Error updating promotion:', error);
            showMessage('Error al actualizar la promoción: ' + error.message, 'error');
        }
    });

    async function deletePromotion(id) {
        if (!confirm('¿Estás seguro de que quieres desactivar esta promoción?')) return;
        
        try {
            const response = await apiFetch(`../../api/promotions.php?id=${id}`, { method: 'DELETE' });
            const data = await handleResponse(response);
            showMessage(data.message, data.success ? 'success' : 'error');
            if (data.success) loadPromotions();
        } catch (error) {
            console.error('Error deleting promotion:', error);
            showMessage('Error al eliminar la promoción', 'error');
        }
    }

