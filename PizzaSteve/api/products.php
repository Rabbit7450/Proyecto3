<?php
// api/products.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../database/connect.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            $sql = "SELECT * FROM productos WHERE id_producto = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param('i', $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $product = $result->fetch_assoc();
            echo json_encode($product);
        } else {
            $sql = "SELECT * FROM productos";
            $result = $conn->query($sql);
            if ($result === false) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error en la consulta SQL: ' . $conn->error]);
                exit;
            }
            $products = [];
            while ($row = $result->fetch_assoc()) {
                $products[] = $row;
            }
            echo json_encode($products);
        }
        break;
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $name = $data['name'] ?? '';
        $description = $data['description'] ?? '';
        $price = $data['price'] ?? 0;

        if (empty($name) || empty($price)) {
            echo json_encode(['success' => false, 'message' => 'Nombre y precio son requeridos.']);
            exit;
        }

        $sql = "INSERT INTO productos (nombre, descripcion, precio) VALUES (?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ssd', $name, $description, $price);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Producto agregado exitosamente.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al agregar el producto: ' . $stmt->error]);
        }
        $stmt->close();
        break;
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? '';
        $name = $data['name'] ?? '';
        $description = $data['description'] ?? '';
        $price = $data['price'] ?? 0;

        if (empty($id) || empty($name) || empty($price)) {
            echo json_encode(['success' => false, 'message' => 'ID, nombre y precio son requeridos.']);
            exit;
        }

        $sql = "UPDATE productos SET nombre = ?, descripcion = ?, precio = ? WHERE id_producto = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ssdi', $name, $description, $price, $id);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(['success' => true, 'message' => 'Producto actualizado exitosamente.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Producto no encontrado o sin cambios.']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al actualizar el producto: ' . $stmt->error]);
        }
        $stmt->close();
        break;
    case 'DELETE':
        $id = $_GET['id'] ?? '';

        if (empty($id)) {
            echo json_encode(['success' => false, 'message' => 'ID de producto requerido.']);
            exit;
        }

        $sql = "DELETE FROM productos WHERE id_producto = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $id);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode(['success' => true, 'message' => 'Producto eliminado exitosamente.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Producto no encontrado.']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al eliminar el producto: ' . $stmt->error]);
        }
        $stmt->close();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
        break;
}

$conn->close();
?>