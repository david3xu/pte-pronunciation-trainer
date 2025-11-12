/**
 * EventBus - Type-safe inter-module communication system
 * Provides publish-subscribe pattern for decoupled module communication
 *
 * This is the TypeScript version of src/js/utils/EventBus.js
 * Uses EventPayloads type for type-safe event handling
 */
/**
 * Type-safe Event Bus
 * Provides publish-subscribe pattern with compile-time type checking
 */
export class EventBus {
    events = {};
    /**
     * Subscribe to an event
     * Type-safe: Callback data type matches the event payload type
     *
     * @example
     * eventBus.on('tts:speaking:started', (data) => {
     *   console.log(data.word); // TypeScript knows data has { word, phonetic?, mode? }
     * });
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    /**
     * Unsubscribe from an event
     *
     * @example
     * eventBus.off('audio:autoplay:start', myHandler);
     */
    off(event, callback) {
        if (!this.events[event])
            return;
        const handlers = this.events[event];
        this.events[event] = handlers.filter(cb => cb !== callback);
    }
    /**
     * Emit an event to all subscribers
     * Type-safe: Data type must match the event's payload type
     * Errors in handlers are caught and emitted as system:error events
     *
     * @example
     * eventBus.emit('vocabulary:loaded', { mode: 'pte-beginner', wordCount: 1234 });
     */
    emit(event, data) {
        if (!this.events[event])
            return;
        const handlers = this.events[event];
        handlers.forEach(callback => {
            try {
                callback(data);
            }
            catch (error) {
                console.error(`EventBus error in ${event} handler:`, error);
                // Emit global error event for centralized error handling
                // Prevent infinite loops by not emitting system:error for system:error
                if (event !== 'system:error') {
                    // Use setTimeout to avoid recursive emit during iteration
                    setTimeout(() => {
                        this.emit('system:error', {
                            event,
                            error: error instanceof Error ? error : new Error(String(error)),
                            stack: error instanceof Error ? error.stack : undefined,
                            timestamp: Date.now()
                        });
                    }, 0);
                }
            }
        });
    }
    /**
     * One-time event subscription
     * Callback is automatically removed after first invocation
     *
     * @example
     * eventBus.once('system:ready', () => {
     *   console.log('System initialized!');
     * });
     */
    once(event, callback) {
        const onceWrapper = (data) => {
            callback(data);
            this.off(event, onceWrapper);
        };
        this.on(event, onceWrapper);
    }
    /**
     * Remove all listeners for an event (or all events if no event specified)
     */
    removeAllListeners(event) {
        if (event) {
            delete this.events[event];
        }
        else {
            this.events = {};
        }
    }
    /**
     * Get count of listeners for an event
     */
    listenerCount(event) {
        return this.events[event]?.length ?? 0;
    }
    /**
     * Get all events that have listeners
     */
    eventNames() {
        return Object.keys(this.events);
    }
}
// Export singleton instance
export const eventBus = new EventBus();
// Default export
export default eventBus;
/**
 * Type guard to check if a string is a valid event name
 */
export function isEventName(value) {
    // This will be validated at runtime against known event names
    // For now, we trust TypeScript's compile-time checking
    return typeof value === 'string';
}
// Expose as global reference for PTE app (browser compatibility)
if (typeof window !== 'undefined') {
    window.eventBus = eventBus;
}
//# sourceMappingURL=EventBus.js.map