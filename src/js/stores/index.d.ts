/**
 * Main Zustand Store
 *
 * Combines all store slices into a single app store.
 * Replaces the EventBus pattern with reactive state management.
 *
 * Usage:
 * import { useAppStore } from './stores';
 *
 * // In vanilla JS components:
 * const audio = useAppStore.getState().audio;
 * audio.startAutoPlay();
 *
 * // Subscribe to changes:
 * useAppStore.subscribe(
 *   (state) => state.audio.isAutoPlaying,
 *   (isAutoPlaying) => console.log('Auto-play:', isAutoPlaying)
 * );
 *
 * // In React components (future):
 * const isAutoPlaying = useAppStore((state) => state.audio.isAutoPlaying);
 */
import type { AudioState, TTSState, SettingsState, VocabularyState, ProgressState, UIState } from './types';
export interface AppState {
    audio: AudioState;
    tts: TTSState;
    settings: SettingsState;
    vocabulary: VocabularyState;
    progress: ProgressState;
    ui: UIState;
}
/**
 * Main application store
 *
 * Middleware stack:
 * - subscribeWithSelector: Enables granular subscriptions
 * - devtools: Redux DevTools integration (development only)
 * - persist: LocalStorage persistence for settings and progress
 */
export declare const useAppStore: import("zustand").UseBoundStore<Omit<Omit<Omit<import("zustand").StoreApi<AppState>, "subscribe"> & {
    subscribe: {
        (listener: (selectedState: AppState, previousSelectedState: AppState) => void): () => void;
        <U>(selector: (state: AppState) => U, listener: (selectedState: U, previousSelectedState: U) => void, options?: {
            equalityFn?: ((a: U, b: U) => boolean) | undefined;
            fireImmediately?: boolean;
        } | undefined): () => void;
    };
}, "setState" | "devtools"> & {
    setState(partial: AppState | Partial<AppState> | ((state: AppState) => AppState | Partial<AppState>), replace?: false | undefined, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): void;
    setState(state: AppState | ((state: AppState) => AppState), replace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): void;
    devtools: {
        cleanup: () => void;
    };
}, "setState" | "persist"> & {
    setState(partial: AppState | Partial<AppState> | ((state: AppState) => AppState | Partial<AppState>), replace?: false | undefined, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    setState(state: AppState | ((state: AppState) => AppState), replace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AppState, {
            settings: SettingsState;
            progress: {
                completedItems: string[];
                currentIndex: number;
                totalItems: number;
                accuracy: number;
            };
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AppState) => void) => () => void;
        onFinishHydration: (fn: (state: AppState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AppState, {
            settings: SettingsState;
            progress: {
                completedItems: string[];
                currentIndex: number;
                totalItems: number;
                accuracy: number;
            };
        }, unknown>>;
    };
}>;
/**
 * Helper hooks for common store selections
 */
export declare const useAudioState: () => AudioState;
export declare const useIsAutoPlaying: () => boolean;
export declare const useCurrentIndex: () => number;
export declare const useTTSState: () => TTSState;
export declare const useIsSpeaking: () => boolean;
export declare const useSettings: () => SettingsState;
export declare const usePracticeMode: () => "rs" | "asq" | "wfd" | null;
export declare const useVocabulary: () => VocabularyState;
export declare const useCurrentItem: () => import("../../types").VocabularyTerm | import("../../types").PracticeItem | null;
export declare const useFilteredDataset: () => (import("../../types").VocabularyTerm | import("../../types").PracticeItem)[];
export declare const useProgress: () => ProgressState;
export declare const useAccuracy: () => number;
export declare const useUI: () => UIState;
export declare const useNotification: () => {
    message: string;
    type: "info" | "success" | "warning" | "error";
    isVisible: boolean;
} | null;
/**
 * Export all store types
 */
export * from './types';
//# sourceMappingURL=index.d.ts.map