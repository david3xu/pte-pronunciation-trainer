/**
 * Recommendation Engine
 *
 * Generates personalized learning recommendations based on:
 * - Weak area analysis
 * - Learner profile (goals, learning style)
 * - Recent practice performance
 * - Time until target exam date
 *
 * Phase 3: Weak Area Detection & Adaptive Learning
 */

import type { TaskType } from '../../types/database';
import { supabase } from '../supabase/supabaseClient';
import { detectWeakAreas, getWeakAreas } from './weakAreaDetector';

export interface Recommendation {
  id?: string;
  user_id: string;
  type: 'focus_area' | 'practice_drill' | 'resource' | 'strategy' | 'break' | 'exam_prep';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  task_type?: TaskType;
  title: string;
  description: string;
  reasoning: string;
  action_items: string[];
  estimated_time_min: number;
  dataset_id?: string; // Suggested dataset to practice
  difficulty?: 'easy' | 'normal' | 'hard';
  confidence: number; // 0-100
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  created_at?: string;
}

export interface RecommendationContext {
  userId: string;
  goalScore: number;
  targetDate?: string | null;
  learningStyle?: string;
  studyHoursWeek?: number;
  currentAccuracy?: number;
  sessionsCompleted?: number;
}

/**
 * Generate personalized recommendations for a user
 */
