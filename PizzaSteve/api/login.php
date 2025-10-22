<?php
// api/login.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../database/connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Usuario y contraseña son requeridos.']);
        exit;
    }

    $sql = "SELECT u.*, r.nombre as role_name FROM usuarios u JOIN roles r ON u.rol_id = r.id_rol WHERE u.nombre = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
        if (password_verify($password, $user['contrasena'])) {
            session_start();
            $_SESSION['user_id'] = $user['id_usuario'];
            $_SESSION['username'] = $user['nombre'];
            $_SESSION['role'] = $user['role_name'];
            echo json_encode(['success' => true, 'role' => strtolower($user['role_name'])]);
        } else {
            // Fallback for plain text password for demonstration with the provided SQL file
            if ($password === $user['contrasena']) {
                session_start();
                $_SESSION['user_id'] = $user['id_usuario'];
                $_SESSION['username'] = $user['nombre'];
                $_SESSION['role'] = $user['role_name'];
                echo json_encode(['success' => true, 'role' => strtolower($user['role_name'])]);
            } else {
                 echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta.']);
            }
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado.']);
    }

    $stmt->close();
    $conn->close();
} else {
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
}
?>