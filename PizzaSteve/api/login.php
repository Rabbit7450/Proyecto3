<?php
// api/login.php
require_once '../config/environment.php';
require_once '../config/database.php';
require_once '../config/security.php';
require_once '../config/security_headers.php';
require_once 'rate_limit.php';

setSecurityHeaders();
configureSecureSession();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';
    
    // Rate limiting
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $identifier = $username . '_' . $ip;
    $maxAttempts = 5;
    $timeWindow = 300;
    
    // Obtener información de intentos antes de verificar
    $attemptsInfo = getRateLimitAttempts($identifier, $maxAttempts, $timeWindow);
    
    if (!checkRateLimit($identifier, $maxAttempts, $timeWindow)) {
        $remainingTime = getRateLimitRemainingTime($identifier, $timeWindow);
        http_response_code(429);
        echo json_encode([
            'success' => false, 
            'message' => 'Demasiados intentos. Por favor espere ' . ceil($remainingTime / 60) . ' minutos.',
            'attempts_remaining' => 0,
            'attempts_total' => $maxAttempts
        ]);
        exit;
    }
    
    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Usuario y contraseña son requeridos.']);
        exit;
    }

    // Permitir login con nombre de usuario o correo electrónico
    // Verificar si el input parece un email
    $isEmail = filter_var($username, FILTER_VALIDATE_EMAIL) !== false;
    
    if ($isEmail) {
        // Buscar por correo electrónico
        $sql = "SELECT u.*, r.nombre as role_name FROM usuarios u JOIN roles r ON u.rol_id = r.id_rol WHERE u.correo_electronico = ?";
    } else {
        // Buscar por nombre de usuario
        $sql = "SELECT u.*, r.nombre as role_name FROM usuarios u JOIN roles r ON u.rol_id = r.id_rol WHERE u.nombre = ?";
    }
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        if (IS_PRODUCTION) {
            error_log("Login prepare failed: " . $conn->error);
            echo json_encode(['success' => false, 'message' => 'Error del servidor.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error: ' . $conn->error]);
        }
        exit;
    }
    
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
        // Verificar que el usuario está activo
        if (!$user['activa']) {
            echo json_encode(['success' => false, 'message' => 'Su cuenta ha sido desactivada. Contacte al administrador.']);
            $stmt->close();
            exit;
        }
        
        // SOLO verificar con password_verify (eliminar fallback de texto plano)
        if (password_verify($password, $user['contrasena'])) {
            // Regenerar ID de sesión para prevenir session fixation
            session_regenerate_id(true);
            
            $_SESSION['user_id'] = $user['id_usuario'];
            $_SESSION['username'] = escapeHtml($user['nombre']);
            $_SESSION['role'] = escapeHtml($user['role_name']);
            $_SESSION['last_activity'] = time();
            $_SESSION['created'] = time();
            
            echo json_encode([
                'success' => true, 
                'role' => strtolower($user['role_name']),
                'user_id' => $user['id_usuario'],
                'username' => escapeHtml($user['nombre'])
            ]);
        } else {
            // Obtener información actualizada de intentos después del intento fallido
            $attemptsInfo = getRateLimitAttempts($identifier, $maxAttempts, $timeWindow);
            // Mismo mensaje para no revelar si el usuario existe
            echo json_encode([
                'success' => false, 
                'message' => 'Usuario o contraseña incorrectos.',
                'attempts_remaining' => $attemptsInfo['remaining'],
                'attempts_total' => $maxAttempts
            ]);
        }
    } else {
        // Obtener información actualizada de intentos después del intento fallido
        $attemptsInfo = getRateLimitAttempts($identifier, $maxAttempts, $timeWindow);
        // Mismo mensaje para no revelar si el usuario existe
        echo json_encode([
            'success' => false, 
            'message' => 'Usuario o contraseña incorrectos.',
            'attempts_remaining' => $attemptsInfo['remaining'],
            'attempts_total' => $maxAttempts
        ]);
    }

    $stmt->close();
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
}
?>