export async function generateRecommendations(
  context: RecommendationContext
): Promise<Recommendation[]> {
  try {
    const { userId, goalScore, targetDate, learningStyle } = context;
    const recommendations: Recommendation[] = [];

    // 1. Analyze weak areas (trigger detection if needed)
    await detectWeakAreas(userId);
    const weakAreas = await getWeakAreas(userId);

    // 2. Fetch learner profile (for future use)
    await supabase
      .from('learner_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 3. Fetch recent session stats
    const { data: recentSessions } = await supabase
      .from('study_sessions')
      .select('task_type, accuracy, items_attempted')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(10);

    const sessionStats = calculateSessionStats(recentSessions || []);

    // 4. Calculate time pressure
    const daysUntilExam = targetDate
      ? Math.ceil((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    // 5. Generate recommendations based on weak areas
    if (weakAreas.length > 0) {
      // Focus on top 3 most severe weak areas
      const topWeakAreas = weakAreas.slice(0, 3);

      topWeakAreas.forEach((area, index) => {
        const priority = index === 0 ? 'high' : 'medium';

        recommendations.push({
          user_id: userId,
          type: 'focus_area',
          priority,
          task_type: area.task_type,
          title: `Improve: ${area.area_name}`,
          description: `You've encountered ${area.error_count} errors related to ${area.area_name}. This is a key area for improvement.`,
          reasoning: `Severity: ${area.severity}/10. Trend: ${area.improvement_trend}. Addressing this will boost your ${area.task_type.toUpperCase()} score.`,
          action_items: area.suggested_actions,
          estimated_time_min: 15 + area.severity * 5,
          confidence: 90,
          status: 'pending',
        });
      });
    }

    // 6. Generate task-specific recommendations
    const taskRecommendations = generateTaskRecommendations(
      userId,
      sessionStats,
      goalScore,
      learningStyle
    );
    recommendations.push(...taskRecommendations);

    // 7. Generate study strategy recommendations
    if (daysUntilExam && daysUntilExam < 30) {
      recommendations.push({
        user_id: userId,
        type: 'exam_prep',
        priority: 'urgent',
        title: `Exam in ${daysUntilExam} days - Intensive prep mode`,
        description: `Your exam is approaching. Focus on high-impact practice and weak areas.`,
        reasoning: `With limited time, prioritize tasks with highest score weight: Speaking (RS, RA) and Listening (WFD).`,
        action_items: [
          'Practice RS (Repeat Sentence) daily - 20 min',
          'Practice WFD (Write From Dictation) - 15 min',
          'Take 1 mock exam per week',
          'Review weak areas from analytics',
        ],
        estimated_time_min: 60,
        confidence: 95,
        status: 'pending',
      });
    }

    // 8. Break reminder if needed
    if (sessionStats.todaySessions > 5) {
      recommendations.push({
        user_id: userId,
        type: 'break',
        priority: 'medium',
        title: 'Take a break - You\'ve practiced a lot today!',
        description: `You've completed ${sessionStats.todaySessions} sessions today. Taking breaks improves retention.`,
        reasoning: 'Studies show that distributed practice is more effective than massed practice.',
        action_items: [
          'Step away for 10-15 minutes',
          'Hydrate and stretch',
          'Come back refreshed for better performance',
        ],
        estimated_time_min: 15,
        confidence: 85,
        status: 'pending',
      });
    }

    // 9. Resource recommendations based on learning style
    if (learningStyle === 'visual') {
      recommendations.push({
        user_id: userId,
        type: 'resource',
        priority: 'low',
        title: 'Visual learner tip: Use IPA charts',
        description: 'As a visual learner, phonetic charts can help you master pronunciation.',
        reasoning: 'Visual aids improve retention for visual learners.',
        action_items: [
          'Print an IPA vowel chart',
          'Color-code difficult sounds',
          'Practice with mirror feedback',
        ],
        estimated_time_min: 10,
        confidence: 70,
        status: 'pending',
      });
    }

    // 10. Save recommendations to database
    if (recommendations.length > 0) {
      await saveRecommendations(recommendations);
    }

    // 11. Sort by priority and confidence
    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      return b.confidence - a.confidence;
    });
  } catch (error) {
    console.error('[RecommendationEngine] Error generating recommendations:', error);
    return [];
  }
}

/**
 * Calculate session statistics
 */
function calculateSessionStats(sessions: any[]): any {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return {
    totalSessions: sessions.length,
    todaySessions: sessions.filter(
      (s) => new Date(s.started_at || 0) >= todayStart
    ).length,
    avgAccuracy:
      sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / sessions.length
        : 0,
    totalItemsAttempted: sessions.reduce((sum, s) => sum + (s.items_attempted || 0), 0),
    taskDistribution: sessions.reduce((acc: any, s) => {
      acc[s.task_type] = (acc[s.task_type] || 0) + 1;
      return acc;
    }, {}),
  };
}

/**
 * Generate task-specific recommendations
 */
function generateTaskRecommendations(
  userId: string,
  sessionStats: any,
  goalScore: number,
  _learningStyle?: string
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const { taskDistribution, avgAccuracy } = sessionStats;

  // Recommend neglected high-value tasks
  const highValueTasks: TaskType[] = ['rs', 'wfd', 'ra'];
  const neglectedTasks = highValueTasks.filter(
    (task) => !taskDistribution[task] || taskDistribution[task] < 3
  );

  neglectedTasks.forEach((task) => {
    const taskNames: Record<string, string> = {
      rs: 'Repeat Sentence',
      wfd: 'Write From Dictation',
      ra: 'Read Aloud',
    };

    recommendations.push({
      user_id: userId,
      type: 'practice_drill',
      priority: 'high',
      task_type: task,
      title: `Practice ${taskNames[task]} - High-impact task`,
      description: `${taskNames[task]} contributes heavily to your speaking/listening score. You haven't practiced it much recently.`,
      reasoning: `${taskNames[task]} is crucial for reaching ${goalScore}+ score. Balanced practice across all tasks is important.`,
      action_items: [
        `Start with 10 ${taskNames[task]} exercises`,
        'Focus on accuracy over speed initially',
        'Review AI feedback after each attempt',
      ],
      estimated_time_min: 20,
      confidence: 85,
      status: 'pending',
    });
  });

  // Recommend difficulty adjustment
  if (avgAccuracy > 85) {
    recommendations.push({
      user_id: userId,
      type: 'strategy',
      priority: 'medium',
      title: 'Increase difficulty - You\'re doing great!',
      description: `Your average accuracy is ${avgAccuracy.toFixed(1)}%. Challenge yourself with harder content.`,
      reasoning: 'Progressive overload leads to faster improvement.',
      action_items: [
        'Switch to "Hard" difficulty in vocabulary',
        'Practice advanced-level RS sentences',
        'Aim for 70-80% accuracy in harder content',
      ],
      estimated_time_min: 0,
      confidence: 80,
      status: 'pending',
    });
  } else if (avgAccuracy < 50) {
    recommendations.push({
      user_id: userId,
      type: 'strategy',
      priority: 'high',
      title: 'Build fundamentals - Start with easier content',
      description: `Your average accuracy is ${avgAccuracy.toFixed(1)}%. Building confidence with easier content will help.`,
      reasoning: 'Mastering basics creates a strong foundation for advanced skills.',
      action_items: [
        'Switch to "Easy" or "Normal" difficulty',
        'Focus on shorter sentences/words first',
        'Aim for 80%+ accuracy before increasing difficulty',
      ],
      estimated_time_min: 0,
      confidence: 90,
      status: 'pending',
    });
  }

  return recommendations;
}

/**
 * Save recommendations to database
 */
async function saveRecommendations(recommendations: Recommendation[]): Promise<void> {
  try {
    const dataToSave = recommendations.map((rec) => ({
      user_id: rec.user_id,
      type: rec.type,
      priority: rec.priority,
      task_type: rec.task_type || null,
      title: rec.title,
      description: rec.description,
      reasoning: rec.reasoning,
      action_items: rec.action_items,
      estimated_time_min: rec.estimated_time_min,
      dataset_id: rec.dataset_id || null,
      difficulty: rec.difficulty || null,
      confidence: rec.confidence,
      status: rec.status,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('adaptive_recommendations')
      .insert(dataToSave);

    if (error) {
      console.error('[RecommendationEngine] Error saving recommendations:', error);
    } else {
      console.log(`[RecommendationEngine] Saved ${recommendations.length} recommendations`);
    }
  } catch (error) {
    console.error('[RecommendationEngine] Unexpected error saving:', error);
  }
}

/**
 * Get stored recommendations from database
 */
export async function getRecommendations(
  userId: string,
  status?: Recommendation['status']
): Promise<Recommendation[]> {
  try {
    let query = supabase
      .from('adaptive_recommendations')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[RecommendationEngine] Error fetching recommendations:', error);
      return [];
    }

    return (data as Recommendation[]) || [];
  } catch (error) {
    console.error('[RecommendationEngine] Unexpected error:', error);
    return [];
  }
}

/**
 * Update recommendation status
 */
export async function updateRecommendationStatus(
  recommendationId: string,
  status: Recommendation['status']
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('adaptive_recommendations')
      .update({
        status,
        acted_on_at: new Date().toISOString(),
      })
      .eq('id', recommendationId);

    if (error) {
      console.error('[RecommendationEngine] Error updating recommendation:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[RecommendationEngine] Unexpected error:', error);
    return { success: false, error: error.message };
  }
}
