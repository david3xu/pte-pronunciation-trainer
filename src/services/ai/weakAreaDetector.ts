/**
 * Weak Area Detection Service
 *
 * Analyzes practice session data to identify patterns and weak areas.
 * Uses AI-powered pattern recognition to detect recurring pronunciation,
 * grammar, and comprehension issues.
 *
 * Phase 3: Weak Area Detection
 */

import type { TaskType } from '../../types/database';
import { supabase } from '../supabase/supabaseClient';

export interface WeakArea {
  id?: string;
  user_id: string;
  task_type: TaskType;
  area_type: 'phoneme' | 'word_type' | 'grammar' | 'comprehension' | 'fluency' | 'speed';
  area_name: string; // e.g., "/ʌ/ sound", "articles", "question comprehension"
  severity: number; // 1-10 (10 = most severe)
  error_count: number;
  first_detected: string;
  last_occurrence: string;
  improvement_trend: 'improving' | 'stable' | 'worsening' | 'new';
  examples: string[]; // Sample errors
  suggested_actions: string[];
}

export interface PatternAnalysisResult {
  weakAreas: WeakArea[];
  strengths: string[];
  overallTrend: 'improving' | 'stable' | 'declining';
  confidenceScore: number; // 0-100
}

/**
 * Analyze practice sessions to detect weak areas
 */
