<?php
// api/orders.php

require_once '../database/connect.php';

header('Content-Type: application/json');

// --- Mapa de Coordenadas de Sucursales ---
// Ya que la tabla 'sucursales' no tiene coordenadas, las definimos aquí.
// La clave es el id_sucursal.
$branch_coordinates = [
    1 => ['lat' => -16.507, 'lng' => -68.127] // Asumiendo que ID 1 es "Pizza Steve Central" / Sopocachi
    // Añadir más sucursales aquí si es necesario
];


$response = [];

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
        de.latitud AS lat,
        de.longitud AS lng
    FROM 
        pedidos AS p
    JOIN 
        usuarios AS u ON p.usuario_id = u.id_usuario
    JOIN 
        direcciones_entrega AS de ON p.direccion_id = de.id_direccion
    JOIN
        sucursales AS s ON p.sucursal_id = s.id_sucursal;
";

$stmt = $conn->prepare($sql);

if ($stmt && $stmt->execute()) {
    $result = $stmt->get_result();
    
    $orders = [];
    while($row = $result->fetch_assoc()) {
        $sucursal_id = $row['sucursal_id'];
        
        $orders[] = [
            'id' => 'ORD-' . str_pad($row['id_pedido'], 3, '0', STR_PAD_LEFT),
            'customerName' => $row['customerName'],
            'address' => $row['address'],
            'status' => $row['status'],
            'paymentType' => $row['paymentType'],
            'price' => (float)$row['price'],
            'coordinates' => [
                'lat' => (float)$row['lat'],
                'lng' => (float)$row['lng']
            ],
            'branch' => [
                'id' => $sucursal_id,
                'name' => $row['branchName'],
                'coordinates' => isset($branch_coordinates[$sucursal_id]) 
                                 ? $branch_coordinates[$sucursal_id] 
                                 : null
            ]
        ];
    }
    $response = $orders;
    
    $stmt->close();

} else {
    http_response_code(500);
    $response = ['error' => 'Ocurrió un error al procesar su solicitud.'];
}

$conn->close();

echo json_encode($response);
?>