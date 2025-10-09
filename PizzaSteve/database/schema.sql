-- database/schema.sql

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS `pizzasteve_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `pizzasteve_db`;

-- Crear la tabla de 'orders'
CREATE TABLE `orders` (
  `id` varchar(10) NOT NULL,
  `customerName` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `status` enum('pending','completed') NOT NULL,
  `paymentType` enum('efectivo','transferencia','qr') NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `lat` decimal(10,8) NOT NULL,
  `lng` decimal(11,8) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar los datos de ejemplo
INSERT INTO `orders` (`id`, `customerName`, `address`, `status`, `paymentType`, `price`, `lat`, `lng`) VALUES
('ORD-001', 'Juan Perez', 'Av. Arce, La Paz', 'pending', 'efectivo', 85.50, -16.50500000, -68.13000000),
('ORD-002', 'Maria Garcia', 'Calle 21 de Calacoto, La Paz', 'pending', 'qr', 120.00, -16.53800000, -68.08400000),
('ORD-003', 'Carlos Quispe', 'Plaza Murillo, La Paz', 'completed', 'transferencia', 99.99, -16.49500000, -68.13300000),
('ORD-004', 'Ana Choque', 'Cerca al Estadio Hernando Siles', 'pending', 'efectivo', 65.00, -16.50000000, -68.12000000),
('ORD-005', 'Pedro Infante', 'Zona de Obrajes', 'completed', 'qr', 150.25, -16.52500000, -68.10000000);
