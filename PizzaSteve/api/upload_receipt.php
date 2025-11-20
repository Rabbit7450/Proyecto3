<?php
// api/upload_receipt.php
// Desactivar mostrar errores para evitar que se muestren antes del JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Iniciar buffer de salida para capturar cualquier error
ob_start();

try {
    require_once '../config/environment.php';
    require_once '../config/database.php';
    require_once '../config/security.php';
    require_once '../config/security_headers.php';
    require_once 'auth_middleware.php';

    setSecurityHeaders();
    header('Content-Type: application/json');

    // Verificar autenticación
    $current_user = requireAuth();
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de inicialización: ' . $e->getMessage()]);
    exit;
}

// Limpiar cualquier salida previa
ob_end_clean();

try {
// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit;
}

// Verificar que se haya subido un archivo
if (!isset($_FILES['receipt']) || $_FILES['receipt']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No se recibió ningún archivo o hubo un error en la subida.']);
    exit;
}

// Obtener el ID del pedido
$orderId = $_POST['orderId'] ?? null;
if (!$orderId || !is_numeric($orderId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID de pedido inválido.']);
    exit;
}

$orderId = (int)$orderId;

// Obtener el tipo de comprobante (pago o entrega)
$tipoComprobante = $_POST['tipo'] ?? 'pago'; // Por defecto es comprobante de pago
if (!in_array($tipoComprobante, ['pago', 'entrega'])) {
    $tipoComprobante = 'pago'; // Por seguridad, si no es válido, usar 'pago'
}

// Verificar que el pedido existe y pertenece al usuario (o es admin/vendedor)
$sql_check = "SELECT id_pedido, usuario_id FROM pedidos WHERE id_pedido = ?";
$stmt_check = $conn->prepare($sql_check);
$stmt_check->bind_param('i', $orderId);
$stmt_check->execute();
$result_check = $stmt_check->get_result();

if ($result_check->num_rows === 0) {
    $stmt_check->close();
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Pedido no encontrado.']);
    exit;
}

$order_data = $result_check->fetch_assoc();
$stmt_check->close();

// Verificar permisos: el usuario debe ser el dueño del pedido, admin o vendedor
$can_manage_all_orders = verifyRole(['admin', 'vendedor']);
if (!$can_manage_all_orders && $order_data['usuario_id'] != $current_user['id_usuario']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'No tienes permisos para subir comprobantes de este pedido.']);
    exit;
}

// Validar el archivo
$file = $_FILES['receipt'];
$allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
$max_size = 5 * 1024 * 1024; // 5MB

if (!in_array($file['type'], $allowed_types)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, WEBP) y PDF.']);
    exit;
}

if ($file['size'] > $max_size) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El archivo es demasiado grande. El tamaño máximo es 5MB.']);
    exit;
}

// Crear directorio de comprobantes si no existe
$uploads_dir = '../uploads/receipts/';
if (!file_exists($uploads_dir)) {
    if (!mkdir($uploads_dir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al crear el directorio de almacenamiento.']);
        exit;
    }
}

// Generar nombre único para el archivo
$file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$file_name = 'receipt_' . $orderId . '_' . time() . '_' . uniqid() . '.' . $file_extension;
$file_path = $uploads_dir . $file_name;

// Mover el archivo subido
if (!move_uploaded_file($file['tmp_name'], $file_path)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar el archivo.']);
    exit;
}

// Verificar si ya existe un comprobante del mismo tipo para este pedido
// Primero verificar si la tabla existe
try {
    $sql_check_receipt = "SELECT id_comprobante FROM comprobantes_pago WHERE id_pedido = ? AND tipo_comprobante = ?";
    $stmt_check_receipt = $conn->prepare($sql_check_receipt);
    if (!$stmt_check_receipt) {
        throw new Exception('Error al preparar consulta: ' . $conn->error);
    }
    $stmt_check_receipt->bind_param('is', $orderId, $tipoComprobante);
    $stmt_check_receipt->execute();
    $result_check_receipt = $stmt_check_receipt->get_result();
    $existing_receipt = $result_check_receipt->fetch_assoc();
    $stmt_check_receipt->close();
} catch (Exception $e) {
    // Si la tabla no existe o hay error, crear el registro como nuevo
    $existing_receipt = null;
    if (strpos($e->getMessage(), "doesn't exist") !== false || strpos($e->getMessage(), "no existe") !== false || strpos($e->getMessage(), "Unknown column 'tipo_comprobante'") !== false) {
        // Si la columna no existe, intentar sin el filtro de tipo
        try {
            $sql_check_receipt_fallback = "SELECT id_comprobante FROM comprobantes_pago WHERE id_pedido = ?";
            $stmt_check_fallback = $conn->prepare($sql_check_receipt_fallback);
            if ($stmt_check_fallback) {
                $stmt_check_fallback->bind_param('i', $orderId);
                $stmt_check_fallback->execute();
                $result_fallback = $stmt_check_fallback->get_result();
                $existing_receipt = $result_fallback->fetch_assoc();
                $stmt_check_fallback->close();
            }
        } catch (Exception $e2) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'La tabla de comprobantes no existe. Por favor, ejecuta el script SQL para crearla.']);
            $conn->close();
            exit;
        }
    }
}

