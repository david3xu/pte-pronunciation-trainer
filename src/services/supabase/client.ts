/**
 * Supabase Client Re-export
 *
 * Re-exports Supabase client for use in services
 * This provides a consistent import path across the application
 */

import { supabase } from '../../ts/supabase/supabaseClient';

export const supabaseClient = supabase;
export default supabaseClient;
