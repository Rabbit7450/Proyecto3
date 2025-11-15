-- Script para migrar estados de pedidos a los nuevos estados estandarizados
-- Ejecutar este script después de actualizar el código

-- Mapeo de estados antiguos a nuevos estados estandarizados
UPDATE pedidos SET estado = 'pending' WHERE estado IN ('pendiente', 'pending');
UPDATE pedidos SET estado = 'preparing' WHERE estado IN ('preparando', 'en_preparacion');
UPDATE pedidos SET estado = 'ready_for_delivery' WHERE estado IN ('listo_entrega', 'listo para entrega', 'listo');
UPDATE pedidos SET estado = 'out_for_delivery' WHERE estado IN ('en_camino', 'en camino', 'en_route');
UPDATE pedidos SET estado = 'completed' WHERE estado IN ('completed', 'completado', 'entregado');
UPDATE pedidos SET estado = 'cancelled' WHERE estado IN ('cancelado', 'cancelled', 'cancelado');

-- Verificar que todos los pedidos tengan estados válidos
-- Si hay algún estado que no coincide, se dejará como está y el admin deberá revisarlo manualmente

-- Nota: Este script asume que los estados antiguos pueden estar en diferentes formatos
-- Si tienes estados personalizados, deberás agregarlos manualmente al script

