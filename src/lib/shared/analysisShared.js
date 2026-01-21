/**
 * PlagiarismGuard - Shared Analysis Algorithms
 * Environment-agnostic implementation of core detection logic.
 */

import { detectLanguage } from './languageShared.js';

/**
 * Clean and normalize text for analysis
 */
export function cleanText(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculate TF-IDF similarity between two texts
 */
export function calculateTFIDFSimilarity(text1, text2) {
    const words1 = cleanText(text1).split(' ');
    const words2 = cleanText(text2).split(' ');

    if (!words1.length || !words2.length) return 0;

    const vocab = new Set([...words1, ...words2]);
    const tf1 = {};
    const tf2 = {};

    words1.forEach(word => { tf1[word] = (tf1[word] || 0) + 1; });
    words2.forEach(word => { tf2[word] = (tf2[word] || 0) + 1; });

    const vector1 = [];
    const vector2 = [];

    vocab.forEach(word => {
        vector1.push((tf1[word] || 0) / words1.length);
        vector2.push((tf2[word] || 0) / words2.length);
    });

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vector1.length; i++) {
        dotProduct += vector1[i] * vector2[i];
        norm1 += vector1[i] * vector1[i];
        norm2 += vector2[i] * vector2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return (dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))) * 100;
}

/**
 * Generate n-grams from text
 */
export function getNgrams(text, n = 3) {
    const words = cleanText(text).split(' ').filter(w => w.length > 2);
    const ngrams = [];
    for (let i = 0; i <= words.length - n; i++) {
        ngrams.push(words.slice(i, i + n).join(' '));
    }
    return ngrams;
}

/**
 * SHINGLING ALGORITHM (Rabin-Karp inspired)
 * Updated to support exclusion ranges and larger shingle size (k=5)
 */
export function calculateShingleOverlap(text1, text2, k = 5, excludedRanges = []) {
    const { coverage } = getShingleMatches(text1, text2, k, excludedRanges);
    return coverage;
}

/**
 * Detailed Shingle Matching
 * Returns exact indices of words in text1 that are part of a match found in text2
 */
export function getShingleMatches(text1, text2, k = 5, excludedRanges = []) {
    // 1. Tokenize with Position Mapping
    const tokenizeWithPos = (text) => {
        const tokens = [];
        const positions = [];
        let currentPos = 0;

        const regex = /\S+/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const word = match[0].toLowerCase().replace(/[^\w]/g, '');
            if (word.length > 0) {
                tokens.push(word);
                positions.push(match.index);
            }
        }
        return { tokens, positions };
    };

    const { tokens: words1, positions: pos1 } = tokenizeWithPos(text1);

    // 2. Build map of non-excluded shingles in Text 1
    const shingles1 = new Map(); // hash -> [startWordIndex] (list of occurrences)

    for (let i = 0; i <= words1.length - k; i++) {
        // Check exclusion
        const startChar = pos1[i];
        const endChar = pos1[i + k - 1] + words1[i + k - 1].length;

        const excluded = excludedRanges && excludedRanges.some(range =>
            (startChar >= range.start && endChar <= range.end)
        );

        if (!excluded) {
            const shingle = words1.slice(i, i + k).join(' ');
            if (!shingles1.has(shingle)) {
                shingles1.set(shingle, []);
            }
            shingles1.get(shingle).push(i);
        }
    }

    // 3. Scan Text 2 for matches
    const words2 = cleanText(text2).split(' '); // Simple tokenize for source
    const matchedWordIndices = new Set();

    for (let i = 0; i <= words2.length - k; i++) {
        const shingle = words2.slice(i, i + k).join(' ');
        if (shingles1.has(shingle)) {
            // We found a match! Mark all words in the original text instances as matched
            const occurrences = shingles1.get(shingle);
            occurrences.forEach(startIndex => {
                for (let j = 0; j < k; j++) {
                    matchedWordIndices.add(startIndex + j);
                }
            });
        }
    }

    // Calculate coverage relative to TOTAL VALID words
    const coverage = words1.length > 0 ? (matchedWordIndices.size / words1.length) * 100 : 0;

    return {
        coverage,
        matchedIndices: matchedWordIndices,
        totalWords: words1.length
    };
}

