/**
 * EventBus - Inter-module communication system
 * Provides publish-subscribe pattern for decoupled module communication
 */
class EventBus {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name to subscribe to
     * @param {Function} callback - Callback function to execute when event is emitted
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name to unsubscribe from
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * Emit an event to all subscribers
     * Errors in handlers are caught and emitted as system:error events
     * @param {string} event - Event name to emit
     * @param {*} data - Data to pass to event handlers
     */
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`EventBus error in ${event} handler:`, error);
                
                // Emit global error event for centralized error handling
                // Get system error event name from config
                const systemErrorEvent = window.appConfig ? window.appConfig.get('events.system.error') : 'system:error';

                // Prevent infinite loops by not emitting system:error for system:error
                if (event !== systemErrorEvent) {
                    // Use setTimeout to avoid recursive emit during iteration
                    setTimeout(() => {
                        this.emit(systemErrorEvent, {
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

    /**
     * One-time event subscription - callback is automatically removed after first invocation
     * @param {string} event - Event name to subscribe to
     * @param {Function} callback - Callback function to execute once
     */
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