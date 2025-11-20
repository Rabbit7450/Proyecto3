-- Agregar columna tipo_comprobante a la tabla comprobantes_pago
-- Esta columna distingue entre 'pago' (comprobante de pago del cliente) y 'entrega' (foto de entrega del repartidor)

-- Verificar si la columna ya existe antes de agregarla
SET @dbname = DATABASE();
SET @tablename = 'comprobantes_pago';
SET @columnname = 'tipo_comprobante';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) DEFAULT ''pago'' AFTER tamano_archivo')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Actualizar registros existentes para que sean de tipo 'pago' por defecto
UPDATE `comprobantes_pago` 
SET `tipo_comprobante` = 'pago' 
WHERE `tipo_comprobante` IS NULL OR `tipo_comprobante` = '';

-- Agregar índice para búsquedas más rápidas (si no existe)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = 'idx_tipo_comprobante')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD INDEX idx_tipo_comprobante (tipo_comprobante)')
));
PREPARE indexIfNotExists FROM @preparedStatement;
EXECUTE indexIfNotExists;
DEALLOCATE PREPARE indexIfNotExists;

