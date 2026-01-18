/**
 * PlagiarismGuard - Shared Language & Translation Utilities
 * Supports Phase 12: Cross-Language Detection (CLD)
 */

/**
 * Simple language detection based on common character sets and stop words
 * @returns {string} Language code (en, es, fr, de, etc.)
 */
export function detectLanguage(text) {
    if (!text || text.length < 20) return 'en';

    const sample = text.toLowerCase().substring(0, 1000);

    // Stop word patterns
    const patterns = {
        fr: /\b(le|la|les|un|une|et|est|qu|ce)\b/i,
        es: /\b(el|la|los|las|un|una|y|es|que)\b/i,
        de: /\b(der|die|das|ein|eine|und|ist|dass|nicht)\b/i,
        hi: /[\u0900-\u097F]/ // Hindi character range
    };

    for (const [lang, regex] of Object.entries(patterns)) {
        if (regex.test(sample)) return lang;
    }

    return 'en'; // Default
}

/**
 * Perform a semantic translation check
 * This is a lightweight simulation of checking if a phrase exists in another language.
 * In production, this would call a translation API or use a multi-lingual embedding.
 */
export async function semanticTranslationCheck(phrase, targetLangs = ['fr', 'es', 'de']) {
    // This function returns potential translated versions of the phrase to search for.
    // For now, we return a flag indicating a cross-language check is needed.
    return {
        checkNeeded: true,
        targetLangs
    };
}
