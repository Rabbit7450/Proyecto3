-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 22-10-2025 a las 06:24:03
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `pizzasteve_db`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `direcciones_entrega`
--

CREATE TABLE `direcciones_entrega` (
  `id_direccion` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `direccion` varchar(255) NOT NULL,
  `latitud` decimal(10,6) DEFAULT NULL,
  `longitud` decimal(10,6) DEFAULT NULL,
  `es_principal` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `direcciones_entrega`
--

INSERT INTO `direcciones_entrega` (`id_direccion`, `usuario_id`, `direccion`, `latitud`, `longitud`, `es_principal`) VALUES
(1, 1, 'Av. Arce #1234, Edif. Torino', -16.505000, -68.130000, 1),
(2, 2, 'Calle 21 #3000, Edif. Las Rosas', -16.538000, -68.084000, 1),
(3, 3, 'Av. Ballivián #5555, Calacoto', -16.540000, -68.082000, 1),
(4, 4, 'Calle 7 de Achumani, Casa 12', -16.520000, -68.090000, 1),
(5, 5, 'Av. Busch #777, Miraflores', -16.510000, -68.120000, 1),
(6, 6, 'Pedro Salazar #888, Sopocachi', -16.515000, -68.140000, 1),
(7, 7, 'Av. Saavedra #999, San Jorge', -16.530000, -68.100000, 1),
(8, 8, 'Calle 2 de Cota Cota, Condominio Las Águilas', -16.545000, -68.070000, 1),
(9, 9, 'Calle 27 de Obrajes, Pasaje A', -16.535000, -68.110000, 1),
(10, 10, 'Villa Fátima, Calle 13 #1313', -16.500000, -68.150000, 1),
(11, 11, 'Av. Mariscal Santa Cruz #2020', -16.495000, -68.135000, 1),
(12, 12, 'Illampu #2121, Centro', -16.492000, -68.138000, 1),
(13, 13, 'Calle México #3030, El Tejar', -16.560000, -68.060000, 1),
(14, 14, 'Calle 9 de Achumani, Res. Los Pinos', -16.525000, -68.088000, 1),
(15, 15, 'Belén #4040, Sopocachi', -16.518000, -68.142000, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ingredientes`
--

CREATE TABLE `ingredientes` (
  `id_ingrediente` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` varchar(50) NOT NULL,
  `cantidad_disponible` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `stock_disponible` int(11) NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `proveedor_id` int(11) NOT NULL,
  `sucursal_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ingredientes`
--

INSERT INTO `ingredientes` (`id_ingrediente`, `nombre`, `tipo`, `cantidad_disponible`, `precio_unitario`, `stock_disponible`, `activa`, `proveedor_id`, `sucursal_id`) VALUES
(1, 'Queso Mozzarella', 'Lácteo', 1000, 18.50, 1000, 1, 1, 1),
(2, 'Harina de Trigo', 'Base', 5000, 3.20, 5000, 1, 2, 1),
(3, 'Salsa de Tomate', 'Salsa', 2000, 5.00, 2000, 1, 3, 1),
(4, 'Pepperoni', 'Embutido', 800, 25.00, 800, 1, 3, 1),
(5, 'Champiñón', 'Verdura', 600, 12.00, 600, 1, 4, 1),
(6, 'Jamón', 'Embutido', 700, 22.00, 700, 1, 3, 1),
(7, 'Piña', 'Fruta', 500, 10.00, 500, 1, 4, 1),
(8, 'Aceituna', 'Fruta', 400, 15.00, 400, 1, 4, 1),
(9, 'Cebolla', 'Verdura', 900, 4.50, 900, 1, 4, 1),
(10, 'Pimiento Verde', 'Verdura', 450, 8.00, 450, 1, 4, 1),
(11, 'Queso Parmesano', 'Lácteo', 300, 30.00, 300, 1, 1, 1),
(12, 'Orégano', 'Especia', 200, 2.00, 200, 1, 2, 1),
(13, 'Salchicha', 'Embutido', 550, 20.00, 550, 1, 3, 1),
(14, 'Tomate Fresco', 'Verdura', 650, 6.00, 650, 1, 4, 1),
(15, 'Albahaca', 'Especia', 150, 3.50, 150, 1, 4, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos`
--

CREATE TABLE `pedidos` (
  `id_pedido` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `sucursal_id` int(11) NOT NULL,
  `direccion_id` int(11) NOT NULL,
  `fecha_pedido` date NOT NULL,
  `estado` varchar(50) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `repartidor_id` int(11) DEFAULT NULL,
  `fecha_entrega_estimada` date DEFAULT NULL,
  `metodo_pago` varchar(50) DEFAULT NULL,
  `fecha_pago` date DEFAULT NULL,
  `pago_confirmado` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pedidos`
--

INSERT INTO `pedidos` (`id_pedido`, `usuario_id`, `sucursal_id`, `direccion_id`, `fecha_pedido`, `estado`, `total`, `repartidor_id`, `fecha_entrega_estimada`, `metodo_pago`, `fecha_pago`, `pago_confirmado`) VALUES
(1, 1, 1, 1, '2025-10-01', 'completed', 65.00, 1, '2025-10-01', 'efectivo', '2025-10-01', 1),
(2, 2, 1, 2, '2025-10-01', 'completed', 150.00, 2, '2025-10-01', 'qr', '2025-10-01', 1),
(3, 3, 1, 3, '2025-10-02', 'completed', 80.00, 3, '2025-10-02', 'tarjeta', '2025-10-02', 1),
(4, 4, 1, 4, '2025-10-02', 'completed', 140.00, 4, '2025-10-02', 'efectivo', '2025-10-02', 1),
(5, 5, 1, 5, '2025-10-03', 'completed', 95.00, 1, '2025-10-03', 'qr', '2025-10-03', 1),
(6, 6, 1, 6, '2025-10-03', 'completed', 78.00, 2, '2025-10-03', 'tarjeta', '2025-10-03', 1),
(7, 7, 1, 7, '2025-10-04', 'completed', 160.00, 3, '2025-10-04', 'efectivo', '2025-10-04', 1),
(8, 8, 1, 8, '2025-10-04', 'completed', 82.00, 4, '2025-10-04', 'qr', '2025-10-04', 1),
(9, 9, 1, 9, '2025-10-05', 'completed', 120.00, 1, '2025-10-05', 'tarjeta', '2025-10-05', 1),
(10, 10, 1, 10, '2025-10-05', 'completed', 90.00, 2, '2025-10-05', 'efectivo', '2025-10-05', 1),
(11, 11, 1, 11, '2025-10-06', 'completed', 110.00, 3, '2025-10-06', 'qr', '2025-10-06', 1),
(12, 12, 1, 12, '2025-10-06', 'completed', 87.00, 4, '2025-10-06', 'tarjeta', '2025-10-06', 1),
(13, 13, 1, 13, '2025-10-07', 'completed', 130.00, 1, '2025-10-07', 'efectivo', '2025-10-07', 1),
(14, 14, 1, 14, '2025-10-07', 'completed', 88.00, 2, '2025-10-07', 'qr', '2025-10-07', 1),
(15, 15, 1, 15, '2025-10-08', 'pending', 95.00, NULL, NULL, 'efectivo', NULL, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos_productos`
--

CREATE TABLE `pedidos_productos` (
  `id_pedido` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad_producto` int(11) NOT NULL,
  `precio_u` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pedidos_productos`
--

INSERT INTO `pedidos_productos` (`id_pedido`, `id_producto`, `cantidad_producto`, `precio_u`) VALUES
(1, 1, 1, 65.00),
(2, 2, 2, 75.00),
(3, 3, 1, 80.00),
(4, 4, 2, 70.00),
(5, 5, 1, 90.00),
(6, 6, 1, 78.00),
(7, 7, 2, 80.00),
(8, 8, 1, 72.00),
(9, 9, 1, 88.00),
(10, 10, 1, 95.00),
(11, 11, 1, 82.00),
(12, 12, 1, 87.00),
(13, 13, 1, 77.00),
(14, 14, 1, 73.00),
(15, 15, 1, 68.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `preparacion_pedidos`
--

CREATE TABLE `preparacion_pedidos` (
  `id_preparacion` int(11) NOT NULL,
  `pedido_id` int(11) NOT NULL,
  `ingrediente_id` int(11) NOT NULL,
  `cantidad_usada` int(11) NOT NULL,
  `fecha_preparacion` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `preparacion_pedidos`
--

INSERT INTO `preparacion_pedidos` (`id_preparacion`, `pedido_id`, `ingrediente_id`, `cantidad_usada`, `fecha_preparacion`) VALUES
(1, 1, 1, 200, '2025-10-01'),
(2, 1, 2, 300, '2025-10-01'),
(3, 1, 3, 100, '2025-10-01'),
(4, 2, 1, 400, '2025-10-01'),
(5, 2, 2, 600, '2025-10-01'),
(6, 2, 3, 200, '2025-10-01'),
(7, 2, 4, 150, '2025-10-01'),
(8, 3, 1, 200, '2025-10-02'),
(9, 3, 2, 300, '2025-10-02'),
(10, 3, 3, 100, '2025-10-02'),
(11, 3, 6, 120, '2025-10-02'),
(12, 3, 7, 100, '2025-10-02'),
(13, 4, 1, 400, '2025-10-02'),
(14, 4, 2, 600, '2025-10-02'),
(15, 4, 5, 200, '2025-10-02');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id_producto` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `categoria` varchar(50) NOT NULL,
  `fecha_creacion` date NOT NULL,
  `stock_disponible` int(11) NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `sucursal_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `nombre`, `precio`, `descripcion`, `categoria`, `fecha_creacion`, `stock_disponible`, `activa`, `sucursal_id`) VALUES
(1, 'Pizza Margarita', 65.00, 'Salsa de tomate, mozzarella y albahaca', 'Pizza', '2024-01-01', 999, 1, 1),
(2, 'Pizza Pepperoni', 75.00, 'Salsa de tomate, mozzarella y pepperoni', 'Pizza', '2024-01-01', 999, 1, 1),
(3, 'Pizza Hawaiana', 80.00, 'Jamón, piña y mozzarella', 'Pizza', '2024-01-01', 999, 1, 1),
(4, 'Pizza Champiñón', 70.00, 'Mozzarella, champiñón y cebolla', 'Pizza', '2024-01-01', 999, 1, 1),
(5, 'Pizza 4 Estaciones', 90.00, 'Jamón, champiñón, pimiento y aceituna', 'Pizza', '2024-01-01', 999, 1, 1),
(6, 'Pizza Ranchera', 85.00, 'Salsa ranch, pepperoni, salchicha y cebolla', 'Pizza', '2024-01-01', 999, 1, 1),
(7, 'Pizza Vegetariana', 78.00, 'Mozzarella, tomate, champiñón, pimiento, cebolla y aceituna', 'Pizza', '2024-01-01', 999, 1, 1),
(8, 'Pizza Napolitana', 72.00, 'Tomate fresco, mozzarella, orégano y albahaca', 'Pizza', '2024-01-01', 999, 1, 1),
(9, 'Pizza BBQ Chicken', 88.00, 'Pollo deshebrado, salsa bbq, cebolla y mozzarella', 'Pizza', '2024-01-01', 999, 1, 1),
(10, 'Pizza Carnes', 95.00, 'Jamón, pepperoni, salchicha y carne molida', 'Pizza', '2024-01-01', 999, 1, 1),
(11, 'Pizza de Quesos', 82.00, 'Mozzarella, parmesano y queso crema', 'Pizza', '2024-01-01', 999, 1, 1),
(12, 'Pizza Mexicana', 87.00, 'Carne molida, jalapeño, cebolla y salsa picante', 'Pizza', '2024-01-01', 999, 1, 1),
(13, 'Pizza de Anchoas', 77.00, 'Anchoas, mozzarella y orégano', 'Pizza', '2024-01-01', 999, 1, 1),
(14, 'Pizza de Salchicha', 73.00, 'Salchicha alemana y mozzarella', 'Pizza', '2024-01-01', 999, 1, 1),
(15, 'Pizza de Pimientos', 68.00, 'Pimiento verde, rojo, mozzarella y tomate', 'Pizza', '2024-01-01', 999, 1, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `promociones`
--

CREATE TABLE `promociones` (
  `id_promocion` int(11) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `porcentaje_descuento` decimal(5,2) NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `sucursal_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `promociones`
--

INSERT INTO `promociones` (`id_promocion`, `descripcion`, `fecha_inicio`, `fecha_fin`, `porcentaje_descuento`, `activa`, `sucursal_id`) VALUES
(1, '2x1 Martes de Pepperoni', '2025-10-01', '2025-12-31', 50.00, 1, 1),
(2, 'Delivery gratis Miércoles', '2025-10-01', '2025-12-31', 10.00, 1, 1),
(3, 'Fines de semana 15 % off', '2025-10-01', '2025-12-31', 15.00, 1, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `id_proveedor` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `fecha_registro` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `proveedores`
--

INSERT INTO `proveedores` (`id_proveedor`, `nombre`, `direccion`, `telefono`, `email`, `fecha_registro`) VALUES
(1, 'Quesos Andinos SRL', 'El Alto, Zona Villa Dolores', '22884455', 'contacto@quesosandinos.bo', '2023-01-15'),
(2, 'Harinas Bolivia', 'Carretera a Viacha Km 12', '22113377', 'ventas@harinasbolivia.bo', '2023-02-10'),
(3, 'Embutidos La Estancia', 'Calle México #888, La Paz', '2447788', 'info@laestancia.bo', '2023-03-05'),
(4, 'Verduras EcoAndes', 'Achocalla, Comunidad 3', '71125566', 'ecoandes@organic.com', '2023-04-11');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `repartidores`
--

CREATE TABLE `repartidores` (
  `id_repartidor` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  `correo_electronico` varchar(100) DEFAULT NULL,
  `estado` varchar(50) NOT NULL DEFAULT 'disponible',
  `fecha_inicio_trabajo` date DEFAULT NULL,
  `fecha_ultimo_pedido` date DEFAULT NULL,
  `ubicacion_actual` point DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `repartidores`
--

INSERT INTO `repartidores` (`id_repartidor`, `nombre`, `telefono`, `correo_electronico`, `estado`, `fecha_inicio_trabajo`, `fecha_ultimo_pedido`, `ubicacion_actual`) VALUES
(1, 'Carlos Mamani', '71122233', 'carlos.mamani@delivery.bo', 'disponible', '2023-01-10', NULL, 0x000000000101000000e17a14ae478130c0b81e85eb510851c0),
(2, 'Lucia Rojas', '72233445', 'lucia.rojas@delivery.bo', 'disponible', '2023-02-15', NULL, 0x0000000001010000007d3f355eba8930c04c378941600551c0),
(3, 'Diego Limachi', '73344556', 'diego.limachi@delivery.bo', 'ocupado', '2023-03-20', '2025-10-08', 0x0000000001010000003b014d840d7f30c0696ff085c90851c0),
(4, 'Ana Choque', '74455667', 'ana.choque@delivery.bo', 'disponible', '2023-04-25', NULL, 0x00000000010100000085eb51b81e8530c066666666660651c0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id_rol` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id_rol`, `nombre`, `descripcion`) VALUES
(1, 'Cliente', 'Usuario que realiza pedidos'),
(2, 'Admin', 'Administrador del sistema'),
(3, 'Repartidor', 'Personal de entrega'),
(4, 'Vendedor', 'Personal de mostrador / caja');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sucursales`
--

CREATE TABLE `sucursales` (
  `id_sucursal` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `direccion` varchar(255) NOT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  `horario_apertura` time DEFAULT NULL,
  `horario_cierre` time DEFAULT NULL,
  `activa` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `sucursales`
--

INSERT INTO `sucursales` (`id_sucursal`, `nombre`, `direccion`, `telefono`, `horario_apertura`, `horario_cierre`, `activa`) VALUES
(1, 'Pizza Steve Central', 'Av. 6 de Agosto esq. Potosí, La Paz', '2223344', '11:00:00', '23:00:00', 1),
(2, 'Pizza Steve Sopocachi', 'Calle 20 de Octubre #1485, La Paz', '2445566', '11:00:00', '23:30:00', 1),
(3, 'Pizza Steve Calacoto', 'Av. Ballivián #2222, La Paz', '2778899', '10:30:00', '23:00:00', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `correo_electronico` varchar(100) NOT NULL,
  `contrasena` varchar(100) NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  `fecha_creacion` date NOT NULL,
  `ultimo_inicio_sesion` timestamp NULL DEFAULT NULL,
  `rol_id` int(11) NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_cumpleaños` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `nombre`, `correo_electronico`, `contrasena`, `direccion`, `telefono`, `fecha_creacion`, `ultimo_inicio_sesion`, `rol_id`, `activa`, `fecha_cumpleaños`) VALUES
(1, 'Juan Pérez', 'juan.perez@gmail.com', 'hash123', 'Av. Arce #1234', '71111111', '2024-01-10', NULL, 1, 1, '1995-05-18'),
(2, 'María López', 'maria.lopez@gmail.com', 'hash123', 'Calle 21 #3000', '72222222', '2024-01-15', NULL, 1, 1, '1998-07-22'),
(3, 'Carlos Rojas', 'carlos.rojas@gmail.com', 'hash123', 'Zona Sur, Calacoto', '73333333', '2024-02-05', NULL, 1, 1, '1990-11-02'),
(4, 'Lucía Hernandez', 'lucia.fernandez@gmail.com', 'hash123', 'Achumani, Calle 7', '74444444', '2024-02-20', NULL, 4, 1, '1992-03-15'),
(5, 'Diego Martínez', 'diego.martinez@gmail.com', 'hash123', 'Miraflores, Av. Busch', '75555555', '2024-03-01', NULL, 1, 1, '1988-12-30'),
(6, 'Sofía Torrico', 'sofia.torrico@gmail.com', 'hash123', 'Pedro Salazar, Sopocachi', '76666666', '2024-03-10', NULL, 1, 1, '2000-01-25'),
(7, 'Andrés Aguirre', 'andres.aguirre@gmail.com', 'hash123', 'Av. Saavedra, San Jorge', '77777777', '2024-03-15', NULL, 1, 1, '1994-09-09'),
(8, 'Valeria Monroy', 'valeria.monroy@gmail.com', 'hash123', 'Cota Cota, Calle 2', '78888888', '2024-04-02', NULL, 1, 1, '1997-04-12'),
(9, 'Ricardo Blanco', 'ricardo.blanco@gmail.com', 'hash123', 'Obrajes, Calle 27', '79999999', '2024-04-18', NULL, 1, 1, '1985-08-05'),
(10, 'Paola Mendoza', 'paola.mendoza@gmail.com', 'hash123', 'Villa Fátima, El Alto', '70001122', '2024-05-05', NULL, 1, 1, '1993-06-17'),
(11, 'Fernando Camacho', 'fernando.camacho@gmail.com', 'hash123', 'Av. Mariscal Santa Cruz', '71123344', '2024-05-20', NULL, 1, 1, '1991-10-10'),
(12, 'Camila Escobar', 'camila.escobar@gmail.com', 'hash123', 'Illampu, Centro', '72234455', '2024-06-01', NULL, 1, 1, '1999-02-28'),
(13, 'Roberto Quiroga', 'roberto.quiroga@gmail.com', 'hash123', 'El Tejar, Calle México', '73345566', '2024-06-15', NULL, 1, 1, '1987-07-07'),
(14, 'Daniela Castro', 'daniela.castro@gmail.com', 'hash123', 'Achumani, Calle 9', '74456677', '2024-07-02', NULL, 1, 1, '1996-05-03'),
(15, 'Alejandro Mercado', 'alejandro.mercado@gmail.com', 'hash123', 'Sopocachi, Belén', '75567788', '2024-07-20', NULL, 1, 1, '1992-11-11');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `direcciones_entrega`
--
ALTER TABLE `direcciones_entrega`
  ADD PRIMARY KEY (`id_direccion`),
  ADD KEY `fk_de_usuario` (`usuario_id`);

--
-- Indices de la tabla `ingredientes`
--
ALTER TABLE `ingredientes`
  ADD PRIMARY KEY (`id_ingrediente`),
  ADD KEY `fk_ing_proveedor` (`proveedor_id`),
  ADD KEY `fk_ing_sucursal` (`sucursal_id`);

--
-- Indices de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD PRIMARY KEY (`id_pedido`),
  ADD KEY `fk_ped_usuario` (`usuario_id`),
  ADD KEY `fk_ped_sucursal` (`sucursal_id`),
  ADD KEY `fk_ped_direccion` (`direccion_id`),
  ADD KEY `fk_ped_repartidor` (`repartidor_id`);

--
-- Indices de la tabla `pedidos_productos`
--
ALTER TABLE `pedidos_productos`
  ADD PRIMARY KEY (`id_pedido`,`id_producto`),
  ADD KEY `fk_pedidos_productos_producto` (`id_producto`);

--
-- Indices de la tabla `preparacion_pedidos`
--
ALTER TABLE `preparacion_pedidos`
  ADD PRIMARY KEY (`id_preparacion`),
  ADD KEY `fk_pp_pedido` (`pedido_id`),
  ADD KEY `fk_pp_ingrediente` (`ingrediente_id`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id_producto`),
  ADD KEY `fk_prod_sucursal` (`sucursal_id`);

--
-- Indices de la tabla `promociones`
--
ALTER TABLE `promociones`
  ADD PRIMARY KEY (`id_promocion`),
  ADD KEY `fk_promo_sucursal` (`sucursal_id`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`id_proveedor`);

--
-- Indices de la tabla `repartidores`
--
ALTER TABLE `repartidores`
  ADD PRIMARY KEY (`id_repartidor`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id_rol`);

--
-- Indices de la tabla `sucursales`
--
ALTER TABLE `sucursales`
  ADD PRIMARY KEY (`id_sucursal`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD KEY `fk_usuarios_rol` (`rol_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `direcciones_entrega`
--
ALTER TABLE `direcciones_entrega`
  MODIFY `id_direccion` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `ingredientes`
--
ALTER TABLE `ingredientes`
  MODIFY `id_ingrediente` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  MODIFY `id_pedido` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `preparacion_pedidos`
--
ALTER TABLE `preparacion_pedidos`
  MODIFY `id_preparacion` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `promociones`
--
ALTER TABLE `promociones`
  MODIFY `id_promocion` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  MODIFY `id_proveedor` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `repartidores`
--
ALTER TABLE `repartidores`
  MODIFY `id_repartidor` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `sucursales`
--
ALTER TABLE `sucursales`
  MODIFY `id_sucursal` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `direcciones_entrega`
--
ALTER TABLE `direcciones_entrega`
  ADD CONSTRAINT `fk_de_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `ingredientes`
--
ALTER TABLE `ingredientes`
  ADD CONSTRAINT `fk_ing_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id_proveedor`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ing_sucursal` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales` (`id_sucursal`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD CONSTRAINT `fk_ped_direccion` FOREIGN KEY (`direccion_id`) REFERENCES `direcciones_entrega` (`id_direccion`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ped_repartidor` FOREIGN KEY (`repartidor_id`) REFERENCES `repartidores` (`id_repartidor`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ped_sucursal` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales` (`id_sucursal`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ped_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `pedidos_productos`
--
ALTER TABLE `pedidos_productos`
  ADD CONSTRAINT `fk_pedidos_productos_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id_pedido`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pedidos_productos_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `preparacion_pedidos`
--
ALTER TABLE `preparacion_pedidos`
  ADD CONSTRAINT `fk_pp_ingrediente` FOREIGN KEY (`ingrediente_id`) REFERENCES `ingredientes` (`id_ingrediente`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pp_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id_pedido`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `fk_prod_sucursal` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales` (`id_sucursal`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `promociones`
--
ALTER TABLE `promociones`
  ADD CONSTRAINT `fk_promo_sucursal` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales` (`id_sucursal`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id_rol`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
