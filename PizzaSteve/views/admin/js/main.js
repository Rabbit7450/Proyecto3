document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    const sections = document.querySelectorAll('.content > div');

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
                            <td>${product.precio}</td>
                            <td>
                                <button class="btn btn-sm btn-primary edit-product" data-id="${product.id_producto}">Editar</button>
                                <button class="btn btn-sm btn-danger delete-product" data-id="${product.id_producto}">Eliminar</button>
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
            .catch(error => console.error('Error al cargar productos:', error));
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
                                <button class="btn btn-sm btn-primary edit-user" data-id="${user.id_usuario}">Editar</button>
                                <button class="btn btn-sm btn-danger delete-user" data-id="${user.id_usuario}">Eliminar</button>
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
            .catch(error => console.error('Error al cargar usuarios:', error));
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
                            <td>${order.price}</td>
                            <td>${order.status}</td>
                            <td>
                                <button class="btn btn-sm btn-primary">Ver Detalles</button>
                            </td>
                        </tr>
                    `;
                    ordersTableBody.innerHTML += row;
                });
            })
            .catch(error => console.error('Error al cargar pedidos:', error));
    }
});