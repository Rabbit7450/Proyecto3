-- Migración: Cambiar fecha_pedido de DATE a DATETIME
-- Esto permite guardar la hora exacta de cada pedido

ALTER TABLE `pedidos` 
MODIFY COLUMN `fecha_pedido` DATETIME NOT NULL;

-- Actualizar registros existentes para que tengan hora (medianoche por defecto)
-- Si hay pedidos existentes, se les asignará la hora 00:00:00
UPDATE `pedidos` 
SET `fecha_pedido` = CONCAT(`fecha_pedido`, ' 00:00:00')
WHERE `fecha_pedido` NOT LIKE '%:%:%';

