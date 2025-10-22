<?php
// api/users.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../database/connect.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            $sql = "SELECT u.id_usuario, u.nombre as username, u.correo_electronico as email, r.nombre as role FROM usuarios u JOIN roles r ON u.rol_id = r.id_rol WHERE u.id_usuario = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('i', $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            echo json_encode($user);
        } else {
            $sql = "SELECT u.id_usuario, u.nombre as username, u.correo_electronico as email, r.nombre as role FROM usuarios u JOIN roles r ON u.rol_id = r.id_rol";
            $result = $conn->query($sql);
            
            if ($result === false) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error en la consulta SQL: ' . $conn->error]);
                exit;
            }

            $users = [];
            while ($row = $result->fetch_assoc()) {
                $users[] = $row;
            }
            echo json_encode($users);
        }
        break;
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';
        $email = $data['email'] ?? '';
        $role_name = $data['role'] ?? 'Cliente'; // Default to 'Cliente'

        if (empty($username) || empty($password) || empty($email)) {
            echo json_encode(['success' => false, 'message' => 'Todos los campos son requeridos.']);
            exit;
        }

        // Find role_id from role name
        $sql_role = "SELECT id_rol FROM roles WHERE nombre = ?";
        $stmt_role = $conn->prepare($sql_role);
        $stmt_role->bind_param('s', $role_name);
        $stmt_role->execute();
        $result_role = $stmt_role->get_result();
        if ($result_role->num_rows === 0) {
            echo json_encode(['success' => false, 'message' => 'Rol no válido.']);
            exit;
        }
        $role_id = $result_role->fetch_assoc()['id_rol'];
        $stmt_role->close();

        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        $sql = "INSERT INTO usuarios (nombre, contrasena, correo_electronico, rol_id, fecha_creacion, activa) VALUES (?, ?, ?, ?, CURDATE(), 1)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('sssi', $username, $hashed_password, $email, $role_id);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Usuario agregado exitosamente.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al agregar el usuario: ' . $stmt->error]);
        }
        $stmt->close();
        break;
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? '';
        $username = $data['username'] ?? '';
        $email = $data['email'] ?? '';
        $role_name = $data['role'] ?? '';

        if (empty($id) || empty($username) || empty($email) || empty($role_name)) {
            echo json_encode(['success' => false, 'message' => 'Todos los campos son requeridos.']);
            exit;
        }

        // Find role_id from role name
        $sql_role = "SELECT id_rol FROM roles WHERE nombre = ?";
        $stmt_role = $conn->prepare($sql_role);
        $stmt_role->bind_param('s', $role_name);
        $stmt_role->execute();
        $result_role = $stmt_role->get_result();
        if ($result_role->num_rows === 0) {
            echo json_encode(['success' => false, 'message' => 'Rol no válido.']);
            exit;
        }
        $role_id = $result_role->fetch_assoc()['id_rol'];
        $stmt_role->close();

        $sql = "UPDATE usuarios SET nombre = ?, correo_electronico = ?, rol_id = ? WHERE id_usuario = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ssii', $username, $email, $role_id, $id);

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
        $id = $_GET['id'] ?? '';

        if (empty($id)) {
            echo json_encode(['success' => false, 'message' => 'ID de usuario requerido.']);
            exit;
        }

        $sql = "DELETE FROM usuarios WHERE id_usuario = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $id);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(['success' => true, 'message' => 'Usuario eliminado exitosamente.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado.']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al eliminar el usuario: ' . $stmt->error]);
        }
        $stmt->close();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
        break;
}

$conn->close();
?>