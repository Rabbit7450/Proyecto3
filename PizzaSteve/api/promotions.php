<?php
// api/promotions.php (Promociones)
require_once '../config/environment.php';
require_once '../config/database.php';
require_once '../config/security.php';
require_once '../config/security_headers.php';
require_once 'auth_middleware.php';

setSecurityHeaders();
header('Content-Type: application/json');

// Verificar autenticación para todas las operaciones
// GET es público para ver promociones activas, POST/PUT/DELETE requieren admin
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$current_user = null;

if ($method === 'GET') {
    // GET es público - no requiere autenticación para ver promociones
    $current_user = verifySession(); // Verificar si hay sesión pero no requerirla
} else {
    // POST, PUT, DELETE requieren admin
    $current_user = requireAuth(['admin']);
}

switch ($method) {
    case 'GET':
        if ($id) {
            $sql = "SELECT p.*, s.nombre as sucursal_nombre FROM promociones p LEFT JOIN sucursales s ON p.sucursal_id = s.id_sucursal WHERE p.id_promocion = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('i', $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $promotion = $result->fetch_assoc();
            if ($promotion) {
                // Asegurar que activa sea un entero
                $promotion['activa'] = (int)$promotion['activa'];
            }
            echo json_encode($promotion);
            $stmt->close();
        } else {
            $sql = "SELECT p.*, s.nombre as sucursal_nombre FROM promociones p LEFT JOIN sucursales s ON p.sucursal_id = s.id_sucursal ORDER BY p.fecha_inicio DESC";
            $result = $conn->query($sql);
            
            if ($result === false) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error en la consulta SQL: ' . $conn->error]);
                exit;
            }
            
            $promotions = [];
            $today = date('Y-m-d');
            while ($row = $result->fetch_assoc()) {
                // Limpiar y convertir a UTF-8
                $cleaned_row = [];
                foreach ($row as $key => $value) {
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
                        $cleaned_row[$key] = $value;
                    } else {
                        $cleaned_row[$key] = $value;
                    }
                }
                
                // Asegurar que activa sea un entero
                $cleaned_row['activa'] = (int)$cleaned_row['activa'];
                // Verificar si la promoción está vencida por fecha
                $fecha_fin = $cleaned_row['fecha_fin'];
                $isExpired = $fecha_fin < $today;
                // Solo incluir promociones activas y no vencidas
                if ($cleaned_row['activa'] == 1 && !$isExpired) {
                    $promotions[] = $cleaned_row;
                }
            }
            
            $json_output = json_encode($promotions, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            
            if ($json_output === false) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error al generar JSON: ' . json_last_error_msg()]);
                exit;
            }
            
            echo $json_output;
        }
        break;
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $descripcion = $data['descripcion'] ?? '';
        $fecha_inicio = $data['fecha_inicio'] ?? '';
        $fecha_fin = $data['fecha_fin'] ?? '';
        $porcentaje_descuento = $data['porcentaje_descuento'] ?? 0;
        $sucursal_id = $data['sucursal_id'] ?? null;
        $activa = $data['activa'] ?? 1;

        if (empty($descripcion) || empty($fecha_inicio) || empty($fecha_fin)) {
            echo json_encode(['success' => false, 'message' => 'Descripción, fecha de inicio y fecha de fin son requeridos.']);
            exit;
        }
        
        // Validar porcentaje de descuento
        if (empty($porcentaje_descuento) || !is_numeric($porcentaje_descuento)) {
            echo json_encode(['success' => false, 'message' => 'El porcentaje de descuento debe ser un número válido.']);
            exit;
        }
        
        if ($porcentaje_descuento < 0 || $porcentaje_descuento > 100) {
            echo json_encode(['success' => false, 'message' => 'El porcentaje de descuento debe estar entre 0 y 100.']);
            exit;
        }
        
        // Validar fechas
        $fecha_inicio_obj = DateTime::createFromFormat('Y-m-d', $fecha_inicio);
        $fecha_fin_obj = DateTime::createFromFormat('Y-m-d', $fecha_fin);
        
        if (!$fecha_inicio_obj || !$fecha_fin_obj) {
            echo json_encode(['success' => false, 'message' => 'Las fechas deben tener el formato YYYY-MM-DD.']);
            exit;
        }
        
        if ($fecha_inicio_obj > $fecha_fin_obj) {
            echo json_encode(['success' => false, 'message' => 'La fecha de inicio debe ser anterior a la fecha de fin.']);
            exit;
        }
        
        // Validar sucursal si se proporciona
        if ($sucursal_id !== null && $sucursal_id !== '') {
            if (!is_numeric($sucursal_id)) {
                echo json_encode(['success' => false, 'message' => 'ID de sucursal debe ser numérico.']);
                exit;
            }
            
            $sucursal_id = (int)$sucursal_id;
            $sql_check_branch = "SELECT id_sucursal, activa FROM sucursales WHERE id_sucursal = ?";
            $stmt_check = $conn->prepare($sql_check_branch);
            $stmt_check->bind_param('i', $sucursal_id);
            $stmt_check->execute();
            $result_check = $stmt_check->get_result();
            
            if ($result_check->num_rows === 0) {
                $stmt_check->close();
                echo json_encode(['success' => false, 'message' => 'Sucursal no encontrada.']);
                exit;
            }
            
            $branch = $result_check->fetch_assoc();
            if (!$branch['activa']) {
                $stmt_check->close();
                echo json_encode(['success' => false, 'message' => 'La sucursal no está activa.']);
                exit;
            }
            
            $stmt_check->close();
        } else {
            $sucursal_id = null;
        }

        if ($sucursal_id) {
            $sql = "INSERT INTO promociones (descripcion, fecha_inicio, fecha_fin, porcentaje_descuento, sucursal_id, activa) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('sssdis', $descripcion, $fecha_inicio, $fecha_fin, $porcentaje_descuento, $sucursal_id, $activa);
        } else {
            $sql = "INSERT INTO promociones (descripcion, fecha_inicio, fecha_fin, porcentaje_descuento, activa) VALUES (?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('sssdi', $descripcion, $fecha_inicio, $fecha_fin, $porcentaje_descuento, $activa);
        }
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Promoción agregada exitosamente.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al agregar la promoción: ' . $stmt->error]);
        }
        $stmt->close();
        break;
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? '';
        $descripcion = $data['descripcion'] ?? '';
        $fecha_inicio = $data['fecha_inicio'] ?? '';
        $fecha_fin = $data['fecha_fin'] ?? '';
        $porcentaje_descuento = $data['porcentaje_descuento'] ?? 0;
        $sucursal_id = $data['sucursal_id'] ?? null;
        $activa = $data['activa'] ?? 1;

        if (empty($id) || !is_numeric($id)) {
            echo json_encode(['success' => false, 'message' => 'ID es requerido y debe ser numérico.']);
            exit;
        }
        
        if (empty($descripcion) || empty($fecha_inicio) || empty($fecha_fin)) {
            echo json_encode(['success' => false, 'message' => 'Descripción, fecha de inicio y fecha de fin son requeridos.']);
            exit;
        }
        
        // Validar porcentaje de descuento
        if (empty($porcentaje_descuento) || !is_numeric($porcentaje_descuento)) {
            echo json_encode(['success' => false, 'message' => 'El porcentaje de descuento debe ser un número válido.']);
            exit;
        }
        
        if ($porcentaje_descuento < 0 || $porcentaje_descuento > 100) {
            echo json_encode(['success' => false, 'message' => 'El porcentaje de descuento debe estar entre 0 y 100.']);
            exit;
        }
        
        // Validar fechas
        $fecha_inicio_obj = DateTime::createFromFormat('Y-m-d', $fecha_inicio);
        $fecha_fin_obj = DateTime::createFromFormat('Y-m-d', $fecha_fin);
        
        if (!$fecha_inicio_obj || !$fecha_fin_obj) {
            echo json_encode(['success' => false, 'message' => 'Las fechas deben tener el formato YYYY-MM-DD.']);
            exit;
        }
        
        if ($fecha_inicio_obj > $fecha_fin_obj) {
            echo json_encode(['success' => false, 'message' => 'La fecha de inicio debe ser anterior a la fecha de fin.']);
            exit;
        }
        
        // Validar sucursal si se proporciona
        if ($sucursal_id !== null && $sucursal_id !== '') {
            if (!is_numeric($sucursal_id)) {
                echo json_encode(['success' => false, 'message' => 'ID de sucursal debe ser numérico.']);
                exit;
            }
            
            $sucursal_id = (int)$sucursal_id;
            $sql_check_branch = "SELECT id_sucursal, activa FROM sucursales WHERE id_sucursal = ?";
            $stmt_check = $conn->prepare($sql_check_branch);
            $stmt_check->bind_param('i', $sucursal_id);
            $stmt_check->execute();
            $result_check = $stmt_check->get_result();
            
            if ($result_check->num_rows === 0) {
                $stmt_check->close();
                echo json_encode(['success' => false, 'message' => 'Sucursal no encontrada.']);
                exit;
            }
            
            $branch = $result_check->fetch_assoc();
            if (!$branch['activa']) {
                $stmt_check->close();
                echo json_encode(['success' => false, 'message' => 'La sucursal no está activa.']);
                exit;
            }
            
            $stmt_check->close();
        } else {
            $sucursal_id = null;
        }

        if ($sucursal_id) {
            $sql = "UPDATE promociones SET descripcion = ?, fecha_inicio = ?, fecha_fin = ?, porcentaje_descuento = ?, sucursal_id = ?, activa = ? WHERE id_promocion = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('sssdisi', $descripcion, $fecha_inicio, $fecha_fin, $porcentaje_descuento, $sucursal_id, $activa, $id);
        } else {
            $sql = "UPDATE promociones SET descripcion = ?, fecha_inicio = ?, fecha_fin = ?, porcentaje_descuento = ?, sucursal_id = NULL, activa = ? WHERE id_promocion = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('sssdii', $descripcion, $fecha_inicio, $fecha_fin, $porcentaje_descuento, $activa, $id);
        }

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(['success' => true, 'message' => 'Promoción actualizada exitosamente.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Promoción no encontrada o sin cambios.']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al actualizar la promoción: ' . $stmt->error]);
        }
        $stmt->close();
        break;
    case 'DELETE':
        $id = $_GET['id'] ?? '';

        if (empty($id)) {
            echo json_encode(['success' => false, 'message' => 'ID de promoción requerido.']);
            exit;
        }

        $sql = "UPDATE promociones SET activa = 0 WHERE id_promocion = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $id);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(['success' => true, 'message' => 'Promoción desactivada exitosamente.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Promoción no encontrada.']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al desactivar la promoción: ' . $stmt->error]);
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

