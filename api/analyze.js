/**
 * POST /api/analyze
 * Main plagiarism analysis endpoint
 */

import { validateRequest } from './_lib/auth.js';
import { checkRateLimit, getRateLimitHeaders, rateLimitErrorResponse } from './_lib/rateLimit.js';
import { extractSmartPhrases, calculateShingleOverlap, calculateTFIDFSimilarity, getShingleMatches } from '../src/lib/shared/analysisShared.js';
import { executeSearch } from '../src/lib/shared/searchShared.js';
import { detectLanguage, semanticTranslationCheck } from '../src/lib/shared/languageShared.js';
import { analyzeIntentBackend, checkAuthorshipBackend, translateTextBackend } from './_lib/ai.js';
import { calibrateSimilarityRisk } from '../src/lib/scoringCalibration.js';
import { analyzeCitationsLocal, extractReferencesSection } from '../src/lib/citationParser.js';

function collectPatternRanges(text, pattern) {
    const ranges = [];
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    let match;
    while ((match = globalPattern.exec(text)) !== null) {
        ranges.push({ start: match.index, end: match.index + match[0].length });
    }
    return ranges;
}

function normalizeRanges(ranges = [], textLength = 0) {
    if (!ranges.length) return [];
    const prepared = ranges
        .map(range => ({
            start: Math.max(0, Math.min(range.start, textLength)),
            end: Math.max(0, Math.min(range.end, textLength))
        }))
        .filter(range => range.end > range.start)
        .sort((a, b) => a.start - b.start);

    const merged = [prepared[0]];
    for (let i = 1; i < prepared.length; i++) {
        const current = prepared[i];
        const prev = merged[merged.length - 1];
        if (current.start <= prev.end) {
            prev.end = Math.max(prev.end, current.end);
        } else {
            merged.push(current);
        }
    }
    return merged;
}

function findReferenceSectionRange(text) {
    const refSection = extractReferencesSection(text);
    if (!refSection.found || !refSection.text) return null;
    const anchor = refSection.text.slice(0, Math.min(80, refSection.text.length));
    const start = text.indexOf(anchor);
    if (start < 0) return null;
    return { start, end: start + refSection.text.length };
}

