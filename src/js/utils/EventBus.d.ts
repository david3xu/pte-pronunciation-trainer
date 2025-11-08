/**
 * EventBus - Type-safe inter-module communication system
 * Provides publish-subscribe pattern for decoupled module communication
 *
 * This is the TypeScript version of src/js/utils/EventBus.js
 * Uses EventPayloads type for type-safe event handling
 */
import type { EventPayloads, EventName } from '../../types';
/**
 * Event callback function type
 */
type EventCallback<T = any> = (data: T) => void;
/**
 * Type-safe Event Bus
 * Provides publish-subscribe pattern with compile-time type checking
 */
export declare class EventBus {
    private events;
    /**
     * Subscribe to an event
     * Type-safe: Callback data type matches the event payload type
     *
     * @example
     * eventBus.on('tts:speaking:started', (data) => {
     *   console.log(data.word); // TypeScript knows data has { word, phonetic?, mode? }
     * });
     */
    on<K extends EventName>(event: K, callback: EventCallback<EventPayloads[K]>): void;
    /**
     * Unsubscribe from an event
     *
     * @example
     * eventBus.off('audio:autoplay:start', myHandler);
     */
    off<K extends EventName>(event: K, callback: EventCallback<EventPayloads[K]>): void;
    /**
     * Emit an event to all subscribers
     * Type-safe: Data type must match the event's payload type
     * Errors in handlers are caught and emitted as system:error events
     *
     * @example
     * eventBus.emit('vocabulary:loaded', { mode: 'pte-beginner', wordCount: 1234 });
     */
    emit<K extends EventName>(event: K, data: EventPayloads[K]): void;
    /**
     * One-time event subscription
     * Callback is automatically removed after first invocation
     *
     * @example
     * eventBus.once('system:ready', () => {
     *   console.log('System initialized!');
     * });
     */
    once<K extends EventName>(event: K, callback: EventCallback<EventPayloads[K]>): void;
    /**
     * Remove all listeners for an event (or all events if no event specified)
     */
    removeAllListeners(event?: EventName): void;
    /**
     * Get count of listeners for an event
     */
    listenerCount(event: EventName): number;
    /**
     * Get all events that have listeners
     */
    eventNames(): EventName[];
}
export declare const eventBus: EventBus;
export default eventBus;
/**
 * Type guard to check if a string is a valid event name
 */
export declare function isEventName(value: string): value is EventName;
/**
 * Global type declarations for window object
 * Allows TypeScript to recognize window.eventBus
 */
declare global {
    interface Window {
        eventBus: EventBus;
    }
}
//# sourceMappingURL=EventBus.d.ts.map