<?php
// api/users.php
require_once '../config/environment.php';
require_once '../config/database.php';
require_once '../config/security.php';
require_once '../config/security_headers.php';
require_once 'auth_middleware.php';

setSecurityHeaders();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        // GET es público para admin y vendedor (solo lectura)
        // Los vendedores solo pueden ver clientes (rol = 'cliente')
        $current_user = requireAuth(['admin', 'vendedor']);
        $is_vendedor = (strtolower($current_user['rol_nombre']) === 'vendedor');
        
        if ($id) {
            $sql = "SELECT u.id_usuario, u.nombre, u.correo_electronico, u.telefono, u.direccion, u.fecha_cumpleaños, u.rol_id, r.nombre as rol_nombre FROM usuarios u JOIN roles r ON u.rol_id = r.id_rol WHERE u.id_usuario = ?";
            if ($is_vendedor) {
                $sql .= " AND r.nombre = 'cliente'";
            }
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('i', $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            if ($user) {
                // Asegurar que activa sea un entero si existe
                if (isset($user['activa'])) {
                    $user['activa'] = (int)$user['activa'];
                }
            }
            echo json_encode($user);
            $stmt->close();
        } else {
            $sql = "SELECT u.id_usuario, u.nombre, u.correo_electronico, u.telefono, u.direccion, u.rol_id, r.nombre as rol_nombre, u.activa FROM usuarios u JOIN roles r ON u.rol_id = r.id_rol";
            if ($is_vendedor) {
                $sql .= " WHERE r.nombre = 'cliente'";
            }
            $sql .= " ORDER BY u.nombre";
            $result = $conn->query($sql);
            
            if ($result === false) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error en la consulta SQL: ' . $conn->error]);
                exit;
            }

            $users = [];
            while ($row = $result->fetch_assoc()) {
                // Asegurar que activa sea un entero
                $row['activa'] = (int)$row['activa'];
                $users[] = $row;
            }
            echo json_encode($users);
        }
        break;
    case 'POST':
        // POST solo para admin
        $current_user = requireAuth(['admin']);
        $data = json_decode(file_get_contents('php://input'), true);
        $nombre = $data['nombre'] ?? '';
        $password = $data['contrasena'] ?? '';
        $email = $data['correo_electronico'] ?? '';
        $telefono = $data['telefono'] ?? '';
        $direccion = $data['direccion'] ?? '';
        $fecha_cumpleaños = $data['fecha_cumpleaños'] ?? null;
        $rol_id = $data['rol_id'] ?? '';

        if (empty($nombre) || empty($password) || empty($email) || empty($rol_id)) {
            echo json_encode(['success' => false, 'message' => 'Nombre, email, contraseña y rol son requeridos.']);
            exit;
        }
        
        // Validar nombre (solo letras, espacios, acentos)
        if (!preg_match("/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/", $nombre) || strlen($nombre) < 2) {
            echo json_encode(['success' => false, 'message' => 'El nombre solo puede contener letras, espacios y acentos. Mínimo 2 caracteres.']);
            exit;
        }
        
        // Validar email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'El formato del email no es válido.']);
            exit;
        }
        
        // Validar teléfono si se proporciona
        if (!empty($telefono)) {
            $phoneDigits = preg_replace('/\D/', '', $telefono);
            if (strlen($phoneDigits) < 7 || strlen($phoneDigits) > 15) {
                echo json_encode(['success' => false, 'message' => 'El teléfono debe tener entre 7 y 15 dígitos.']);
                exit;
            }
        }
        
        // Validar contraseña
        if (strlen($password) < 6) {
            echo json_encode(['success' => false, 'message' => 'La contraseña debe tener al menos 6 caracteres.']);
            exit;
        }

        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        $sql = "INSERT INTO usuarios (nombre, contrasena, correo_electronico, telefono, direccion, fecha_cumpleaños, rol_id, fecha_creacion, activa) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), 1)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ssssssi', $nombre, $hashed_password, $email, $telefono, $direccion, $fecha_cumpleaños, $rol_id);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Usuario agregado exitosamente.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al agregar el usuario: ' . $stmt->error]);
        }
        $stmt->close();
        break;
    case 'PUT':
        // PUT solo para admin
        $current_user = requireAuth(['admin']);
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? '';
        $nombre = trim($data['nombre'] ?? '');
        $email = trim($data['correo_electronico'] ?? '');
        $telefono = trim($data['telefono'] ?? '');
        $direccion = trim($data['direccion'] ?? '');
        $fecha_cumpleaños = $data['fecha_cumpleaños'] ?? null;
        $rol_id = $data['rol_id'] ?? '';
        $password = $data['contrasena'] ?? '';
        $activa = isset($data['activa']) ? (int)$data['activa'] : null;

        if (empty($id) || empty($nombre) || empty($email) || empty($rol_id)) {
            echo json_encode(['success' => false, 'message' => 'ID, nombre, email y rol son requeridos.']);
            exit;
        }
        
        // Validar nombre (solo letras, espacios, acentos)
        if (!preg_match("/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/", $nombre) || strlen($nombre) < 2) {
            echo json_encode(['success' => false, 'message' => 'El nombre solo puede contener letras, espacios y acentos. Mínimo 2 caracteres.']);
            exit;
        }
        
        // Validar email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'El formato del email no es válido.']);
            exit;
        }
        
        // Validar teléfono si se proporciona
        if (!empty($telefono)) {
            $phoneDigits = preg_replace('/\D/', '', $telefono);
            if (strlen($phoneDigits) < 7 || strlen($phoneDigits) > 15) {
                echo json_encode(['success' => false, 'message' => 'El teléfono debe tener entre 7 y 15 dígitos.']);
                exit;
            }
        }
        
        // Validar contraseña si se proporciona
        if (!empty($password) && strlen($password) < 6) {
            echo json_encode(['success' => false, 'message' => 'La contraseña debe tener al menos 6 caracteres.']);
            exit;
        }

        $rol_id = (int)$rol_id;

        $fields = [
            'nombre = ?',
            'correo_electronico = ?',
            'telefono = ?',
            'direccion = ?',
            'fecha_cumpleaños = ?',
            'rol_id = ?'
        ];
        $params = [
            $nombre,
            $email,
            $telefono,
            $direccion,
            $fecha_cumpleaños,
            $rol_id
        ];
        $types = 'sssssi';

        if (!empty($password)) {
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $fields[] = 'contrasena = ?';
            $params[] = $hashed_password;
            $types .= 's';
        }

        if ($activa !== null) {
            $fields[] = 'activa = ?';
            $params[] = $activa;
            $types .= 'i';
        }

        $fieldsSql = implode(', ', $fields);
        $sql = "UPDATE usuarios SET $fieldsSql WHERE id_usuario = ?";
        $stmt = $conn->prepare($sql);

        $params[] = (int)$id;
        $types .= 'i';

        $bindParams = [];
        $bindParams[] = $types;
        foreach ($params as $key => $value) {
            $bindParams[] = &$params[$key];
        }

        call_user_func_array([$stmt, 'bind_param'], $bindParams);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(['success' => true, 'message' => 'Usuario actualizado exitosamente.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado o sin cambios.']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al actualizar el usuario: ' . $stmt->error]);
        }
        $stmt->close();
        break;
    case 'DELETE':
        // DELETE solo para admin
        $current_user = requireAuth(['admin']);
        if (empty($id) || !is_numeric($id)) {
            echo json_encode(['success' => false, 'message' => 'ID es requerido y debe ser numérico.']);
            exit;
        }
        
        $id = (int)$id;
        
        // Verificar que el usuario actual no se está desactivando a sí mismo
        if (!canModifyUser($id, $current_user['id_usuario'], 'deactivate')) {
            http_response_code(403);
            echo json_encode([
                'success' => false, 
                'message' => 'No puede desactivar su propia cuenta. Otro administrador debe hacerlo.'
            ]);
            exit;
        }
        
        // Verificar que el usuario objetivo existe
        $sql_check = "SELECT id_usuario, activa FROM usuarios WHERE id_usuario = ?";
        $stmt_check = $conn->prepare($sql_check);
        $stmt_check->bind_param('i', $id);
        $stmt_check->execute();
        $result_check = $stmt_check->get_result();
        
        if ($result_check->num_rows === 0) {
            $stmt_check->close();
            echo json_encode(['success' => false, 'message' => 'Usuario no encontrado.']);
            exit;
        }
        
        $target_user = $result_check->fetch_assoc();
        $stmt_check->close();
        
        // Soft delete: marcar como inactivo
        $sql = "UPDATE usuarios SET activa = 0 WHERE id_usuario = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $id);
        
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode([
                    'success' => true, 
                    'message' => 'Usuario desactivado exitosamente. Su sesión será invalidada en la próxima verificación.'
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado.']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al desactivar el usuario: ' . $stmt->error]);
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