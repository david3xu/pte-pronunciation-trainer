// EventBus - Inter-module communication system
class EventBus {
    constructor() {
        this.events = {};
    }

    // Subscribe to an event
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    // Unsubscribe from an event
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    // Emit an event to all subscribers
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`EventBus error in ${event} handler:`, error);
                
                // Emit global error event for centralized error handling
                // Prevent infinite loops by not emitting system:error for system:error
                if (event !== 'system:error') {
                    // Use setTimeout to avoid recursive emit during iteration
                    setTimeout(() => {
                        this.emit('system:error', {
                            event,
                            error: error.message || String(error),
                            stack: error.stack,
                            data,
                            timestamp: new Date().toISOString()
                        });
                    }, 0);
                }
            }
        });
    }

    // One-time event subscription
    once(event, callback) {
        const onceWrapper = (data) => {
            callback(data);
            this.off(event, onceWrapper);
        };
        this.on(event, onceWrapper);
    }
}

// Global event bus instance
const eventBus = new EventBus();

// Expose as global reference for PTE app
window.eventBus = eventBus;