// Si ya existe, actualizar; si no, insertar
if ($existing_receipt) {
    // Eliminar el archivo anterior si existe
    $sql_get_old = "SELECT ruta_archivo FROM comprobantes_pago WHERE id_comprobante = ?";
    $stmt_get_old = $conn->prepare($sql_get_old);
    $stmt_get_old->bind_param('i', $existing_receipt['id_comprobante']);
    $stmt_get_old->execute();
    $result_get_old = $stmt_get_old->get_result();
    if ($old_data = $result_get_old->fetch_assoc()) {
        $old_file_path = '../' . $old_data['ruta_archivo'];
        if (file_exists($old_file_path)) {
            @unlink($old_file_path);
        }
    }
    $stmt_get_old->close();
    
    // Actualizar registro existente
    $sql_update = "UPDATE comprobantes_pago SET ruta_archivo = ?, fecha_subida = NOW(), tipo_archivo = ?, tamano_archivo = ?, tipo_comprobante = ? WHERE id_pedido = ? AND tipo_comprobante = ?";
    $stmt_update = $conn->prepare($sql_update);
    $relative_path = 'uploads/receipts/' . $file_name;
    $stmt_update->bind_param('ssisss', $relative_path, $file['type'], $file['size'], $tipoComprobante, $orderId, $tipoComprobante);
    
    if ($stmt_update->execute()) {
        $stmt_update->close();
        echo json_encode([
            'success' => true,
            'message' => 'Comprobante actualizado exitosamente.',
            'file_path' => $relative_path
        ]);
    } else {
        $stmt_update->close();
        @unlink($file_path); // Eliminar archivo si falla la actualización
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al actualizar el comprobante en la base de datos.']);
    }
} else {
    // Insertar nuevo registro
    $sql_insert = "INSERT INTO comprobantes_pago (id_pedido, ruta_archivo, fecha_subida, tipo_archivo, tamano_archivo, tipo_comprobante) VALUES (?, ?, NOW(), ?, ?, ?)";
    $stmt_insert = $conn->prepare($sql_insert);
    $relative_path = 'uploads/receipts/' . $file_name;
    $stmt_insert->bind_param('issis', $orderId, $relative_path, $file['type'], $file['size'], $tipoComprobante);
    
    if ($stmt_insert->execute()) {
        $stmt_insert->close();
        echo json_encode([
            'success' => true,
            'message' => 'Comprobante subido exitosamente.',
            'file_path' => $relative_path
        ]);
    } else {
        $stmt_insert->close();
        @unlink($file_path); // Eliminar archivo si falla la inserción
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al guardar el comprobante en la base de datos.']);
    }
}

} catch (Exception $e) {
    // Capturar cualquier error no manejado
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error inesperado: ' . $e->getMessage()]);
}

if (isset($conn)) {
    $conn->close();
}
?>

