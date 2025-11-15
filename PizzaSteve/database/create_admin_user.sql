-- Script para crear usuario administrador
-- Ejecutar este script en phpMyAdmin o desde la línea de comandos de MySQL

USE pizzasteve_db;

-- Verificar que el rol Admin existe (id_rol = 2)
-- Si no existe, crearlo
INSERT IGNORE INTO roles (id_rol, nombre, descripcion) VALUES
(2, 'Admin', 'Administrador del sistema');

-- Crear usuario administrador
-- Contraseña: Admin123! (hasheada con password_hash)
INSERT INTO usuarios (
    nombre, 
    correo_electronico, 
    contrasena, 
    telefono, 
    direccion, 
    fecha_creacion, 
    rol_id, 
    activa
) VALUES (
    'Administrador',
    'admin@pizzasteve.com',
    '$2y$10$21JDL2hBmZT7wtLJWexIxOkQ1VOKiE1LTwo5YhgKq0HkN0HhSiOxS', -- Contraseña: Admin123!
    '77712345',
    'Oficina Central',
    CURDATE(),
    2, -- ID del rol Admin
    1  -- Activo
) ON DUPLICATE KEY UPDATE 
    nombre = 'Administrador',
    correo_electronico = 'admin@pizzasteve.com',
    contrasena = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    activa = 1;

-- Verificar que se creó correctamente
SELECT 
    u.id_usuario,
    u.nombre,
    u.correo_electronico,
    r.nombre as rol,
    u.activa
FROM usuarios u
JOIN roles r ON u.rol_id = r.id_rol
WHERE u.correo_electronico = 'admin@pizzasteve.com';

