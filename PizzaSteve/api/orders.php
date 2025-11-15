<?php
// api/orders.php
require_once '../config/environment.php';
require_once '../config/database.php';
require_once '../config/security.php';
require_once '../config/security_headers.php';
require_once 'auth_middleware.php';

setSecurityHeaders();
header('Content-Type: application/json');

// Verificar autenticación para todas las operaciones
// Los repartidores pueden ver sus pedidos asignados, pero solo admin/vendedor pueden modificar
$current_user = requireAuth(); // Cualquier usuario autenticado puede ver pedidos

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

// --- Estados válidos de pedidos (estandarizados) ---
$valid_states = ['pending', 'preparing', 'ready_for_delivery', 'out_for_delivery', 'completed', 'cancelled'];

// --- Métodos de pago válidos ---
$valid_payment_methods = ['efectivo', 'transferencia', 'qr', 'tarjeta'];

// --- Mapa de Coordenadas de Sucursales ---
$branch_coordinates = [
    1 => ['lat' => -16.507, 'lng' => -68.127] 
];

// --- Función para validar estado ---
function isValidState($state, $valid_states) {
    return in_array($state, $valid_states);
}

// --- Función para validar método de pago ---
function isValidPaymentMethod($method, $valid_methods) {
    return in_array($method, $valid_methods);
}