export async function detectWeakAreas(
  userId: string,
  taskType?: TaskType,
  lookbackDays: number = 14
): Promise<PatternAnalysisResult> {
  try {
    // 1. Fetch recent session data
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

    const { data: sessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select(`
        id,
        task_type,
        accuracy,
        started_at,
        session_items (
          item_text,
          user_response,
          is_correct,
          attempts,
          time_spent_sec
        )
      `)
      .eq('user_id', userId)
      .gte('started_at', cutoffDate.toISOString())
      .order('started_at', { ascending: false });

    if (sessionsError) {
      console.error('[WeakAreaDetector] Error fetching sessions:', sessionsError);
      return {
        weakAreas: [],
        strengths: [],
        overallTrend: 'stable',
        confidenceScore: 0,
      };
    }

    if (!sessions || sessions.length === 0) {
      console.log('[WeakAreaDetector] No sessions found for analysis');
      return {
        weakAreas: [],
        strengths: [],
        overallTrend: 'stable',
        confidenceScore: 0,
      };
    }

    // Filter by task type if specified
    const filteredSessions = taskType
      ? sessions.filter((s) => s.task_type === taskType)
      : sessions;

    // 2. Analyze patterns
    const patterns = analyzeSessionPatterns(filteredSessions, userId);

    // 3. Save weak areas to database
    if (patterns.weakAreas.length > 0) {
      await saveWeakAreas(userId, patterns.weakAreas);
    }

    return patterns;
  } catch (error) {
    console.error('[WeakAreaDetector] Unexpected error:', error);
    return {
      weakAreas: [],
      strengths: [],
      overallTrend: 'stable',
      confidenceScore: 0,
    };
  }
}

/**
 * Analyze session data to find patterns
 */
function analyzeSessionPatterns(
  sessions: any[],
  userId: string
): PatternAnalysisResult {
  const weakAreas: WeakArea[] = [];
  const strengths: string[] = [];
  const errorMap = new Map<string, any>();

  // Analyze each session
  sessions.forEach((session) => {
    const items = session.session_items || [];
    const taskType = session.task_type;

    items.forEach((item: any) => {
      if (!item.is_correct && item.attempts > 1) {
        // Identify error type based on task
        const errorTypes = identifyErrorTypes(
          taskType,
          item.item_text,
          item.user_response
        );

        errorTypes.forEach((errorType) => {
          if (!errorMap.has(errorType.key)) {
            errorMap.set(errorType.key, {
              task_type: taskType,
              area_type: errorType.type,
              area_name: errorType.name,
              error_count: 0,
              examples: [],
              first_detected: session.started_at,
              last_occurrence: session.started_at,
            });
          }

          const existing = errorMap.get(errorType.key);
          existing.error_count += 1;
          existing.last_occurrence = session.started_at;
          if (existing.examples.length < 5) {
            existing.examples.push(
              `"${item.item_text}" → "${item.user_response || 'no response'}"`
            );
          }
        });
      }

      // Track strengths (high accuracy items)
      if (item.is_correct && item.attempts === 1) {
        const strengthType = identifyStrengthType(taskType, item.item_text);
        if (strengthType && !strengths.includes(strengthType)) {
          strengths.push(strengthType);
        }
      }
    });
  });

  // Convert error map to weak areas with severity
  errorMap.forEach((data, _key) => {
    const severity = calculateSeverity(data.error_count, sessions.length);
    const trend = calculateTrend(data.first_detected, data.last_occurrence, data.error_count);

    weakAreas.push({
      user_id: userId,
      task_type: data.task_type,
      area_type: data.area_type,
      area_name: data.area_name,
      severity,
      error_count: data.error_count,
      first_detected: data.first_detected,
      last_occurrence: data.last_occurrence,
      improvement_trend: trend,
      examples: data.examples,
      suggested_actions: generateSuggestedActions(data.area_type, data.area_name),
    });
  });

  // Sort by severity (most severe first)
  weakAreas.sort((a, b) => b.severity - a.severity);

  // Calculate overall trend
  const overallTrend = calculateOverallTrend(sessions);

  // Confidence based on data volume
  const confidenceScore = Math.min(100, sessions.length * 10);

  return {
    weakAreas: weakAreas.slice(0, 10), // Top 10 weak areas
    strengths: strengths.slice(0, 5), // Top 5 strengths
    overallTrend,
    confidenceScore,
  };
}

/**
 * Identify error types from item and response
 */
function identifyErrorTypes(
  taskType: string,
  itemText: string,
  userResponse?: string
): Array<{ key: string; type: WeakArea['area_type']; name: string }> {
  const errors: Array<{ key: string; type: WeakArea['area_type']; name: string }> = [];

  if (taskType === 'vocabulary') {
    // Pronunciation errors (simplified heuristics)
    if (userResponse && userResponse.toLowerCase() !== itemText.toLowerCase()) {
      errors.push({
        key: 'vocab_pronunciation',
        type: 'phoneme',
        name: 'Pronunciation accuracy',
      });
    }
  } else if (taskType === 'rs' || taskType === 'wfd') {
    // Sentence repeat/dictation errors
    if (!userResponse) {
      errors.push({
        key: `${taskType}_missing_response`,
        type: 'comprehension',
        name: 'Missing or incomplete response',
      });
    } else {
      // Check for article errors (a, an, the)
      const missingArticles = checkArticleErrors(itemText, userResponse);
      if (missingArticles) {
        errors.push({
          key: `${taskType}_articles`,
          type: 'grammar',
          name: 'Article usage (a, an, the)',
        });
      }

      // Check for word omissions
      const wordCount = itemText.split(' ').length;
      const responseCount = userResponse.split(' ').length;
      if (responseCount < wordCount * 0.7) {
        errors.push({
          key: `${taskType}_word_omission`,
          type: 'comprehension',
          name: 'Word omission / incomplete recall',
        });
      }

      // Check for fluency (speed)
      errors.push({
        key: `${taskType}_fluency`,
        type: 'fluency',
        name: 'Fluency and delivery',
      });
    }
  } else if (taskType === 'asq') {
    // Answer short question errors
    if (!userResponse || userResponse.trim().length === 0) {
      errors.push({
        key: 'asq_no_answer',
        type: 'speed',
        name: 'Response speed (3-second limit)',
      });
    }
  }

  return errors;
}

/**
 * Check for article errors (simplified)
 */
function checkArticleErrors(target: string, response: string): boolean {
  const articles = ['a ', 'an ', 'the '];
  const targetLower = target.toLowerCase();
  const responseLower = response.toLowerCase();

  for (const article of articles) {
    const targetHas = targetLower.includes(article);
    const responseHas = responseLower.includes(article);
    if (targetHas !== responseHas) {
      return true;
    }
  }
  return false;
}

/**
 * Identify strength type from correct item
 */
function identifyStrengthType(taskType: string, itemText: string): string | null {
  if (taskType === 'vocabulary' && itemText.length > 10) {
    return 'Long word pronunciation';
  }
  if (taskType === 'rs' && itemText.split(' ').length > 15) {
    return 'Long sentence retention';
  }
  if (taskType === 'asq') {
    return 'Quick recall';
  }
  return null;
}

/**
 * Calculate severity (1-10 scale)
 */
function calculateSeverity(errorCount: number, totalSessions: number): number {
  const frequency = errorCount / Math.max(totalSessions, 1);
  return Math.min(10, Math.ceil(frequency * 10));
}

/**
 * Calculate improvement trend
 */
function calculateTrend(
  firstDetected: string,
  lastOccurrence: string,
  errorCount: number
): WeakArea['improvement_trend'] {
  const first = new Date(firstDetected);
  const last = new Date(lastOccurrence);
  const daysDiff = (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff < 2) {
    return 'new';
  }

  // Simple heuristic: if errors are recent, it's worsening
  const hoursSinceLast = (Date.now() - last.getTime()) / (1000 * 60 * 60);
  if (hoursSinceLast < 24 && errorCount > 3) {
    return 'worsening';
  }

  if (hoursSinceLast > 72) {
    return 'improving';
  }

  return 'stable';
}

/**
 * Calculate overall trend from sessions
 */
function calculateOverallTrend(sessions: any[]): 'improving' | 'stable' | 'declining' {
  if (sessions.length < 3) {
    return 'stable';
  }

  const recentSessions = sessions.slice(0, 3);
  const olderSessions = sessions.slice(-3);

  const recentAvg =
    recentSessions.reduce((sum: number, s: any) => sum + (s.accuracy || 0), 0) /
    recentSessions.length;
  const olderAvg =
    olderSessions.reduce((sum: number, s: any) => sum + (s.accuracy || 0), 0) /
    olderSessions.length;

  const improvement = recentAvg - olderAvg;

  if (improvement > 5) return 'improving';
  if (improvement < -5) return 'declining';
  return 'stable';
}

/**
 * Generate suggested actions for a weak area
 */
function generateSuggestedActions(
  areaType: WeakArea['area_type'],
  areaName: string
): string[] {
  const actions: string[] = [];

  if (areaType === 'phoneme') {
    actions.push(`Practice ${areaName} with minimal pairs (ship/sheep, bit/beat)`);
    actions.push('Record yourself and compare with native pronunciation');
    actions.push('Focus on mouth and tongue position for this sound');
  } else if (areaType === 'grammar') {
    actions.push(`Review ${areaName} rules with examples`);
    actions.push('Practice fill-in-the-blank exercises for this grammar point');
    actions.push('Read aloud sentences focusing on correct usage');
  } else if (areaType === 'comprehension') {
    actions.push('Practice active listening with note-taking');
    actions.push('Break down long sentences into smaller chunks');
    actions.push('Visualize the content as you listen');
  } else if (areaType === 'fluency') {
    actions.push('Practice shadowing (repeat immediately after hearing)');
    actions.push('Focus on smooth delivery, not perfect accuracy');
    actions.push('Record yourself to identify hesitations');
  } else if (areaType === 'speed') {
    actions.push('Use a timer to practice answering within time limit');
    actions.push('Build general knowledge (geography, science, history)');
    actions.push('Practice quick decision-making (answer in 1-2 words)');
  }

  return actions;
}

/**
 * Save weak areas to database
 */
async function saveWeakAreas(userId: string, weakAreas: WeakArea[]): Promise<void> {
  try {
    // Prepare data for upsert (update if exists, insert if new)
    const dataToSave = weakAreas.map((area) => ({
      user_id: area.user_id,
      task_type: area.task_type,
      area_type: area.area_type,
      area_name: area.area_name,
      severity: area.severity,
      error_count: area.error_count,
      first_detected: area.first_detected,
      last_occurrence: area.last_occurrence,
      improvement_trend: area.improvement_trend,
      examples: area.examples,
      suggested_actions: area.suggested_actions,
      analyzed_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('weak_area_analysis')
      .upsert(dataToSave, {
        onConflict: 'user_id,task_type,area_name',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('[WeakAreaDetector] Error saving weak areas:', error);
    } else {
      console.log(`[WeakAreaDetector] Saved ${weakAreas.length} weak areas for user ${userId}`);
    }
  } catch (error) {
    console.error('[WeakAreaDetector] Unexpected error saving weak areas:', error);
  }
}

/**
 * Get stored weak areas from database
 */
export async function getWeakAreas(
  userId: string,
  taskType?: TaskType
): Promise<WeakArea[]> {
  try {
    let query = supabase
      .from('weak_area_analysis')
      .select('*')
      .eq('user_id', userId)
      .order('severity', { ascending: false });

    if (taskType) {
      query = query.eq('task_type', taskType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[WeakAreaDetector] Error fetching weak areas:', error);
      return [];
    }

    return (data as WeakArea[]) || [];
  } catch (error) {
    console.error('[WeakAreaDetector] Unexpected error:', error);
    return [];
  }
}
