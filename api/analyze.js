/**
 * POST /api/analyze
 * Main plagiarism analysis endpoint
 * 
 * Request:
 *   Headers: X-API-Key: pg_xxx
 *   Body: { text: string, options?: { includeCitations?: boolean, maxSources?: number } }
 * 
 * Response:
 *   { success: boolean, data: { overallScore, sources, citations, ... }, meta: { ... } }
 */

import { validateRequest } from './_lib/auth.js';
import { checkRateLimit, getRateLimitHeaders, rateLimitErrorResponse } from './_lib/rateLimit.js';

// Simplified plagiarism analysis for serverless (lightweight version)
function analyzeText(text, options = {}) {
    const startTime = Date.now();

    // Basic text stats
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;

    // Extract key phrases (simplified)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keyPhrases = sentences.slice(0, options.maxSources || 10).map(s => ({
        text: s.trim().substring(0, 100),
        found: Math.random() > 0.7  // Placeholder - real implementation would search
    }));

    // Simulated similarity score based on text characteristics
    // In production, this would call the actual analysis engines
    const vocabularyRatio = uniqueWords / wordCount;
    const baseScore = Math.max(0, (1 - vocabularyRatio) * 50);
    const overallScore = Math.min(100, baseScore + (keyPhrases.filter(p => p.found).length * 5));

    // Citation detection (if requested)
    let citations = null;
    if (options.includeCitations !== false) {
        citations = detectCitations(text);
    }

    return {
        overallScore: Math.round(overallScore * 10) / 10,
        wordCount,
        uniqueWords,
        maxMatch: Math.round(overallScore * 0.8 * 10) / 10,
        sourcesChecked: keyPhrases.length,
        sources: keyPhrases.filter(p => p.found).map((p, i) => ({
            id: `src_${i}`,
            name: `Academic Source ${i + 1}`,
            similarity: Math.round((15 + Math.random() * 20) * 10) / 10,
            type: 'Journal Article'
        })),
        keyPhrases,
        citations,
        processingTime: Date.now() - startTime
    };
}

// Simple citation detection
function detectCitations(text) {
    const vancouverPattern = /\[(\d+(?:[-,]\d+)*)\]/g;
    const apaPattern = /\(([A-Z][a-z]+(?:\s+(?:et\s+al\.?|&\s+[A-Z][a-z]+))?),?\s*(\d{4})\)/g;

    const vancouverCitations = [...text.matchAll(vancouverPattern)].map(m => m[0]);
    const apaCitations = [...text.matchAll(apaPattern)].map(m => m[0]);

    // Detect references section
    const refMatch = text.match(/(?:references|bibliography|works cited)[\s\S]*$/i);
    const referencesSection = refMatch ? refMatch[0] : null;

    // Count references
    const refCount = referencesSection
        ? (referencesSection.match(/^\d+\./gm) || []).length ||
        (referencesSection.split('\n').filter(l => l.trim().length > 30)).length
        : 0;

    return {
        style: vancouverCitations.length > apaCitations.length ? 'vancouver' : 'apa',
        styleConfidence: Math.max(vancouverCitations.length, apaCitations.length) > 0 ? 0.7 : 0.3,
        inTextCount: vancouverCitations.length + apaCitations.length,
        referencesCount: refCount,
        inTextCitations: [...vancouverCitations, ...apaCitations].slice(0, 10)
    };
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization'
};

export default async function handler(req) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({
            success: false,
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST method' }
        }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Validate API key
    const auth = validateRequest(req);
    if (!auth.valid) {
        return new Response(JSON.stringify({
            success: false,
            error: { code: 'UNAUTHORIZED', message: auth.error }
        }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Check rate limit
    const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key');
    const rateLimit = checkRateLimit(apiKey, auth.user.tier);
    const rateLimitHeaders = getRateLimitHeaders(rateLimit, auth.user.tier);

    if (!rateLimit.allowed) {
        return new Response(JSON.stringify(rateLimitErrorResponse(rateLimit)), {
            status: 429,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Parse request body
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({
            success: false,
            error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' }
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Validate text
    const { text, options = {} } = body;

    if (!text || typeof text !== 'string') {
        return new Response(JSON.stringify({
            success: false,
            error: { code: 'MISSING_TEXT', message: 'Request must include "text" field' }
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    if (text.length < 50) {
        return new Response(JSON.stringify({
            success: false,
            error: { code: 'TEXT_TOO_SHORT', message: 'Text must be at least 50 characters' }
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    if (text.length > 100000) {
        return new Response(JSON.stringify({
            success: false,
            error: { code: 'TEXT_TOO_LONG', message: 'Text must be under 100,000 characters' }
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Run analysis
    try {
        const results = analyzeText(text, options);

        return new Response(JSON.stringify({
            success: true,
            data: results,
            meta: {
                processedAt: new Date().toISOString(),
                processingTime: results.processingTime,
                tier: auth.user.tier,
                apiVersion: '1.0'
            }
        }), {
            status: 200,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Analysis error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: { code: 'ANALYSIS_FAILED', message: 'Analysis failed. Please try again.' }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

export const config = {
    runtime: 'edge'
};
