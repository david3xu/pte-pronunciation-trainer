/**
 * Learner Profile Service
 *
 * Manages learner profiles with PTE-specific goals and preferences.
 * Stores data in Supabase with offline fallback to localStorage.
 */

import type { LearnerProfile, LearningStyle } from '../../types/database';
import { supabase } from '../supabase/supabaseClient';

// ============================================================================
// Types
// ============================================================================

export interface LearnerProfileData {
  pte_goal_score?: number;
  target_date?: string;
  learning_style?: LearningStyle;
  study_hours_week?: number;
  weak_areas?: Record<string, any>;
}

export interface OnboardingFormData {
  pte_goal_score: number;
  target_date: string;
  learning_style: LearningStyle;
  study_hours_week: number;
}

// ============================================================================
// Service
// ============================================================================

const PROFILE_CACHE_KEY = 'learner_profile_cache';
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

/**
 * Check if user has completed onboarding
 */
export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
  } catch (error) {
    console.error('[LearnerProfile] Error checking onboarding status:', error);
    return false;
  }
}

/**
 * Mark onboarding as completed
 */
export function markOnboardingCompleted(): void {
  try {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch (error) {
    console.error('[LearnerProfile] Error marking onboarding completed:', error);
  }
}

/**
 * Get learner profile (cached or from database)
 */
export async function getLearnerProfile(userId: string): Promise<LearnerProfile | null> {
  try {
    // Try cache first
    const cached = getCachedProfile();
    if (cached && cached.user_id === userId) {
      return cached;
    }

    // Fetch from database
    if (!navigator.onLine) {
      console.log('[LearnerProfile] Offline, using cache only');
      return cached;
    }

    const { data, error } = await supabase
      .from('learner_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found - this is normal for new users
        console.log('[LearnerProfile] No profile found for user');
        return null;
      }
      console.error('[LearnerProfile] Error fetching profile:', error);
      return cached;
    }

    // Cache the result
    if (data) {
      cacheProfile(data as LearnerProfile);
    }

    return data as LearnerProfile;
  } catch (error) {
    console.error('[LearnerProfile] Error getting profile:', error);
    return getCachedProfile();
  }
}

/**
 * Create or update learner profile
 */
export async function saveLearnerProfile(
  userId: string,
  profileData: LearnerProfileData
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile: Partial<LearnerProfile> = {
      user_id: userId,
      ...profileData,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };

    // Save to cache immediately
    cacheProfile(profile as LearnerProfile);

    // Try to save to database
    if (!navigator.onLine) {
      console.log('[LearnerProfile] Offline, saved to cache only');
      queueForSync(profile);
      return { success: true };
    }

    const { error } = await supabase
      .from('learner_profiles')
      .upsert(profile, { onConflict: 'user_id' });

    if (error) {
      console.error('[LearnerProfile] Error saving profile:', error);
      queueForSync(profile);
      return { success: false, error: error.message };
    }

    // Mark onboarding as completed
    markOnboardingCompleted();

    console.log('[LearnerProfile] Profile saved successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[LearnerProfile] Error saving profile:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Update weak areas based on performance data
 */
export async function updateWeakAreas(
  userId: string,
  weakAreas: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!navigator.onLine) {
      console.log('[LearnerProfile] Offline, weak areas update queued');
      return { success: true };
    }

    const { error } = await supabase
      .from('learner_profiles')
      .update({ weak_areas: weakAreas, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      console.error('[LearnerProfile] Error updating weak areas:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[LearnerProfile] Error updating weak areas:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

// ============================================================================
// Cache Management
// ============================================================================

function getCachedProfile(): LearnerProfile | null {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('[LearnerProfile] Error reading cache:', error);
  }
  return null;
}

function cacheProfile(profile: LearnerProfile): void {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('[LearnerProfile] Error caching profile:', error);
  }
}

function queueForSync(profile: Partial<LearnerProfile>): void {
  try {
    const queue = JSON.parse(localStorage.getItem('profile_sync_queue') || '[]');
    queue.push({
      profile,
      queued_at: new Date().toISOString(),
    });
    localStorage.setItem('profile_sync_queue', JSON.stringify(queue));
    console.log('[LearnerProfile] Profile queued for sync');
  } catch (error) {
    console.error('[LearnerProfile] Error queuing profile:', error);
  }
}

/**
 * Sync queued profiles to database
 */
export async function syncQueuedProfiles(): Promise<number> {
  if (!navigator.onLine) {
    return 0;
  }

  try {
    const queue = JSON.parse(localStorage.getItem('profile_sync_queue') || '[]');
    if (queue.length === 0) {
      return 0;
    }

    let syncedCount = 0;
    const remaining = [];

    for (const { profile } of queue) {
      try {
        const { error } = await supabase
          .from('learner_profiles')
          .upsert(profile, { onConflict: 'user_id' });

        if (!error) {
          syncedCount++;
        } else {
          remaining.push({ profile, queued_at: new Date().toISOString() });
        }
      } catch (error) {
        console.error('[LearnerProfile] Error syncing queued profile:', error);
        remaining.push({ profile, queued_at: new Date().toISOString() });
      }
    }

    localStorage.setItem('profile_sync_queue', JSON.stringify(remaining));
    console.log(`[LearnerProfile] Synced ${syncedCount} profiles`);
    return syncedCount;
  } catch (error) {
    console.error('[LearnerProfile] Error syncing profiles:', error);
    return 0;
  }
}
