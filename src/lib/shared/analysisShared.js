/**
 * PlagiarismGuard - Shared Analysis Algorithms
 * Environment-agnostic implementation of core detection logic.
 */

import { detectLanguage } from './languageShared';

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
 */
export function calculateShingleOverlap(text1, text2, k = 4) {
    const shingles1 = new Set();
    const words1 = cleanText(text1).split(' ');
    for (let i = 0; i <= words1.length - k; i++) {
        shingles1.add(words1.slice(i, i + k).join(' '));
    }

    const shingles2 = new Set();
    const words2 = cleanText(text2).split(' ');
    for (let i = 0; i <= words2.length - k; i++) {
        shingles2.add(words2.slice(i, i + k).join(' '));
    }

    if (shingles1.size === 0 || shingles2.size === 0) return 0;

    let interaction = 0;
    for (const s of shingles1) {
        if (shingles2.has(s)) interaction++;
    }

    const union = new Set([...shingles1, ...shingles2]).size;
    return (interaction / union) * 100;
}

/**
 * SMART PHRASE EXTRACTION
 */
export function extractSmartPhrases(text, maxPhrases = 12) {
    const lang = detectLanguage(text);
    const clean = cleanText(text);
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    const isShortText = words.length < 50;
    const minPhraseLength = isShortText ? 4 : 6;
    const phraseWindow = isShortText ? 5 : 7;

    if (words.length <= phraseWindow) return [words.join(' ')];

    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10);
    const complexPhrases = [];
    const stopWords = new Set(['the', 'and', 'was', 'for', 'that', 'with', 'from', 'this', 'are', 'not', 'is', 'in']);

    for (const sentence of sentences) {
        const sWords = sentence.trim().split(/\s+/).filter(w => w.length > 0);
        if (sWords.length >= minPhraseLength) {
            let score = 0;
            sWords.forEach(w => {
                if (w.length > 6) score += 2;
                if (!stopWords.has(w.toLowerCase())) score += 1;
            });

            const step = isShortText ? 1 : 3;
            for (let i = 0; i <= sWords.length - phraseWindow; i += step) {
                const phrase = sWords.slice(i, i + phraseWindow).join(' ');
                const positionScore = (1 - (i / sWords.length)) * 0.5;
                complexPhrases.push({ phrase, score: score + positionScore });
            }
        }
    }

    complexPhrases.sort((a, b) => b.score - a.score);
    const uniquePhrases = [];
    const seen = new Set();

    for (const p of complexPhrases) {
        if (!seen.has(p.phrase)) {
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
