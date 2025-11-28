/**
 * Intervention Engine
 *
 * Proactive AI that monitors user behavior and intervenes when appropriate.
 * Triggers helpful suggestions, break reminders, difficulty adjustments,
 * and mastery level-up prompts.
 *
 * Phase 4: Proactive AI
 */

import { supabase } from '../supabase/supabaseClient';
import type { TaskType } from '../../types/database';

export type InterventionType =
  | 'help_offer' // "Need help with this?"
  | 'difficulty_increase' // "You're doing great! Try harder content?"
  | 'difficulty_decrease' // "Let's try easier content first"
  | 'break_reminder' // "Take a 10-minute break"
  | 'fatigue_warning' // "You seem tired, come back later?"
  | 'mastery_levelup' // "You've mastered this! 🎉"
  | 'streak_celebration' // "5 correct in a row! 🔥"
  | 'encouragement' // "Don't give up! You're improving"
  | 'focus_suggestion'; // "Try focusing on [weak area]"

export interface Intervention {
  type: InterventionType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  actions: Array<{
    label: string;
    action: 'accept' | 'decline' | 'custom';
    customAction?: string;
  }>;
  metadata?: {
    suggestedDifficulty?: string;
    suggestedBreakMin?: number;
    achievementData?: any;
  };
}

export interface SessionMetrics {
  userId: string;
  sessionId?: string;
  taskType?: TaskType;
  itemsAttempted: number;
  itemsCorrect: number;
  currentStreak: number;
  longestStreak: number;
  accuracy: number;
  sessionDurationMin: number;
  recentErrors: number; // Last 5 items
  avgTimePerItemSec: number;
  todaySessionCount: number;
  todayTotalMinutes: number;
}

/**
 * Check if an intervention should be triggered
 */
export function checkForInterventions(metrics: SessionMetrics): Intervention | null {
  // Priority order: fatigue > help > break > mastery > difficulty

  // 1. Fatigue detection (highest priority)
  const fatigueIntervention = checkFatigue(metrics);
  if (fatigueIntervention) return fatigueIntervention;

  // 2. Help offer (struggling)
  const helpIntervention = checkNeedHelp(metrics);
  if (helpIntervention) return helpIntervention;

  // 3. Break reminder
  const breakIntervention = checkBreakNeeded(metrics);
  if (breakIntervention) return breakIntervention;

  // 4. Mastery level-up
  const masteryIntervention = checkMastery(metrics);
  if (masteryIntervention) return masteryIntervention;

  // 5. Streak celebration
  const streakIntervention = checkStreak(metrics);
  if (streakIntervention) return streakIntervention;

  // 6. Difficulty adjustment
  const difficultyIntervention = checkDifficulty(metrics);
  if (difficultyIntervention) return difficultyIntervention;

  return null;
}

/**
 * Check for fatigue (urgent)
 */
function checkFatigue(metrics: SessionMetrics): Intervention | null {
  // Trigger if:
  // - Session > 90 minutes OR
  // - Today's total > 180 minutes OR
  // - Recent errors > 4/5 AND session > 30 min
  const longSession = metrics.sessionDurationMin > 90;
  const longDay = metrics.todayTotalMinutes > 180;
  const strugglingLong = metrics.recentErrors >= 4 && metrics.sessionDurationMin > 30;

  if (longSession || longDay || strugglingLong) {
    return {
      type: 'fatigue_warning',
      priority: 'urgent',
      title: 'You might be getting tired',
      message: `You've been practicing for ${metrics.sessionDurationMin} minutes this session${
        longDay ? ` and ${metrics.todayTotalMinutes} minutes today` : ''
      }. Taking breaks improves retention and prevents burnout.`,
      actions: [
        { label: 'Take a break', action: 'accept' },
        { label: 'Continue practicing', action: 'decline' },
      ],
      metadata: {
        suggestedBreakMin: 15,
      },
    };
  }

  return null;
}

/**
 * Check if user needs help (struggling)
 */
