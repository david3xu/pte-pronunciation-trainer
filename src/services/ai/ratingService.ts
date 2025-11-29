/**
 * AI Response Rating Service
 *
 * Handles rating of AI tutor responses for quality improvement and analytics.
 * Phase 2: Ratings saved to ai_conversations table
 */

import { supabase } from '../supabase/supabaseClient';

export interface RatingData {
  messageId: string;
  rating: 'helpful' | 'not_helpful';
  userId: string;
  feedback?: string; // Optional text feedback
}

/**
 * Save or update rating for an AI response
 *
 * Note: Since we don't store conversation_id on the client side,
 * we'll need to match by user_id + timestamp + ai_response content.
 * For now, we'll store ratings locally and sync them when possible.
 */
export async function rateAIResponse(
  messageContent: string,
  rating: 'helpful' | 'not_helpful',
  userId: string,
  timestamp: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId) {
      // Store locally for anonymous users
      console.warn('[RatingService] No userId provided, rating not saved to database');
      return { success: false, error: 'User not authenticated' };
    }

    // Find the conversation record by matching ai_response and user_id
    // within a time window (±5 seconds to account for timing differences)
    const timestampStart = new Date(timestamp.getTime() - 5000).toISOString();
    const timestampEnd = new Date(timestamp.getTime() + 5000).toISOString();

    const { data: conversations, error: fetchError } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('ai_response', messageContent)
      .gte('created_at', timestampStart)
      .lte('created_at', timestampEnd)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('[RatingService] Error fetching conversation:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!conversations || conversations.length === 0) {
      console.warn('[RatingService] Conversation not found in database');
      return { success: false, error: 'Conversation not found' };
    }

    const conversationId = conversations[0]?.id;
    if (!conversationId) {
      return { success: false, error: 'Invalid conversation ID' };
    }

    // Update the rating
    const ratingValue = rating === 'helpful' ? 5 : 1;

    const { error: updateError } = await supabase
      .from('ai_conversations')
      .update({
        helpful_rating: ratingValue,
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('[RatingService] Error updating rating:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`[RatingService] Rating saved: ${rating} (${ratingValue}/5)`);
    return { success: true };
  } catch (error) {
    console.error('[RatingService] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


