-- Versión simple del script (si la versión anterior no funciona)
-- Agregar columna tipo_comprobante a la tabla comprobantes_pago
-- Esta columna distingue entre 'pago' (comprobante de pago del cliente) y 'entrega' (foto de entrega del repartidor)

-- Si obtienes un error de que la columna ya existe, simplemente ignóralo
ALTER TABLE `comprobantes_pago` 
ADD COLUMN `tipo_comprobante` VARCHAR(20) DEFAULT 'pago' 
AFTER `tamano_archivo`;

-- Actualizar registros existentes para que sean de tipo 'pago' por defecto
UPDATE `comprobantes_pago` 
SET `tipo_comprobante` = 'pago' 
WHERE `tipo_comprobante` IS NULL OR `tipo_comprobante` = '';

-- Agregar índice para búsquedas más rápidas
ALTER TABLE `comprobantes_pago` 
ADD INDEX `idx_tipo_comprobante` (`tipo_comprobante`);

