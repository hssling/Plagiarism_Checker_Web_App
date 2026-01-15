/**
 * Supabase Client Configuration
 * Used for anonymous analytics and future features
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create client only if credentials are provided
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Log analysis to Supabase (anonymous aggregate data only)
 */
export async function logAnalysis(data) {
    if (!supabase) {
        // Supabase not configured - analytics disabled
        return null;
    }

    try {
        const { error } = await supabase.from('analyses').insert({
            word_count: data.wordCount,
            similarity_score: data.overallScore,
            file_type: data.fileType || 'text',
            sources_checked: data.sourcesChecked,
            created_at: new Date().toISOString()
        });

        if (error) {
            console.warn('Analytics logging failed:', error.message);
        }

        return !error;
    } catch (err) {
        console.warn('Analytics error:', err);
        return false;
    }
}

/**
 * Get aggregate statistics (for dashboard display)
 */
export async function getStats() {
    if (!supabase) return null;

    try {
        const { data, error } = await supabase
            .from('analyses')
            .select('word_count, similarity_score')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) throw error;

        const totalAnalyses = data.length;
        const avgScore = data.reduce((sum, d) => sum + d.similarity_score, 0) / totalAnalyses;
        const totalWords = data.reduce((sum, d) => sum + d.word_count, 0);

        return {
            totalAnalyses,
            avgScore: avgScore.toFixed(1),
            totalWords
        };
    } catch (err) {
        console.warn('Stats fetch failed:', err);
        return null;
    }
}

export default supabase;
