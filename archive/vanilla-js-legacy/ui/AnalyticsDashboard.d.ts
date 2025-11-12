/**
 * Analytics Dashboard
 *
 * Displays user statistics and study progress from Supabase
 * Shows recent sessions, total words studied, and progress charts
 */
/**
 * AnalyticsDashboard - User statistics and progress visualization
 */
export declare class AnalyticsDashboard {
    private dashboardElement;
    private isVisible;
    /**
     * Initialize analytics dashboard
     */
    initialize(): Promise<void>;
    /**
     * Create dashboard HTML element
     */
    private createDashboardElement;
    /**
     * Bind event listeners
     */
    private bindEventListeners;
    /**
     * Show analytics dashboard
     */
    show(): Promise<void>;
    /**
     * Hide analytics dashboard
     */
    hide(): void;
    /**
     * Load user statistics from Supabase
     */
    private loadStatistics;
    /**
     * Update a stat value
     */
    private updateStat;
    /**
     * Render recent sessions list
     */
    private renderRecentSessions;
    /**
     * Format duration in seconds to readable string
     */
    private formatDuration;
    /**
     * Format dataset ID to readable name
     */
    private formatDatasetName;
    /**
     * Toggle visibility
     */
    toggle(): void;
}
export declare const analyticsDashboard: AnalyticsDashboard;
export default analyticsDashboard;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        analyticsDashboard: AnalyticsDashboard;
    }
}
//# sourceMappingURL=AnalyticsDashboard.d.ts.map