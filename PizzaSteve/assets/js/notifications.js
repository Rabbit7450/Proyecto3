// Sistema de notificaciones de pedidos
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.init();
    }

    init() {
        this.createNotificationContainer();
        this.requestNotificationPermission();
    }

    createNotificationContainer() {
        if (document.getElementById('notificationContainer')) return;

        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1050';
        document.body.appendChild(container);
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            await Notification.requestPermission();
        }
    }

    showNotification(title, message, type = 'info', duration = 5000) {
        const notificationId = Date.now();
        const notification = {
            id: notificationId,
            title,
            message,
            type,
            timestamp: new Date()
        };

        this.notifications.push(notification);
        this.renderNotification(notification);
        this.playNotificationSound();

        // Mostrar notificación del navegador si está permitido
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/assets/img/pizza-icon.png'
            });
        }

        // Auto-remover después del tiempo especificado
        setTimeout(() => {
            this.removeNotification(notificationId);
        }, duration);
    }

    renderNotification(notification) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notificationEl = document.createElement('div');
        notificationEl.className = `alert alert-${this.getAlertClass(notification.type)} alert-dismissible fade show mb-2`;
        notificationEl.style.minWidth = '300px';
        notificationEl.innerHTML = `
            <div class="d-flex align-items-start">
                <div class="me-2">
                    <i class="bi ${this.getIconClass(notification.type)}"></i>
                </div>
                <div class="flex-grow-1">
                    <strong>${notification.title}</strong>
                    <div class="small">${notification.message}</div>
                    <small class="text-muted">${this.formatTime(notification.timestamp)}</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        container.appendChild(notificationEl);
    }

    removeNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        // La eliminación visual se maneja con Bootstrap
    }

    getAlertClass(type) {
        const classes = {
            'info': 'info',
            'success': 'success',
            'warning': 'warning',
            'error': 'danger',
            'order': 'primary'
        };
        return classes[type] || 'info';
    }

    getIconClass(type) {
        const icons = {
            'info': 'bi-info-circle',
            'success': 'bi-check-circle',
            'warning': 'bi-exclamation-triangle',
            'error': 'bi-x-circle',
            'order': 'bi-truck'
        };
        return icons[type] || 'bi-info-circle';
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Ahora mismo';
        if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        
        return date.toLocaleDateString();
    }

    playNotificationSound() {
        // Crear un sonido simple usando Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('No se pudo reproducir el sonido de notificación');
        }
    }

    // Notificaciones específicas de pedidos
    orderStatusUpdate(orderId, status, estimatedTime = null) {
        const statusMessages = {
            'pendiente': 'Tu pedido ha sido recibido y está siendo procesado',
            'preparando': '¡Tu pedido está siendo preparado!',
            'en_camino': '¡Tu pedido está en camino!',
            'entregado': '¡Tu pedido ha sido entregado! Gracias por tu compra',
            'cancelado': 'Tu pedido ha sido cancelado'
        };

        const statusTitles = {
            'pendiente': 'Pedido Recibido',
            'preparando': 'Pedido en Preparación',
            'en_camino': 'Pedido en Camino',
            'entregado': 'Pedido Entregado',
            'cancelado': 'Pedido Cancelado'
        };

        const message = statusMessages[status] || 'Estado de pedido actualizado';
        const title = statusTitles[status] || 'Actualización de Pedido';
        
        let fullMessage = message;
        if (estimatedTime && (status === 'preparando' || status === 'en_camino')) {
            fullMessage += ` - Tiempo estimado: ${estimatedTime} minutos`;
        }

        this.showNotification(title, fullMessage, 'order', 8000);
    }

    newOrderPlaced(orderId) {
        this.showNotification(
            '¡Pedido Realizado!',
            `Tu pedido #${orderId} ha sido recibido y está siendo procesado`,
            'success',
            6000
        );
    }

    orderReadyForPickup(orderId) {
        this.showNotification(
            '¡Pedido Listo!',
            `Tu pedido #${orderId} está listo para recoger`,
            'success',
            10000
        );
    }

    deliveryNear(orderId, deliveryPerson = null) {
        const message = deliveryPerson 
            ? `¡Tu pedido #${orderId} está cerca! ${deliveryPerson} te está buscando`
            : `¡Tu pedido #${orderId} está cerca!`;
            
        this.showNotification(
            '¡Pedido Cerca!',
            message,
            'warning',
            8000
        );
    }
}

// Instancia global del sistema de notificaciones
window.notificationSystem = new NotificationSystem();

window.notify = function notify(title, message, type = 'info', duration = 5000) {
    if (window.notificationSystem && typeof window.notificationSystem.showNotification === 'function') {
        window.notificationSystem.showNotification(title, message, type, duration);
        return;
    }

    let container = document.getElementById('fallbackNotificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'fallbackNotificationContainer';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '2000';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '12px';
        document.body.appendChild(container);
    }

    const typeMap = {
        success: 'alert-success',
        error: 'alert-danger',
        warning: 'alert-warning',
        info: 'alert-info'
    };
    const alertClass = typeMap[type] || typeMap.info;

    const alertEl = document.createElement('div');
    alertEl.className = `alert ${alertClass} shadow-sm fade show`;
    alertEl.setAttribute('role', 'alert');
    alertEl.innerHTML = `<strong>${title}</strong><div>${message}</div>`;
    container.appendChild(alertEl);

    setTimeout(() => {
        alertEl.classList.remove('show');
        alertEl.classList.add('hide');
        setTimeout(() => {
            if (alertEl.parentNode) {
                alertEl.parentNode.removeChild(alertEl);
            }
        }, 300);
    }, duration);
};

// Función para verificar actualizaciones de pedidos
function checkOrderUpdates(userId) {
    if (!userId) return;

    // Verificar cada 30 segundos
    setInterval(async () => {
        try {
            const response = await fetch(`api/orders.php?user_id=${userId}&last_check=${Date.now()}`);
            const orders = await response.json();
            
            orders.forEach(order => {
                if (order.status_updated) {
                    window.notificationSystem.orderStatusUpdate(
                        order.id,
                        order.status,
                        order.estimated_time
                    );
                }
            });
        } catch (error) {
            console.error('Error checking order updates:', error);
        }
    }, 30000);
}

// Función para suscribirse a actualizaciones de un pedido específico
function subscribeToOrderUpdates(orderId) {
    // En un sistema real, esto usaría WebSockets o Server-Sent Events
    // Por ahora, simulamos con polling
    const checkInterval = setInterval(async () => {
        try {
            const response = await fetch(`api/orders.php?id=${orderId}`);
            const order = await response.json();
            
            if (order.status === 'entregado' || order.status === 'cancelado') {
                clearInterval(checkInterval);
            }
            
            // Aquí iría la lógica para verificar cambios de estado
            // y mostrar notificaciones correspondientes
            
        } catch (error) {
            console.error('Error checking order status:', error);
        }
    }, 15000); // Verificar cada 15 segundos
}

// Exportar funciones para uso global
window.checkOrderUpdates = checkOrderUpdates;
window.subscribeToOrderUpdates = subscribeToOrderUpdates;