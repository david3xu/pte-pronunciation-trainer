/**
 * AI Context Builder for AI-Powered PTE Trainer
 *
 * Builds rich context for AI tutor by combining:
 * - Learner profile (goals, weak areas, learning style)
 * - Current practice session
 * - Recent performance errors
 * - Conversation history
 *
 * This context enables the AI to provide personalized, context-aware responses.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database, TaskType } from '../../types/database';

// ============================================================================
// Types
// ============================================================================

export interface CurrentItem {
  text: string;
  userResponse?: string;
  transcription?: string;
  score?: number;
  attempts?: number;
}

export interface LearnerProfile {
  goalScore: number;
  weakAreas: Record<string, any>;
  learningStyle: string;
  targetDate: string;
  studyHoursPerWeek?: number;
}

export interface RecentError {
  item: string;
  error: string;
  timestamp: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIContext {
  // Session context
  sessionId?: string;
  taskType: TaskType;

  // Current item context
  currentItem: CurrentItem;

  // Learner context (from database)
  learnerProfile: LearnerProfile;

  // Historical context
  recentErrors: RecentError[];

  // Conversation history
  previousMessages: ConversationMessage[];

  // Session stats
  sessionStats?: {
    itemsAttempted: number;
    itemsCorrect: number;
    accuracy: number;
    duration: number; // seconds
  };
}

// ============================================================================
// Context Builder Class
// ============================================================================

export class ContextBuilder {
  private supabase: SupabaseClient<Database> | null = null;

  constructor() {
    this.initializeSupabase();
  }

  private initializeSupabase(): void {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    } else {
      console.warn('[ContextBuilder] Supabase not configured, context will be limited');
    }
  }

  /**
   * Build complete AI context for a user and task type
   *
   * @param userId - User ID
   * @param taskType - Task type (rs, asq, wfd, etc.)
   * @param currentItem - Current item being practiced (optional)
   * @returns Complete AI context
   */
  async buildContext(
    userId: string,
    taskType: TaskType,
    currentItem?: CurrentItem
  ): Promise<AIContext> {
    if (!this.supabase) {
      // Offline mode: return minimal context
      return this.buildOfflineContext(taskType, currentItem);
    }

    try {
      // Fetch all context data in parallel for performance
      const [profile, currentSession, recentErrors, conversationHistory] = await Promise.all([
        this.fetchLearnerProfile(userId),
        this.fetchCurrentSession(userId, taskType),
        this.fetchRecentErrors(userId, taskType),
        this.fetchConversationHistory(userId, taskType),
      ]);

      // Build session stats
      const sessionStats = currentSession
        ? {
            // @ts-ignore - Supabase client type inference limitation with custom Database type
            itemsAttempted: currentSession.items_attempted,
            // @ts-ignore - Supabase client type inference limitation with custom Database type
            itemsCorrect: currentSession.items_correct,
            // @ts-ignore - Supabase client type inference limitation with custom Database type
            accuracy: currentSession.accuracy || 0,
            // @ts-ignore - Supabase client type inference limitation with custom Database type
            duration: currentSession.duration_sec || 0,
          }
        : undefined;

      return {
        // @ts-ignore - Supabase client type inference limitation with custom Database type
        sessionId: currentSession?.id,
        taskType,
        currentItem: currentItem || { text: '' },
        learnerProfile: profile,
        recentErrors,
        previousMessages: conversationHistory,
        sessionStats,
      };
    } catch (error) {
      console.error('[ContextBuilder] Error building context:', error);
      // Fallback to offline context
      return this.buildOfflineContext(taskType, currentItem);
    }
  }

  /**
   * Fetch learner profile from database
   */
  private async fetchLearnerProfile(userId: string): Promise<LearnerProfile> {
    if (!this.supabase) {
      return this.getDefaultProfile();
    }

    try {
      // @ts-ignore - Supabase client type inference limitation
      const { data, error } = await this.supabase
        .from('learner_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.warn('[ContextBuilder] Learner profile not found, using defaults');
        return this.getDefaultProfile();
      }

      return {
        // @ts-ignore - Supabase client type inference limitation with custom Database type
        goalScore: data.pte_goal_score || 65,
        // @ts-ignore - Supabase client type inference limitation with custom Database type
        weakAreas: data.weak_areas || {},
        // @ts-ignore - Supabase client type inference limitation with custom Database type
        learningStyle: data.learning_style || 'mixed',
        // @ts-ignore - Supabase client type inference limitation with custom Database type
        targetDate: data.target_date || 'not set',
        // @ts-ignore - Supabase client type inference limitation with custom Database type
        studyHoursPerWeek: data.study_hours_week || undefined,
      };
    } catch (error) {
      console.error('[ContextBuilder] Error fetching profile:', error);
      return this.getDefaultProfile();
    }
  }

  /**
   * Fetch current active session
   */
  private async fetchCurrentSession(userId: string, taskType: TaskType) {
    if (!this.supabase) return null;

    try {
      // @ts-ignore - Supabase client type inference limitation
      const { data, error } = await this.supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('task_type', taskType)
        .is('completed_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error if no session

      if (error) {
        console.warn('[ContextBuilder] Error fetching current session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[ContextBuilder] Error fetching session:', error);
      return null;
    }
  }

  /**
   * Fetch recent errors (items with low scores)
   */
  private async fetchRecentErrors(
    userId: string,
    taskType: TaskType
  ): Promise<RecentError[]> {
    if (!this.supabase) return [];

    try {
      // First, get recent sessions of this task type
      // @ts-ignore - Supabase client type inference limitation
      const { data: sessions } = await this.supabase
        .from('practice_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('task_type', taskType)
        .order('started_at', { ascending: false })
        .limit(5); // Last 5 sessions

      if (!sessions || sessions.length === 0) return [];

      // @ts-ignore - Supabase client type inference limitation with custom Database type
      const sessionIds = sessions.map((s) => s.id);

      // Get items from these sessions with low scores
      // @ts-ignore - Supabase client type inference limitation
      const { data: items, error } = await this.supabase
        .from('session_items')
        .select('item_text, user_response, score, attempted_at')
        .in('session_id', sessionIds)
        .lt('score', 70)
        .order('attempted_at', { ascending: false })
        .limit(10);

      if (error || !items) {
        console.warn('[ContextBuilder] Error fetching recent errors:', error);
        return [];
      }

      return items.map((item) => ({
        // @ts-ignore - Supabase client type inference limitation with custom Database type
        item: item.item_text,
        // @ts-ignore - Supabase client type inference limitation with custom Database type
        error: `Expected: "${item.item_text}", Got: "${item.user_response || 'no response'}", Score: ${item.score || 0}`,
        // @ts-ignore - Supabase client type inference limitation with custom Database type
        timestamp: item.attempted_at,
      }));
    } catch (error) {
      console.error('[ContextBuilder] Error fetching errors:', error);
      return [];
    }
  }

  /**
   * Fetch conversation history
   */
  private async fetchConversationHistory(
    userId: string,
    taskType: TaskType
  ): Promise<ConversationMessage[]> {
    if (!this.supabase) return [];

    try {
      // @ts-ignore - Supabase client type inference limitation
      const { data, error } = await this.supabase
        .from('ai_conversations')
        .select('user_message, ai_response, created_at')
        .eq('user_id', userId)
        .eq('task_context', taskType)
        .order('created_at', { ascending: false })
        .limit(10); // Last 10 exchanges = 20 messages

      if (error || !data) {
        console.warn('[ContextBuilder] Error fetching conversation history:', error);
        return [];
      }

      // Flatten to alternating user/assistant messages
      const messages: ConversationMessage[] = [];
      data.reverse().forEach((conv) => {
        messages.push({
          role: 'user',
          // @ts-ignore - Supabase client type inference limitation with custom Database type
          content: conv.user_message,
          // @ts-ignore - Supabase client type inference limitation with custom Database type
          timestamp: conv.created_at,
        });
        messages.push({
          role: 'assistant',
          // @ts-ignore - Supabase client type inference limitation with custom Database type
          content: conv.ai_response,
          // @ts-ignore - Supabase client type inference limitation with custom Database type
          timestamp: conv.created_at,
        });
      });

      return messages;
    } catch (error) {
      console.error('[ContextBuilder] Error fetching conversation history:', error);
      return [];
    }
  }

  /**
   * Build offline context when database is unavailable
   */
  private buildOfflineContext(
    taskType: TaskType,
    currentItem?: CurrentItem
  ): AIContext {
    return {
      taskType,
      currentItem: currentItem || { text: '' },
      learnerProfile: this.getDefaultProfile(),
      recentErrors: [],
      previousMessages: [],
    };
  }

  /**
   * Get default learner profile
   */
  private getDefaultProfile(): LearnerProfile {
    return {
      goalScore: 65,
      weakAreas: {},
      learningStyle: 'mixed',
      targetDate: 'not set',
    };
  }

  /**
   * Convert AIContext to formatted string for AI prompt
   *
   * This creates a human-readable context summary that the AI can understand.
   */
  formatContextForAI(context: AIContext): string {
    let prompt = `## Learner Context\n\n`;

    // Learner profile
    prompt += `**Goal:** PTE score of ${context.learnerProfile.goalScore}\n`;
    prompt += `**Target Date:** ${context.learnerProfile.targetDate}\n`;
    prompt += `**Learning Style:** ${context.learnerProfile.learningStyle}\n`;

    if (context.learnerProfile.studyHoursPerWeek) {
      prompt += `**Study Hours/Week:** ${context.learnerProfile.studyHoursPerWeek}\n`;
    }

    // Weak areas
    const weakAreas = Object.keys(context.learnerProfile.weakAreas);
    if (weakAreas.length > 0) {
      prompt += `**Known Weak Areas:** ${weakAreas.join(', ')}\n`;
    }

    // Current session stats
    if (context.sessionStats) {
      prompt += `\n## Current Session\n\n`;
      prompt += `**Task Type:** ${context.taskType.toUpperCase()}\n`;
      prompt += `**Items Attempted:** ${context.sessionStats.itemsAttempted}\n`;
      prompt += `**Items Correct:** ${context.sessionStats.itemsCorrect}\n`;
      prompt += `**Current Accuracy:** ${context.sessionStats.accuracy.toFixed(1)}%\n`;
      prompt += `**Duration:** ${Math.floor(context.sessionStats.duration / 60)} minutes\n`;
    }

    // Recent errors
    if (context.recentErrors.length > 0) {
      prompt += `\n## Recent Mistakes\n\n`;
      context.recentErrors.slice(0, 5).forEach((error, index) => {
        prompt += `${index + 1}. ${error.error}\n`;
      });
    }

    // Conversation history
    if (context.previousMessages.length > 0) {
      prompt += `\n## Recent Conversation\n\n`;
      context.previousMessages.slice(-6).forEach((msg) => {
        prompt += `**${msg.role === 'user' ? 'Learner' : 'You'}:** ${msg.content}\n\n`;
      });
    }

    // Current item
    if (context.currentItem.text) {
      prompt += `\n## Current Item\n\n`;
      prompt += `**Text:** "${context.currentItem.text}"\n`;
      if (context.currentItem.userResponse) {
        prompt += `**User Response:** "${context.currentItem.userResponse}"\n`;
      }
      if (context.currentItem.score !== undefined) {
        prompt += `**Score:** ${context.currentItem.score}/100\n`;
      }
      if (context.currentItem.attempts !== undefined) {
        prompt += `**Attempts:** ${context.currentItem.attempts}\n`;
      }
    }

    return prompt;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let contextBuilderInstance: ContextBuilder | null = null;

export function getContextBuilder(): ContextBuilder {
  if (!contextBuilderInstance) {
    contextBuilderInstance = new ContextBuilder();
  }
  return contextBuilderInstance;
}

export default ContextBuilder;
