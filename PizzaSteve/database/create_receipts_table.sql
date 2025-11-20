-- Crear tabla para almacenar comprobantes de pago
CREATE TABLE IF NOT EXISTS `comprobantes_pago` (
  `id_comprobante` int(11) NOT NULL AUTO_INCREMENT,
  `id_pedido` int(11) NOT NULL,
  `ruta_archivo` varchar(500) NOT NULL,
  `fecha_subida` datetime NOT NULL,
  `tipo_archivo` varchar(100) DEFAULT NULL,
  `tamano_archivo` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_comprobante`),
  KEY `idx_pedido` (`id_pedido`),
  CONSTRAINT `fk_comprobante_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id_pedido`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