/**
 * Common Phrase Detection
 * Returns true if the text is likely a generic connector phrase with no unique content
 */
export function isCommonChain(text) {
    const commonChains = [
        "in the context of the", "at the end of the", "as a result of the",
        "in the case of the", "it is important to note", "on the other hand",
        "can be used to", "in order to determine", "the effect of the",
        "due to the fact that", "plays an important role in", "is one of the most",
        "has been shown to be", "results of this study", "found in the present study"
    ];

    const clean = cleanText(text);
    // Exact match against list
    if (commonChains.some(chain => clean.includes(chain))) return true;

    // Heuristic: If it's 4-5 words and all are very common
    const words = clean.split(' ');
    if (words.length < 4 || words.length > 7) return false; // Strict length check for "small matches" logic

    const extremelyCommon = new Set([
        'the', 'of', 'and', 'in', 'to', 'a', 'is', 'that', 'for', 'it', 'as', 'was', 'with', 'on', 'by', 'are', 'be', 'this', 'an', 'at', 'which', 'or', 'from'
    ]);

    // If >75% of words are extremely common stop words
    const commonCount = words.filter(w => extremelyCommon.has(w)).length;
    return (commonCount / words.length) > 0.75;
}

/**
 * SMART PHRASE EXTRACTION
 * Updated to prefer longer, more significant phrases
 */
export function extractSmartPhrases(text, maxPhrases = 12) {
    const lang = detectLanguage(text);
    const clean = cleanText(text);
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    const isShortText = words.length < 100; // Increased threshold
    // Move to 5-word minimum across the board as per stricter logic
    const minPhraseLength = 5;
    const phraseWindow = 6;

    if (words.length <= phraseWindow) return [words.join(' ')];

    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 15);
    const complexPhrases = [];
    // Expanded stop words
    const stopWords = new Set(['the', 'and', 'was', 'for', 'that', 'with', 'from', 'this', 'are', 'not', 'is', 'in', 'of', 'to', 'by', 'at']);

    for (const sentence of sentences) {
        const sWords = sentence.trim().split(/\s+/).filter(w => w.length > 0);
        if (sWords.length >= minPhraseLength) {
            let score = 0;
            sWords.forEach(w => {
                if (w.length > 6) score += 2;
                if (!stopWords.has(w.toLowerCase())) score += 1;
            });

            const step = isShortText ? 2 : 4; // Bigger steps to avoid overlapping junk
            for (let i = 0; i <= sWords.length - phraseWindow; i += step) {
                const phrase = sWords.slice(i, i + phraseWindow).join(' ');

                // Skip if it's just a common chain
                if (isCommonChain(phrase)) continue;

                const positionScore = (1 - (i / sWords.length)) * 0.5;
                complexPhrases.push({ phrase, score: score + positionScore });
            }
        }
    }

    complexPhrases.sort((a, b) => b.score - a.score);
    const uniquePhrases = [];
    const seen = new Set();

    // Helper to check for significant overlap
    const hasOverlap = (p1, pSet) => {
        for (const existing of pSet) {
            if (existing.includes(p1) || p1.includes(existing)) return true;
        }
        return false;
    };

    for (const p of complexPhrases) {
        if (!hasOverlap(p.phrase, seen)) {
            uniquePhrases.push(p.phrase);
            seen.add(p.phrase);
        }
        if (uniquePhrases.length >= maxPhrases) break;
    }

    if (uniquePhrases.length === 0 && words.length > 0) {
        uniquePhrases.push(words.slice(0, Math.min(words.length, phraseWindow)).join(' '));
    }

    return uniquePhrases;
}
