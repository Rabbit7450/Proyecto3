document.addEventListener('DOMContentLoaded', function() {
    function initTooltips(root = document) {
        const tooltipTriggerList = [].slice.call(root.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            // Dispose existing to avoid duplicates
            const existing = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
            if (existing) existing.dispose();
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    // Initialize tooltips on load
    initTooltips(document);
    const navLinks = document.querySelectorAll('#adminSidebar .nav-link, .sidebar .nav-link');
    const sections = document.querySelectorAll('.content > div');
    // Set initial active state
    if (navLinks.length) {
        navLinks.forEach(l => l.classList.remove('active'));
        navLinks[0].classList.add('active');
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            sections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.remove('d-none');
                } else {
                    section.classList.add('d-none');
                }
            });

            // set active state for nav icons
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            if (targetId === 'products') {
                loadProducts();
            } else if (targetId === 'users') {
                loadUsers();
            } else if (targetId === 'orders') {
                loadOrders();
            }
        });
    });

    function handleResponse(response) {
        if (!response.ok) {
            return response.text().then(text => { 
                throw new Error('La respuesta de la red no fue correcta: ' + text);
            });
        }
        return response.json();
    }

    function loadProducts() {
        fetch('../../api/products.php')
            .then(handleResponse)
            .then(data => {
                const productsTableBody = document.getElementById('productsTableBody');
                productsTableBody.innerHTML = '';
                data.forEach(product => {
                    const row = `
                        <tr>
                            <td>${product.nombre}</td>
                            <td>${product.descripcion}</td>
                            <td>Bs. ${Number(product.precio).toFixed(2)}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary edit-product" data-id="${product.id_producto}" data-bs-toggle="tooltip" title="Editar">
                                    <i class="bi bi-pencil"></i>
                                    <span class="visually-hidden">Editar</span>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-product" data-id="${product.id_producto}" data-bs-toggle="tooltip" title="Eliminar">
                                    <i class="bi bi-trash"></i>
                                    <span class="visually-hidden">Eliminar</span>
                                </button>
                            </td>
                        </tr>
                    `;
                    productsTableBody.innerHTML += row;
                });

                document.querySelectorAll('.edit-product').forEach(button => {
                    button.addEventListener('click', function() {
                        editProduct(this.dataset.id);
                    });
                });

                document.querySelectorAll('.delete-product').forEach(button => {
                    button.addEventListener('click', function() {
                        deleteProduct(this.dataset.id);
                    });
                });
            })
            .then(() => initTooltips(document))
            .catch(error => {
                console.error('Error al cargar productos:', error);
                alert('No se pudieron cargar los productos. Ver consola para más detalles.');
            });
    }

    const addProductForm = document.getElementById('addProductForm');
    if(addProductForm) {
        addProductForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const productName = document.getElementById('productName').value;
            const productDescription = document.getElementById('productDescription').value;
            const productPrice = document.getElementById('productPrice').value;

            fetch('../../api/products.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: productName, description: productDescription, price: productPrice })
            })
            .then(handleResponse)
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    loadProducts();
                    addProductForm.reset();
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Error al agregar producto:', error));
        });
    }

    function editProduct(id) {
        fetch(`../../api/products.php?id=${id}`)
            .then(handleResponse)
            .then(product => {
                document.getElementById('editProductId').value = product.id_producto;
                document.getElementById('editProductName').value = product.nombre;
                document.getElementById('editProductDescription').value = product.descripcion;
                document.getElementById('editProductPrice').value = product.precio;
                const modal = new bootstrap.Modal(document.getElementById('editProductModal'));
                modal.show();
            })
            .catch(error => console.error('Error al obtener producto:', error));
    }

    const editProductForm = document.getElementById('editProductForm');
    if(editProductForm) {
        editProductForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('editProductId').value;
            const name = document.getElementById('editProductName').value;
            const description = document.getElementById('editProductDescription').value;
            const price = document.getElementById('editProductPrice').value;

            fetch('../../api/products.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, name, description, price })
            })
            .then(handleResponse)
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editProductModal'));
                    modal.hide();
                    loadProducts();
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Error al actualizar producto:', error));
        });
    }

    function deleteProduct(id) {
        if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            fetch(`../../api/products.php?id=${id}`, {
                method: 'DELETE'
            })
            .then(handleResponse)
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    loadProducts();
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Error al eliminar producto:', error));
        }
    }

    function loadUsers() {
        fetch('../../api/users.php')
            .then(handleResponse)
            .then(data => {
                const usersTableBody = document.getElementById('usersTableBody');
                usersTableBody.innerHTML = '';
                data.forEach(user => {
                    const row = `
                        <tr>
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td>${user.role}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary edit-user" data-id="${user.id_usuario}" data-bs-toggle="tooltip" title="Editar">
                                    <i class="bi bi-pencil"></i>
                                    <span class="visually-hidden">Editar</span>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-user" data-id="${user.id_usuario}" data-bs-toggle="tooltip" title="Eliminar">
                                    <i class="bi bi-trash"></i>
                                    <span class="visually-hidden">Eliminar</span>
                                </button>
                            </td>
                        </tr>
                    `;
                    usersTableBody.innerHTML += row;
                });

                document.querySelectorAll('.edit-user').forEach(button => {
                    button.addEventListener('click', function() {
                        editUser(this.dataset.id);
                    });
                });

                document.querySelectorAll('.delete-user').forEach(button => {
                    button.addEventListener('click', function() {
                        deleteUser(this.dataset.id);
                    });
                });
            })
            .then(() => initTooltips(document))
            .catch(error => {
                console.error('Error al cargar usuarios:', error);
                alert('No se pudieron cargar los usuarios. Ver consola para más detalles.');
            });
    }

    const addUserForm = document.getElementById('addUserForm');
    if(addUserForm) {
        addUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const userName = document.getElementById('userName').value;
            const userPassword = document.getElementById('userPassword').value;
            const userEmail = document.getElementById('userEmail').value;
            const userRole = document.getElementById('userRole').value;

            fetch('../../api/users.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: userName, password: userPassword, email: userEmail, role: userRole })
            })
            .then(handleResponse)
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    loadUsers();
                    addUserForm.reset();
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Error al agregar usuario:', error));
        });
    }

    function editUser(id) {
        fetch(`../../api/users.php?id=${id}`)
            .then(handleResponse)
            .then(user => {
                document.getElementById('editUserId').value = user.id_usuario;
                document.getElementById('editUserName').value = user.username;
                document.getElementById('editUserEmail').value = user.email;
                document.getElementById('editUserRole').value = user.role;
                const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
                modal.show();
            })
            .catch(error => console.error('Error al obtener usuario:', error));
    }

    const editUserForm = document.getElementById('editUserForm');
    if(editUserForm) {
        editUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('editUserId').value;
            const username = document.getElementById('editUserName').value;
            const email = document.getElementById('editUserEmail').value;
            const role = document.getElementById('editUserRole').value;

            fetch('../../api/users.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, username, email, role })
            })
            .then(handleResponse)
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                    modal.hide();
                    loadUsers();
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Error al actualizar usuario:', error));
        });
    }

    function deleteUser(id) {
        if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
            fetch(`../../api/users.php?id=${id}`, {
                method: 'DELETE'
            })
            .then(handleResponse)
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    loadUsers();
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Error al eliminar usuario:', error));
        }
    }

    function loadOrders() {
        fetch('../../api/orders.php')
            .then(handleResponse)
            .then(data => {
                const ordersTableBody = document.getElementById('ordersTableBody');
                ordersTableBody.innerHTML = '';
                data.forEach(order => {
                    const row = `
                        <tr>
                            <td>${order.id}</td>
                            <td>${order.customerName}</td>
                            <td>Bs. ${Number(order.price).toFixed(2)}</td>
                            <td>${order.status}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="tooltip" title="Ver detalles">
                                    <i class="bi bi-eye"></i>
                                    <span class="visually-hidden">Ver Detalles</span>
                                </button>
                            </td>
                        </tr>
                    `;
                    ordersTableBody.innerHTML += row;
                });
            })
            .then(() => initTooltips(document))
            .catch(error => {
                console.error('Error al cargar pedidos:', error);
                alert('No se pudieron cargar los pedidos. Ver consola para más detalles.');
            });
    }
});