switch ($method) {
    case 'GET':
        if ($id) {
            // Obtener un pedido específico con detalles
            $pedido_id = str_replace('ORD-', '', $id);
            
            // Validar que el ID sea numérico
            if (!is_numeric($pedido_id)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID de pedido inválido.']);
                exit;
            }
            
            $pedido_id = (int)$pedido_id;
            
            $sql = "
                SELECT 
                    p.id_pedido,
                    p.sucursal_id,
                    p.usuario_id,
                    p.direccion_id,
                    p.repartidor_id,
                    p.fecha_pedido,
                    p.estado AS status,
                    p.metodo_pago AS paymentType,
                    p.total AS price,
                    p.pago_confirmado,
                    s.nombre AS branchName,
                    u.nombre AS customerName,
                    u.telefono AS customerPhone,
                    u.correo_electronico AS customerEmail,
                    de.direccion AS address,
                    de.latitud AS lat,
                    de.longitud AS lng,
                    r.nombre AS repartidorNombre
                FROM 
                    pedidos AS p
                JOIN 
                    usuarios AS u ON p.usuario_id = u.id_usuario
                JOIN 
                    direcciones_entrega AS de ON p.direccion_id = de.id_direccion
                JOIN
                    sucursales AS s ON p.sucursal_id = s.id_sucursal
                LEFT JOIN
                    repartidores AS r ON p.repartidor_id = r.id_repartidor
                WHERE p.id_pedido = ?
            ";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('i', $pedido_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $order = $result->fetch_assoc();
            $stmt->close();

            if ($order) {
                // Obtener productos del pedido
                $sql_products = "
                    SELECT 
                        pp.id_producto,
                        p.nombre,
                        pp.cantidad_producto,
                        pp.precio_u
                    FROM pedidos_productos pp
                    JOIN productos p ON pp.id_producto = p.id_producto
                    WHERE pp.id_pedido = ?
                ";
                $stmt_products = $conn->prepare($sql_products);
                if ($stmt_products) {
                    $stmt_products->bind_param('i', $pedido_id);
                    $stmt_products->execute();
                    $result_products = $stmt_products->get_result();
                    $products = [];
                    while ($row = $result_products->fetch_assoc()) {
                        $products[] = $row;
                    }
                    $stmt_products->close();
                    $order['products'] = $products;
                } else {
                    $order['products'] = [];
                }

                $order['id'] = 'ORD-' . str_pad($order['id_pedido'], 3, '0', STR_PAD_LEFT);
                echo json_encode($order);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Pedido no encontrado.']);
            }
        } else {
            // Obtener todos los pedidos con conteo de productos
            // Usar DATE_FORMAT para asegurar formato datetime completo
            $sql = "
                SELECT 
                    p.id_pedido,
                    p.sucursal_id,
                    s.nombre AS branchName,
                    u.nombre AS customerName,
                    de.direccion AS address,
                    p.estado AS status,
                    p.metodo_pago AS paymentType,
                    p.total AS price,
                    DATE_FORMAT(p.fecha_pedido, '%Y-%m-%d %H:%i:%s') AS fecha_pedido,
                    p.pago_confirmado,
                    de.latitud AS lat,
                    de.longitud AS lng,
                    r.nombre AS repartidorNombre,
                    (SELECT COUNT(*) FROM pedidos_productos pp WHERE pp.id_pedido = p.id_pedido) AS items_count
                FROM 
                    pedidos AS p
                JOIN 
                    usuarios AS u ON p.usuario_id = u.id_usuario
                JOIN 
                    direcciones_entrega AS de ON p.direccion_id = de.id_direccion
                JOIN
                    sucursales AS s ON p.sucursal_id = s.id_sucursal
                LEFT JOIN
                    repartidores AS r ON p.repartidor_id = r.id_repartidor
                ORDER BY p.fecha_pedido DESC, p.id_pedido DESC
            ";

            $result = $conn->query($sql);

            if ($result) {
                $orders = [];
                while($row = $result->fetch_assoc()) {
                    $sucursal_id = $row['sucursal_id'];
                    $pedido_id = $row['id_pedido'];
                    
                    // Función para limpiar strings a UTF-8
                    $cleanString = function($value) {
                        if (is_string($value)) {
                            if (!mb_check_encoding($value, 'UTF-8')) {
                                $value = mb_convert_encoding($value, 'UTF-8', 'ISO-8859-1');
                                if (!mb_check_encoding($value, 'UTF-8')) {
                                    $value = mb_convert_encoding($value, 'UTF-8', 'Windows-1252');
                                }
                                if (!mb_check_encoding($value, 'UTF-8')) {
                                    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value);
                                }
                            }
                        }
                        return $value;
                    };
                    
                    // Obtener productos del pedido - contar productos distintos y suma de cantidades
                    $sql_products = "SELECT COUNT(DISTINCT id_producto) as productos_distintos, SUM(cantidad_producto) as total_cantidad 
                                     FROM pedidos_productos WHERE id_pedido = ?";
                    $stmt_products = $conn->prepare($sql_products);
                    $items_count = 0;
                    $items_total = 0;
                    if ($stmt_products) {
                        $stmt_products->bind_param('i', $pedido_id);
                        $stmt_products->execute();
                        $result_products = $stmt_products->get_result();
                        if ($result_products && $result_products->num_rows > 0) {
                            $prod_data = $result_products->fetch_assoc();
                            $items_count = (int)($prod_data['productos_distintos'] ?? 0);
                            $items_total = (int)($prod_data['total_cantidad'] ?? 0);
                        }
                        $stmt_products->close();
                    }
                    
                    $orders[] = [
                        'id' => 'ORD-' . str_pad($row['id_pedido'], 3, '0', STR_PAD_LEFT),
                        'id_pedido' => $row['id_pedido'],
                        'customerName' => $cleanString($row['customerName']),
                        'address' => $cleanString($row['address']),
                        'status' => $row['status'],
                        'paymentType' => $row['paymentType'],
                        'price' => (float)$row['price'],
                        'fecha_pedido' => $row['fecha_pedido'],
                        'pago_confirmado' => (bool)$row['pago_confirmado'],
                        'repartidorNombre' => $cleanString($row['repartidorNombre']),
                        'items_count' => $items_count,
                        'items_total' => $items_total,
                        'coordinates' => [
                            'lat' => (float)$row['lat'],
                            'lng' => (float)$row['lng']
                        ],
                        'branch' => [
                            'id' => $sucursal_id,
                            'name' => $cleanString($row['branchName']),
                            'coordinates' => isset($branch_coordinates[$sucursal_id]) 
                                             ? $branch_coordinates[$sucursal_id] 
                                             : null
                        ]
                    ];
                }
                
                $json_output = json_encode($orders, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                
                if ($json_output === false) {
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'Error al generar JSON: ' . json_last_error_msg()]);
                    exit;
                }
                
                echo $json_output;
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Ocurrió un error al procesar su solicitud: ' . $conn->error]);
            }
        }
        break;
    case 'POST':
        // Admin, vendedor y cliente pueden crear pedidos
        $can_manage_all_orders = verifyRole(['admin', 'vendedor']);
        if (!$can_manage_all_orders && !verifyRole(['cliente'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'No tiene permisos para crear pedidos.']);
            exit;
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validar datos requeridos
        $usuario_id = $current_user['id_usuario'];
        if ($can_manage_all_orders && isset($data['usuario_id']) && is_numeric($data['usuario_id'])) {
            $usuario_id = (int)$data['usuario_id'];
        }
        $sucursal_id = $data['sucursal_id'] ?? null;
        $direccion_id = $data['direccion_id'] ?? null;
        $productos = $data['productos'] ?? [];
        if (empty($productos) && isset($data['items']) && is_array($data['items'])) {
            foreach ($data['items'] as $item) {
                $productos[] = [
                    'id_producto' => $item['id_producto'] ?? $item['id'] ?? $item['productId'] ?? null,
                    'cantidad' => $item['cantidad'] ?? $item['qty'] ?? $item['quantity'] ?? 0,
                    'precio' => $item['precio'] ?? $item['price'] ?? 0
                ];
            }
        }
        $metodo_pago = $data['metodo_pago'] ?? $data['paymentMethod'] ?? 'efectivo';
        $total = $data['total'] ?? ($data['monto_total'] ?? 0);
        $descuento = $data['descuento'] ?? 0;
        $promocion_id = $data['promocion_id'] ?? null;
        
        // Validaciones
        if (empty($productos) || !is_array($productos) || count($productos) === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Debe incluir al menos un producto en el pedido.']);
            exit;
        }
        
        if ($total <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El total del pedido debe ser mayor a 0.']);
            exit;
        }
        
        if (!isValidPaymentMethod($metodo_pago, $valid_payment_methods)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Método de pago no válido.']);
            exit;
        }
        
        // Validar sucursal
        if ($sucursal_id === null) {
            // Obtener la primera sucursal activa si no se proporciona
            $sql_sucursal = "SELECT id_sucursal FROM sucursales WHERE activa = 1 LIMIT 1";
            $result_sucursal = $conn->query($sql_sucursal);
            if ($result_sucursal && $result_sucursal->num_rows > 0) {
                $sucursal = $result_sucursal->fetch_assoc();
                $sucursal_id = $sucursal['id_sucursal'];
            } else {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No hay sucursales activas disponibles.']);
                exit;
            }
        } else {
            // Verificar que la sucursal existe y está activa
            $sql_check = "SELECT id_sucursal, activa FROM sucursales WHERE id_sucursal = ?";
            $stmt_check = $conn->prepare($sql_check);
            $stmt_check->bind_param('i', $sucursal_id);
            $stmt_check->execute();
            $result_check = $stmt_check->get_result();
            if ($result_check->num_rows === 0) {
                $stmt_check->close();
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Sucursal no encontrada.']);
                exit;
            }
            $sucursal_data = $result_check->fetch_assoc();
            if (!$sucursal_data['activa']) {
                $stmt_check->close();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'La sucursal no está activa.']);
                exit;
            }
            $stmt_check->close();
        }
        
        // Validar dirección o crear una temporal
        if ($direccion_id === null) {
            // Crear dirección temporal si no se proporciona
            $direccion_temp = $data['direccion'] ?? 'Dirección no especificada';
            $lat = $data['lat'] ?? -16.507;
            $lng = $data['lng'] ?? -68.127;
            
            $sql_dir = "INSERT INTO direcciones_entrega (usuario_id, direccion, latitud, longitud) VALUES (?, ?, ?, ?)";
            $stmt_dir = $conn->prepare($sql_dir);
            $stmt_dir->bind_param('isdd', $usuario_id, $direccion_temp, $lat, $lng);
            if ($stmt_dir->execute()) {
                $direccion_id = $conn->insert_id;
            } else {
                $stmt_dir->close();
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error al crear la dirección: ' . $stmt_dir->error]);
                exit;
            }
            $stmt_dir->close();
        }
        
        // Validar productos y calcular total
        $total_calculado = 0;
        foreach ($productos as $producto) {
            $id_producto = $producto['id_producto'] ?? $producto['id'] ?? null;
            $cantidad = $producto['cantidad'] ?? $producto['qty'] ?? 0;
            $precio_u = $producto['precio'] ?? 0;
            
            if (!$id_producto || $cantidad <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Datos de producto inválidos.']);
                exit;
            }
            
            // Verificar que el producto existe y está activo
            $sql_prod = "SELECT id_producto, precio, stock_disponible, activa FROM productos WHERE id_producto = ?";
            $stmt_prod = $conn->prepare($sql_prod);
            $stmt_prod->bind_param('i', $id_producto);
            $stmt_prod->execute();
            $result_prod = $stmt_prod->get_result();
            
            if ($result_prod->num_rows === 0) {
                $stmt_prod->close();
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Producto no encontrado: ID ' . $id_producto]);
                exit;
            }
            
            $prod_data = $result_prod->fetch_assoc();
            if (!$prod_data['activa']) {
                $stmt_prod->close();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'El producto no está disponible.']);
                exit;
            }
            
            // Usar el precio de la BD si no se proporciona
            if ($precio_u <= 0) {
                $precio_u = $prod_data['precio'];
            }
            
            $total_calculado += $precio_u * $cantidad;
            $stmt_prod->close();
        }
        
        // Aplicar descuento si existe
        $total_final = $total_calculado - $descuento;
        if ($total_final < 0) {
            $total_final = 0;
        }
        
        // Si se proporcionó un total, validar que sea razonable (con margen de error del 5%)
        if ($total > 0 && abs($total - $total_final) > ($total_final * 0.05)) {
            // Usar el total calculado en lugar del proporcionado
            $total = $total_final;
        } else if ($total <= 0) {
            $total = $total_final;
        }
        
        // Iniciar transacción
        $conn->begin_transaction();
        
        try {
            // Crear el pedido - usar NOW() para guardar fecha y hora exacta
            $sql_pedido = "INSERT INTO pedidos (usuario_id, sucursal_id, direccion_id, fecha_pedido, estado, total, metodo_pago, pago_confirmado) VALUES (?, ?, ?, NOW(), 'pending', ?, ?, ?)";
            $stmt_pedido = $conn->prepare($sql_pedido);
            $pago_confirmado = ($metodo_pago === 'efectivo' || $metodo_pago === 'transferencia') ? 1 : 0;
            $stmt_pedido->bind_param('iiidsi', $usuario_id, $sucursal_id, $direccion_id, $total, $metodo_pago, $pago_confirmado);
            
            if (!$stmt_pedido->execute()) {
                throw new Exception('Error al crear el pedido: ' . $stmt_pedido->error);
            }
            
            $id_pedido = $conn->insert_id;
            $stmt_pedido->close();
            
            // Insertar productos del pedido
            $sql_prod_pedido = "INSERT INTO pedidos_productos (id_pedido, id_producto, cantidad_producto, precio_u) VALUES (?, ?, ?, ?)";
            $stmt_prod_pedido = $conn->prepare($sql_prod_pedido);
            
            foreach ($productos as $producto) {
                $id_producto = $producto['id_producto'] ?? $producto['id'] ?? null;
                $cantidad = $producto['cantidad'] ?? $producto['qty'] ?? 0;
                $precio_u = $producto['precio'] ?? 0;
                
                // Obtener precio real de la BD
                $sql_precio = "SELECT precio FROM productos WHERE id_producto = ?";
                $stmt_precio = $conn->prepare($sql_precio);
                $stmt_precio->bind_param('i', $id_producto);
                $stmt_precio->execute();
                $result_precio = $stmt_precio->get_result();
                if ($result_precio->num_rows > 0) {
                    $precio_data = $result_precio->fetch_assoc();
                    $precio_u = $precio_data['precio'];
                }
                $stmt_precio->close();
                
                $stmt_prod_pedido->bind_param('iiid', $id_pedido, $id_producto, $cantidad, $precio_u);
                if (!$stmt_prod_pedido->execute()) {
                    throw new Exception('Error al agregar producto al pedido: ' . $stmt_prod_pedido->error);
                }
            }
            
            $stmt_prod_pedido->close();
            
            // Confirmar transacción
            $conn->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Pedido creado exitosamente.',
                'orderId' => 'ORD-' . str_pad($id_pedido, 3, '0', STR_PAD_LEFT),
                'id_pedido' => $id_pedido
            ]);
            
        } catch (Exception $e) {
            // Revertir transacción en caso de error
            $conn->rollback();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;
    case 'PUT':
        // Admin, vendedor y repartidor pueden modificar pedidos
        // Los repartidores solo pueden actualizar el estado de pedidos asignados a ellos
        $current_user = requireAuth(['admin', 'vendedor', 'repartidor']);
        $is_repartidor = (strtolower($current_user['rol_nombre']) === 'repartidor');
        
        $data = json_decode(file_get_contents('php://input'), true);
        $id_pedido = $data['id_pedido'] ?? '';
        $estado = $data['estado'] ?? '';
        $repartidor_id = $data['repartidor_id'] ?? null;
        $pago_confirmado = $data['pago_confirmado'] ?? null;
        
        // Si es repartidor, obtener su ID de repartidor desde la tabla repartidores
        $current_repartidor_id = null;
        if ($is_repartidor) {
            // Buscar repartidor por nombre o email del usuario (búsqueda flexible, case-insensitive)
            // Primero intentar búsqueda exacta
            $sql_find_repartidor = "SELECT id_repartidor FROM repartidores 
                                    WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) 
                                       OR LOWER(TRIM(correo_electronico)) = LOWER(TRIM(?)) 
                                    LIMIT 1";
            $stmt_find = $conn->prepare($sql_find_repartidor);
            $user_nombre = trim($current_user['nombre']);
            $user_email = trim($current_user['correo_electronico']);
            $stmt_find->bind_param('ss', $user_nombre, $user_email);
            $stmt_find->execute();
            $result_find = $stmt_find->get_result();
            if ($result_find->num_rows > 0) {
                $repartidor_data = $result_find->fetch_assoc();
                $current_repartidor_id = $repartidor_data['id_repartidor'];
            }
            $stmt_find->close();
            
            // Si no se encontró con búsqueda exacta, intentar búsqueda parcial por nombre
            if (!$current_repartidor_id && !empty($user_nombre)) {
                $sql_find_repartidor_partial = "SELECT id_repartidor FROM repartidores 
                                                 WHERE LOWER(TRIM(nombre)) LIKE LOWER(TRIM(?)) 
                                                    OR LOWER(TRIM(correo_electronico)) LIKE LOWER(TRIM(?))
                                                 LIMIT 1";
                $stmt_find_partial = $conn->prepare($sql_find_repartidor_partial);
                $nombre_like = '%' . $user_nombre . '%';
                $email_like = '%' . $user_email . '%';
                $stmt_find_partial->bind_param('ss', $nombre_like, $email_like);
                $stmt_find_partial->execute();
                $result_find_partial = $stmt_find_partial->get_result();
                if ($result_find_partial->num_rows > 0) {
                    $repartidor_data = $result_find_partial->fetch_assoc();
                    $current_repartidor_id = $repartidor_data['id_repartidor'];
                }
                $stmt_find_partial->close();
            }
            
            // Si aún no se encontró, crear automáticamente el registro de repartidor
            if (!$current_repartidor_id) {
                // Crear registro de repartidor automáticamente basado en el usuario
                $sql_create_repartidor = "INSERT INTO repartidores (nombre, correo_electronico, estado, fecha_inicio_trabajo) 
                                          VALUES (?, ?, 'disponible', CURDATE())";
                $stmt_create = $conn->prepare($sql_create_repartidor);
                $stmt_create->bind_param('ss', $user_nombre, $user_email);
                
                if ($stmt_create->execute()) {
                    $current_repartidor_id = $conn->insert_id;
                } else {
                    // Si falla la creación, intentar obtener el último registro con el mismo nombre/email
                    // (por si acaso se creó en otro proceso)
                    $sql_find_last = "SELECT id_repartidor FROM repartidores 
                                      WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) 
                                         OR LOWER(TRIM(correo_electronico)) = LOWER(TRIM(?)) 
                                      ORDER BY id_repartidor DESC LIMIT 1";
                    $stmt_find_last = $conn->prepare($sql_find_last);
                    $stmt_find_last->bind_param('ss', $user_nombre, $user_email);
                    $stmt_find_last->execute();
                    $result_find_last = $stmt_find_last->get_result();
                    if ($result_find_last->num_rows > 0) {
                        $repartidor_data = $result_find_last->fetch_assoc();
                        $current_repartidor_id = $repartidor_data['id_repartidor'];
                    }
                    $stmt_find_last->close();
                }
                $stmt_create->close();
            }
            
            if (!$current_repartidor_id) {
                http_response_code(403);
                echo json_encode([
                    'success' => false, 
                    'message' => 'No se pudo encontrar o crear tu registro como repartidor. Contacta al administrador.',
                    'debug' => [
                        'user_nombre' => $user_nombre,
                        'user_email' => $user_email
                    ]
                ]);
                exit;
            }
        }

        // Validar ID de pedido
        if (empty($id_pedido) || !is_numeric($id_pedido)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID de pedido es requerido y debe ser numérico.']);
            exit;
        }
        
        $id_pedido = (int)$id_pedido;

        // Obtener información actual del pedido
        $sql_current_order = "SELECT repartidor_id, estado FROM pedidos WHERE id_pedido = ?";
        $stmt_current_order = $conn->prepare($sql_current_order);
        if (!$stmt_current_order) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al preparar la consulta de pedido actual: ' . $conn->error]);
            exit;
        }
        $stmt_current_order->bind_param('i', $id_pedido);
        $stmt_current_order->execute();
        $result_current_order = $stmt_current_order->get_result();
        if ($result_current_order->num_rows === 0) {
            $stmt_current_order->close();
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Pedido no encontrado.']);
            exit;
        }
        $current_order = $result_current_order->fetch_assoc();
        $stmt_current_order->close();
        
        $previous_repartidor_id = $current_order['repartidor_id'] ?? null;
        $previous_estado = $current_order['estado'] ?? null;
        
        // Prevenir modificaciones de pedidos entregados (completed)
        if ($previous_estado === 'completed') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'No se pueden modificar pedidos que ya han sido entregados.']);
            exit;
        }

        $updates = [];
        $params = [];
        $types = '';

        // Validar estado si se proporciona
        if (!empty($estado)) {
            if (!isValidState($estado, $valid_states)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Estado no válido. Estados permitidos: ' . implode(', ', $valid_states)]);
                exit;
            }
            $updates[] = "estado = ?";
            $params[] = $estado;
            $types .= 's';
        }

        // Validar repartidor si se asigna
        if ($repartidor_id !== null) {
            if (!is_numeric($repartidor_id)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID de repartidor debe ser numérico.']);
                exit;
            }
            
            $repartidor_id = (int)$repartidor_id;
            
            // Verificar que el repartidor existe y está disponible
            $sql_check_delivery = "SELECT id_repartidor, estado FROM repartidores WHERE id_repartidor = ?";
            $stmt_check = $conn->prepare($sql_check_delivery);
            $stmt_check->bind_param('i', $repartidor_id);
            $stmt_check->execute();
            $result_check = $stmt_check->get_result();
            
            if ($result_check->num_rows === 0) {
                $stmt_check->close();
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Repartidor no encontrado.']);
                exit;
            }
            
            $delivery = $result_check->fetch_assoc();
            if ($delivery['estado'] !== 'disponible') {
                $stmt_check->close();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'El repartidor no está disponible.']);
                exit;
            }
            
            $stmt_check->close();
            
            $updates[] = "repartidor_id = ?";
            $params[] = $repartidor_id;
            $types .= 'i';
        }

        if ($pago_confirmado !== null) {
            $updates[] = "pago_confirmado = ?";
            $params[] = $pago_confirmado ? 1 : 0;
            $types .= 'i';
        }

        // Si es repartidor y está cambiando el estado, verificar/auto-asignar
        if ($is_repartidor && !empty($estado)) {
            // Verificar si el pedido ya tiene un repartidor asignado
            $sql_check_pedido = "SELECT repartidor_id FROM pedidos WHERE id_pedido = ?";
            $stmt_check_pedido = $conn->prepare($sql_check_pedido);
            $stmt_check_pedido->bind_param('i', $id_pedido);
            $stmt_check_pedido->execute();
            $result_check_pedido = $stmt_check_pedido->get_result();
            
            if ($result_check_pedido->num_rows === 0) {
                $stmt_check_pedido->close();
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Pedido no encontrado.']);
                exit;
            }
            
            $pedido_data = $result_check_pedido->fetch_assoc();
            $stmt_check_pedido->close();
            
            // Si no tiene repartidor asignado, auto-asignarse
            if (!$pedido_data['repartidor_id']) {
                $updates[] = "repartidor_id = ?";
                $params[] = $current_repartidor_id;
                $types .= 'i';
            } else if ($pedido_data['repartidor_id'] != $current_repartidor_id) {
                // Si el pedido está asignado a otro repartidor, no permitir cambios
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Este pedido está asignado a otro repartidor.']);
                exit;
            }
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No hay campos para actualizar.']);
            exit;
        }
        
        $params[] = $id_pedido;
        $types .= 'i';

        $sql = "UPDATE pedidos SET " . implode(', ', $updates) . " WHERE id_pedido = ?";
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al preparar la consulta: ' . $conn->error]);
            exit;
        }
        
        $stmt->bind_param($types, ...$params);

        $release_states = ['completed', 'cancelled'];
        $should_mark_occupied = false;
        $should_release_previous = false;
        $should_release_current = false;

        // Si se asigna un repartidor (nuevo o diferente), marcarlo como ocupado
        if ($repartidor_id !== null) {
            // Si es un repartidor diferente al anterior, o si es la primera asignación
            if ($repartidor_id != $previous_repartidor_id) {
                $should_mark_occupied = true;
                // Si había un repartidor anterior, liberarlo
                if (!empty($previous_repartidor_id)) {
                    $should_release_previous = true;
                }
            }
        }

        // Si el pedido se completa o cancela, liberar al repartidor
        if (!empty($estado) && in_array($estado, $release_states, true)) {
            $should_release_current = true;
        }

        $conn->begin_transaction();
        try {
            if (!$stmt->execute()) {
                throw new Exception('Error al actualizar el pedido: ' . $stmt->error);
            }

            if ($stmt->affected_rows > 0) {
                // Actualizar estado del nuevo repartidor a ocupado
                if ($should_mark_occupied) {
                    $stmt_mark_busy = $conn->prepare("UPDATE repartidores SET estado = 'ocupado' WHERE id_repartidor = ?");
                    if ($stmt_mark_busy) {
                        $stmt_mark_busy->bind_param('i', $repartidor_id);
                        if (!$stmt_mark_busy->execute()) {
                            throw new Exception('No se pudo marcar al repartidor como ocupado: ' . $stmt_mark_busy->error);
                        }
                        $stmt_mark_busy->close();
                    } else {
                        throw new Exception('Error al preparar actualización de repartidor: ' . $conn->error);
                    }
                }

                // Liberar estado del repartidor anterior si cambió
                if ($should_release_previous) {
                    $stmt_release_prev = $conn->prepare("UPDATE repartidores SET estado = 'disponible' WHERE id_repartidor = ?");
                    if ($stmt_release_prev) {
                        $stmt_release_prev->bind_param('i', $previous_repartidor_id);
                        if (!$stmt_release_prev->execute()) {
                            throw new Exception('No se pudo marcar al repartidor anterior como disponible: ' . $stmt_release_prev->error);
                        }
                        $stmt_release_prev->close();
                    } else {
                        throw new Exception('Error al preparar liberación de repartidor anterior: ' . $conn->error);
                    }
                }

                // Liberar repartidor cuando el pedido se completa o cancela
                if ($should_release_current) {
                    $repartidor_a_liberar = $repartidor_id ?? $previous_repartidor_id;
                    if (!empty($repartidor_a_liberar)) {
                        $stmt_release_current = $conn->prepare("UPDATE repartidores SET estado = 'disponible' WHERE id_repartidor = ?");
                        if ($stmt_release_current) {
                            $stmt_release_current->bind_param('i', $repartidor_a_liberar);
                            if (!$stmt_release_current->execute()) {
                                throw new Exception('No se pudo marcar al repartidor como disponible tras completar/cancelar el pedido: ' . $stmt_release_current->error);
                            }
                            $stmt_release_current->close();
                        } else {
                            throw new Exception('Error al preparar liberación de repartidor: ' . $conn->error);
                        }
                    }
                }

                $conn->commit();
                echo json_encode(['success' => true, 'message' => 'Pedido actualizado exitosamente.']);
            } else {
                $conn->commit();
                echo json_encode(['success' => false, 'message' => 'Pedido no encontrado o sin cambios.']);
            }
        } catch (Exception $e) {
            $conn->rollback();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        $stmt->close();
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
        break;
}

$conn->close();
?>