function checkNeedHelp(metrics: SessionMetrics): Intervention | null {
  // Trigger if:
  // - Recent errors >= 4/5 (80% failure rate) AND
  // - Items attempted >= 5 (enough data)
  if (metrics.recentErrors >= 4 && metrics.itemsAttempted >= 5) {
    return {
      type: 'help_offer',
      priority: 'high',
      title: 'Need help with this?',
      message: `You've had ${metrics.recentErrors} errors in your last 5 attempts. Would you like some guidance or tips?`,
      actions: [
        { label: 'Yes, help me', action: 'accept' },
        { label: 'No, I\'ll keep trying', action: 'decline' },
      ],
    };
  }

  return null;
}

/**
 * Check if break is needed
 */
function checkBreakNeeded(metrics: SessionMetrics): Intervention | null {
  // Trigger if:
  // - Session duration >= 45 min AND items attempted >= 20
  if (metrics.sessionDurationMin >= 45 && metrics.itemsAttempted >= 20) {
    return {
      type: 'break_reminder',
      priority: 'medium',
      title: 'Time for a quick break?',
      message: `You've been practicing for ${metrics.sessionDurationMin} minutes and completed ${metrics.itemsAttempted} items. Great focus! A 5-minute break can help you stay sharp.`,
      actions: [
        { label: 'Take a 5-min break', action: 'accept' },
        { label: 'Continue', action: 'decline' },
      ],
      metadata: {
        suggestedBreakMin: 5,
      },
    };
  }

  return null;
}

/**
 * Check for mastery (high accuracy)
 */
function checkMastery(metrics: SessionMetrics): Intervention | null {
  // Trigger if:
  // - Accuracy >= 90% AND items attempted >= 10
  if (metrics.accuracy >= 90 && metrics.itemsAttempted >= 10) {
    return {
      type: 'mastery_levelup',
      priority: 'medium',
      title: '🎉 You\'ve mastered this level!',
      message: `Incredible! ${metrics.accuracy.toFixed(0)}% accuracy on ${metrics.itemsAttempted} items. You're ready for more challenging content.`,
      actions: [
        { label: 'Level up! (Harder)', action: 'accept' },
        { label: 'Keep practicing', action: 'decline' },
      ],
      metadata: {
        suggestedDifficulty: 'hard',
        achievementData: {
          accuracy: metrics.accuracy,
          itemsAttempted: metrics.itemsAttempted,
        },
      },
    };
  }

  return null;
}

/**
 * Check for streak celebration
 */
function checkStreak(metrics: SessionMetrics): Intervention | null {
  // Trigger if:
  // - Current streak >= 5 (5 correct in a row)
  if (metrics.currentStreak >= 5) {
    return {
      type: 'streak_celebration',
      priority: 'low',
      title: `🔥 ${metrics.currentStreak} in a row!`,
      message: `You're on fire! ${metrics.currentStreak} correct answers in a row. Keep up the momentum!`,
      actions: [
        { label: 'Thanks!', action: 'accept' },
      ],
      metadata: {
        achievementData: {
          streak: metrics.currentStreak,
        },
      },
    };
  }

  return null;
}

/**
 * Check for difficulty adjustment
 */
function checkDifficulty(metrics: SessionMetrics): Intervention | null {
  // Increase difficulty if: accuracy > 85% and items >= 10
  if (metrics.accuracy > 85 && metrics.itemsAttempted >= 10) {
    return {
      type: 'difficulty_increase',
      priority: 'low',
      title: 'Ready for a challenge?',
      message: `You're doing great with ${metrics.accuracy.toFixed(0)}% accuracy! Want to try harder content for faster improvement?`,
      actions: [
        { label: 'Yes, challenge me', action: 'accept' },
        { label: 'No, stay here', action: 'decline' },
      ],
      metadata: {
        suggestedDifficulty: 'hard',
      },
    };
  }

  // Decrease difficulty if: accuracy < 40% and items >= 10
  if (metrics.accuracy < 40 && metrics.itemsAttempted >= 10) {
    return {
      type: 'difficulty_decrease',
      priority: 'medium',
      title: 'Let\'s build confidence',
      message: `This content might be too challenging right now (${metrics.accuracy.toFixed(0)}% accuracy). Starting with easier material helps build a strong foundation.`,
      actions: [
        { label: 'Try easier content', action: 'accept' },
        { label: 'Keep trying', action: 'decline' },
      ],
      metadata: {
        suggestedDifficulty: 'easy',
      },
    };
  }

  return null;
}