function collectStructuralExclusions(text) {
    const ranges = [];
    const refRange = findReferenceSectionRange(text);
    if (refRange) ranges.push(refRange);

    ranges.push(...collectPatternRanges(text, /```[\s\S]*?```/g));
    ranges.push(...collectPatternRanges(text, /(^|\n)\s{4,}[^\n]+/g));
    ranges.push(...collectPatternRanges(text, /(^|\n)>\s+[^\n]+/g));
    ranges.push(...collectPatternRanges(text, /"[^"\n]{180,}"/g));
    return normalizeRanges(ranges, text.length);
}

function applyExclusionsToText(text, ranges = []) {
    if (!ranges.length) return text;
    const chars = text.split('');
    ranges.forEach(range => {
        for (let i = range.start; i < range.end && i < chars.length; i++) {
            chars[i] = ' ';
        }
    });
    return chars.join('');
}

/**
 * Real plagiarism analysis engine for backend with Cognitive AI
 */
async function performRealAnalysis(text, options = {}, aiKey = null) {
    const startTime = Date.now();
    const citations = analyzeCitationsLocal(text);
    const excludedRanges = collectStructuralExclusions(text);
    if (options.excludeCitations !== false && citations?.inTextCitations?.length) {
        excludedRanges.push(...citations.inTextCitations.map(item => ({ start: item.start, end: item.end })));
    }
    const normalizedExclusions = normalizeRanges(excludedRanges, text.length);
    const analysisText = applyExclusionsToText(text, normalizedExclusions);
    const words = analysisText.split(/\s+/).filter(w => w.length > 0);
    const lang = detectLanguage(text);

    // 1. Extract Smart Phrases
    const dynamicMax = Math.min(Math.max(8, Math.ceil(words.length / 40)), 20);
    const keyPhrases = extractSmartPhrases(analysisText, dynamicMax);

    // 2. Execute Searches
    const potentialSources = new Map();
    const checkedPhrases = [];

    // Backend fetch wrapper (no proxy needed usually, but we'll pass a simple one)
    const backendFetch = async (url, fetchOptions = {}) => {
        return await fetch(url, fetchOptions);
    };

    for (const phrase of keyPhrases) {
        let matches = await executeSearch(phrase, {}, backendFetch);
        let isCrossLanguage = false;
        const expansion = await semanticTranslationCheck(phrase, ['fr', 'es', 'de']);

        // CLD (Phase 12): If no english matches, try French or Spanish translation
        if (matches.length === 0 && aiKey && lang === 'en') {
            const translatedPhrase = await translateTextBackend(phrase, 'French', aiKey);
            if (translatedPhrase !== phrase) {
                matches = await executeSearch(translatedPhrase, {}, backendFetch);
                if (matches.length > 0) isCrossLanguage = true;
            }
        } else if (matches.length === 0 && expansion?.variants?.length) {
            for (const variant of expansion.variants.slice(0, 2)) {
                matches = await executeSearch(variant, {}, backendFetch);
                if (matches.length > 0) {
                    isCrossLanguage = true;
                    break;
                }
            }
        }

        checkedPhrases.push({
            text: phrase,
            found: matches.length > 0,
            crossLanguage: isCrossLanguage
        });

        matches.forEach(match => {
            const key = match.url || match.title;
            if (!potentialSources.has(key)) {
                potentialSources.set(key, {
                    id: 'src_' + Math.random().toString(36).substr(2, 6),
                    name: match.title || 'Unknown Source',
                    type: match.type || 'Academic Source',
                    url: match.url,
                    text: match.snippet || '',
                    hits: 1,
                    isCrossLanguage
                });
            } else {
                potentialSources.get(key).hits++;
            }
        });
    }

    // 3. Score Sources & Analyze Intent
    const resultsSources = [];
    let maxMatch = 0;

    for (const source of potentialSources.values()) {
        const shingleDetails = getShingleMatches(text, source.text, 3, normalizedExclusions);
        const shingleScore = shingleDetails.coverage;
        const tfidfScore = calculateTFIDFSimilarity(text, source.text);
        const hitBoost = Math.min(source.hits * 5, 20);

        let similarity = (shingleScore * 2.0) + (tfidfScore * 0.5) + hitBoost;
        if (words.length < 200) similarity *= 1.2;
        similarity = Math.min(100, Math.round(similarity * 10) / 10);

        if (similarity > 5) {
            // Cognitive: Analyze Intent for high-risk matches
            let intent = null;
            if (aiKey && similarity > 25) {
                intent = await analyzeIntentBackend(text.substring(0, 300), source.text, aiKey);
            }

            resultsSources.push({
                ...source,
                similarity,
                matchedCharRanges: shingleDetails.matchedCharRanges.slice(0, 20),
                intent
            });
            if (similarity > maxMatch) maxMatch = similarity;
        }
    }

    resultsSources.sort((a, b) => b.similarity - a.similarity);

    // 4. AI Authorship Check (Flagship Phase 12)
    let authorship = null;
    if (aiKey && words.length > 100) {
        authorship = await checkAuthorshipBackend(text, aiKey);
    }

    // 5. Final Scoring
    let rawOverallScore = 0;
    let overallScore = 0;
    let riskBand = 'low';
    if (resultsSources.length > 0) {
        const topAvg = resultsSources.slice(0, 5).reduce((acc, s) => acc + s.similarity, 0) / Math.min(5, resultsSources.length);
        rawOverallScore = (maxMatch * 0.7) + (topAvg * 0.3);
        const calibration = calibrateSimilarityRisk(rawOverallScore, {
            maxMatch,
            sourceCount: resultsSources.length,
            evidenceDensity: resultsSources.reduce((sum, s) => sum + Math.min(3, s.hits || 1), 0),
            semanticLift: 0
        });
        overallScore = calibration.calibratedScore;
        riskBand = calibration.riskBand;
    }

    return {
        overallScore: Math.round(overallScore * 10) / 10,
        rawOverallScore: Math.round(rawOverallScore * 10) / 10,
        wordCount: words.length,
        uniqueWords: new Set(words.map(w => w.toLowerCase())).size,
        language: lang,
        maxMatch,
        riskBand,
        authorship,
        sourcesChecked: potentialSources.size,
        sources: resultsSources.slice(0, 10),
        keyPhrases: checkedPhrases,
        processingTime: Date.now() - startTime
    };
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST method' }
        });
    }

    // Validate API key
    const auth = validateRequest(req);
    if (!auth.valid) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: auth.error }
        });
    }

    // Check rate limit
    const apiKey = req.headers['x-api-key'] || extractApiKey(req);
    const rateLimit = checkRateLimit(apiKey, auth.user.tier);
    const rateLimitHeaders = getRateLimitHeaders(rateLimit, auth.user.tier);

    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    if (!rateLimit.allowed) {
        return res.status(429).json(rateLimitErrorResponse(rateLimit));
    }

    // Parse request body
    const { text, options = {} } = req.body || {};
    const aiKey = req.headers['x-ai-key']; // Optional AI key for cognitive features

    if (!text || typeof text !== 'string') {
        return res.status(400).json({
            success: false,
            error: { code: 'MISSING_TEXT', message: 'Request must include "text" field' }
        });
    }

    if (text.length < 50) {
        return res.status(400).json({
            success: false,
            error: { code: 'TEXT_TOO_SHORT', message: 'Text must be at least 50 characters' }
        });
    }

    // Run analysis
    try {
        const results = await performRealAnalysis(text, options, aiKey);

        return res.status(200).json({
            success: true,
            data: results,
            meta: {
                processedAt: new Date().toISOString(),
                processingTime: results.processingTime,
                tier: auth.user.tier,
                apiVersion: '2.1'
            }
        });

    } catch (error) {
        console.error('Analysis error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'ANALYSIS_FAILED', message: error.message || 'Analysis failed.' }
        });
    }
}

// Helper to extract API key inside handler if needed
function extractApiKey(req) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    return null;
}
