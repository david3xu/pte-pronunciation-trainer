/**
 * Analytics Dashboard
 *
 * Displays user statistics and study progress from Supabase
 * Shows recent sessions, total words studied, and progress charts
 */
import { syncService } from '../supabase/syncService';
/**
 * AnalyticsDashboard - User statistics and progress visualization
 */
export class AnalyticsDashboard {
    dashboardElement = null;
    isVisible = false;
    /**
     * Initialize analytics dashboard
     */
    async initialize() {
        console.log('[AnalyticsDashboard] Initializing...');
        // Create dashboard element
        this.createDashboardElement();
        // Bind event listeners
        this.bindEventListeners();
        console.log('[AnalyticsDashboard] ✅ Initialized successfully');
    }
    /**
     * Create dashboard HTML element
     */
    createDashboardElement() {
        // Check if already exists
        if (document.getElementById('analyticsDashboard')) {
            this.dashboardElement = document.getElementById('analyticsDashboard');
            return;
        }
        const dashboard = document.createElement('div');
        dashboard.id = 'analyticsDashboard';
        dashboard.className = 'analytics-dashboard hidden';
        dashboard.innerHTML = `
      <div class="analytics-backdrop"></div>
      <div class="analytics-modal">
        <div class="analytics-header">
          <h2>📊 Your Progress</h2>
          <button class="analytics-close" id="closeAnalytics">×</button>
        </div>
        <div class="analytics-content">
          <div class="analytics-loading">
            <div class="loading-spinner"></div>
            <p>Loading your statistics...</p>
          </div>
          <div class="analytics-stats hidden">
            <!-- Profile Stats -->
            <div class="stats-section">
              <h3>Overall Statistics</h3>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-icon">📚</div>
                  <div class="stat-value" id="totalWords">0</div>
                  <div class="stat-label">Words Studied</div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">🎯</div>
                  <div class="stat-value" id="totalSessions">0</div>
                  <div class="stat-label">Practice Sessions</div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">🔥</div>
                  <div class="stat-value" id="currentStreak">0</div>
                  <div class="stat-label">Day Streak</div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">🏆</div>
                  <div class="stat-value" id="longestStreak">0</div>
                  <div class="stat-label">Longest Streak</div>
                </div>
              </div>
            </div>

            <!-- Recent Sessions -->
            <div class="stats-section">
              <h3>Recent Study Sessions</h3>
              <div id="recentSessionsList" class="sessions-list">
                <p class="no-sessions">No sessions recorded yet. Start studying!</p>
              </div>
            </div>
          </div>
          <div class="analytics-error hidden">
            <p>⚠️ Failed to load statistics. Please try again.</p>
          </div>
        </div>
      </div>
    `;
        document.body.appendChild(dashboard);
        this.dashboardElement = dashboard;
    }
    /**
     * Bind event listeners
     */
    bindEventListeners() {
        // Close button
        const closeBtn = document.getElementById('closeAnalytics');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        // Backdrop click to close
        const backdrop = this.dashboardElement?.querySelector('.analytics-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => this.hide());
        }
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
    /**
     * Show analytics dashboard
     */
    async show() {
        if (!this.dashboardElement)
            return;
        // Check if user is authenticated
        if (!syncService.isAvailable()) {
            alert('Please login to view your analytics');
            return;
        }
        this.isVisible = true;
        this.dashboardElement.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        // Load statistics
        await this.loadStatistics();
    }
    /**
     * Hide analytics dashboard
     */
    hide() {
        if (!this.dashboardElement)
            return;
        this.isVisible = false;
        this.dashboardElement.classList.add('hidden');
        document.body.style.overflow = '';
    }
    /**
     * Load user statistics from Supabase
     */
    async loadStatistics() {
        const loadingEl = this.dashboardElement?.querySelector('.analytics-loading');
        const statsEl = this.dashboardElement?.querySelector('.analytics-stats');
        const errorEl = this.dashboardElement?.querySelector('.analytics-error');
        if (!loadingEl || !statsEl || !errorEl)
            return;
        // Show loading
        loadingEl.classList.remove('hidden');
        statsEl.classList.add('hidden');
        errorEl.classList.add('hidden');
        try {
            const stats = await syncService.getUserStats();
            if (!stats) {
                throw new Error('Failed to load statistics');
            }
            // Update profile stats
            const profile = stats.profile;
            if (profile) {
                this.updateStat('totalWords', profile.total_words_studied || 0);
                this.updateStat('totalSessions', profile.total_practice_sessions || 0);
                this.updateStat('currentStreak', profile.current_streak_days || 0);
                this.updateStat('longestStreak', profile.longest_streak_days || 0);
            }
            // Update recent sessions
            this.renderRecentSessions(stats.recentSessions);
            // Show stats
            loadingEl.classList.add('hidden');
            statsEl.classList.remove('hidden');
        }
        catch (error) {
            console.error('[AnalyticsDashboard] Error loading stats:', error);
            loadingEl.classList.add('hidden');
            errorEl.classList.remove('hidden');
        }
    }
    /**
     * Update a stat value
     */
    updateStat(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value.toString();
        }
    }
    /**
     * Render recent sessions list
     */
    renderRecentSessions(sessions) {
        const listEl = document.getElementById('recentSessionsList');
        if (!listEl)
            return;
        if (!sessions || sessions.length === 0) {
            listEl.innerHTML = '<p class="no-sessions">No sessions recorded yet. Start studying!</p>';
            return;
        }
        const html = sessions.map(session => {
            const date = new Date(session.completed_at);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const duration = this.formatDuration(session.duration_seconds);
            return `
        <div class="session-item">
          <div class="session-icon">📖</div>
          <div class="session-details">
            <div class="session-dataset">${this.formatDatasetName(session.dataset_id)}</div>
            <div class="session-meta">
              ${session.words_studied} words · ${duration} · ${dateStr} ${timeStr}
            </div>
          </div>
        </div>
      `;
        }).join('');
        listEl.innerHTML = html;
    }
    /**
     * Format duration in seconds to readable string
     */
    formatDuration(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes < 60) {
            return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    /**
     * Format dataset ID to readable name
     */
    formatDatasetName(datasetId) {
        const names = {
            'pte-beginner': 'PTE Beginner',
            'pte-intermediate': 'PTE Intermediate',
            'pte-advanced': 'PTE Advanced',
            'pte-repeat-sentence': 'Repeat Sentence',
            'pte-answer-short-question': 'Answer Short Question',
            'pte-write-from-dictation': 'Write From Dictation',
            'pte-fib-listening': 'FIB Listening',
            'pte-ra': 'Read Aloud',
            'pte-rs': 'Repeat Sentence',
            'pte-must-know': 'Must-Know Vocabulary',
            'pte-wfd-vocab': 'WFD Vocabulary',
            'pte-rs-wfd-vocab': 'RS/WFD Vocabulary',
            'pte-reading-fib': 'Reading FIB',
            'pte-reading-fib-drag': 'Reading FIB Drag',
            'pte-asq-answers': 'ASQ Answers',
            'pte-high-frequency': 'High Frequency',
        };
        return names[datasetId] || datasetId;
    }
    /**
     * Toggle visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        }
        else {
            this.show();
        }
    }
}
// Export singleton instance
export const analyticsDashboard = new AnalyticsDashboard();
// Default export
export default analyticsDashboard;
// Expose as global reference
if (typeof window !== 'undefined') {
    window.analyticsDashboard = analyticsDashboard;
}
//# sourceMappingURL=AnalyticsDashboard.js.map