/**
 * Calculate session metrics from practice data
 */
export async function calculateSessionMetrics(
  userId: string,
  sessionId: string
): Promise<SessionMetrics | null> {
  try {
    // Fetch current session
    const { data: session, error: sessionError } = await supabase
      .from('study_sessions')
      .select(`
        *,
        session_items (*)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('[InterventionEngine] Error fetching session:', sessionError);
      return null;
    }

    const items = session.session_items || [];
    const correctItems = items.filter((item: any) => item.is_correct);

    // Calculate current streak (consecutive correct)
    let currentStreak = 0;
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].is_correct) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    items.forEach((item: any) => {
      if (item.is_correct) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });

    // Recent errors (last 5 items)
    const recentItems = items.slice(-5);
    const recentErrors = recentItems.filter((item: any) => !item.is_correct).length;

    // Session duration
    const startedAt = new Date(session.started_at);
    const now = new Date();
    const sessionDurationMin = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60));

    // Average time per item
    const totalTime = items.reduce((sum: number, item: any) => sum + (item.time_spent_sec || 0), 0);
    const avgTimePerItemSec = items.length > 0 ? totalTime / items.length : 0;

    // Today's sessions
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todaySessions } = await supabase
      .from('study_sessions')
      .select('started_at, completed_at')
      .eq('user_id', userId)
      .gte('started_at', todayStart.toISOString());

    const todaySessionCount = todaySessions?.length || 0;
    const todayTotalMinutes = todaySessions?.reduce((total: number, s: any) => {
      if (s.completed_at) {
        const duration = (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / (1000 * 60);
        return total + duration;
      }
      return total;
    }, 0) || 0;

    return {
      userId,
      sessionId,
      taskType: session.task_type,
      itemsAttempted: items.length,
      itemsCorrect: correctItems.length,
      currentStreak,
      longestStreak,
      accuracy: items.length > 0 ? (correctItems.length / items.length) * 100 : 0,
      sessionDurationMin,
      recentErrors,
      avgTimePerItemSec,
      todaySessionCount,
      todayTotalMinutes,
    };
  } catch (error) {
    console.error('[InterventionEngine] Error calculating metrics:', error);
    return null;
  }
}

/**
 * Log intervention (for analytics)
 */
export async function logIntervention(
  userId: string,
  sessionId: string,
  intervention: Intervention,
  userResponse: 'accepted' | 'declined'
): Promise<void> {
  try {
    // Store in a simple log format (could create a new table if needed)
    const logData = {
      user_id: userId,
      session_id: sessionId,
      intervention_type: intervention.type,
      priority: intervention.priority,
      user_response: userResponse,
      metadata: {
        title: intervention.title,
        message: intervention.message,
        ...intervention.metadata,
      },
      created_at: new Date().toISOString(),
    };

    // For now, log to console (could save to ai_conversations or new table)
    console.log('[InterventionEngine] Intervention logged:', logData);

    // Optional: Save to ai_conversations as system messages
    await supabase.from('ai_conversations').insert({
      user_id: userId,
      session_id: sessionId,
      task_context: 'intervention',
      user_message: `[${intervention.type}] User ${userResponse}`,
      ai_response: intervention.message,
      context_data: intervention.metadata,
    });
  } catch (error) {
    console.error('[InterventionEngine] Error logging intervention:', error);
  }
}

/**
 * Check interventions periodically during practice
 */
export async function monitorSession(
  userId: string,
  sessionId: string
): Promise<Intervention | null> {
  const metrics = await calculateSessionMetrics(userId, sessionId);
  if (!metrics) return null;

  return checkForInterventions(metrics);
}
