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
        fr: /\b(le|la|les|un|une|et|est|qu|ce|dans|pour)\b/i,
        es: /\b(el|la|los|las|un|una|y|es|que|para|con)\b/i,
        de: /\b(der|die|das|ein|eine|und|ist|dass|nicht|mit|für)\b/i,
        pt: /\b(o|a|os|as|de|e|que|para|com|não)\b/i,
        hi: /[\u0900-\u097F]/,
        zh: /[\u4E00-\u9FFF]/
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
    const dictionaries = {
        fr: {
            model: 'modèle',
            models: 'modèles',
            language: 'langue',
            neural: 'neural',
            plagiarism: 'plagiat',
            detection: 'détection',
            academic: 'académique',
            research: 'recherche'
        },
        es: {
            model: 'modelo',
            models: 'modelos',
            language: 'lenguaje',
            neural: 'neuronal',
            plagiarism: 'plagio',
            detection: 'detección',
            academic: 'académico',
            research: 'investigación'
        },
        de: {
            model: 'modell',
            models: 'modelle',
            language: 'sprache',
            neural: 'neuronale',
            plagiarism: 'plagiat',
            detection: 'erkennung',
            academic: 'akademisch',
            research: 'forschung'
        }
    };

    const normalized = (phrase || '').trim();
    const lower = normalized.toLowerCase();
    const words = lower.split(/\s+/).filter(Boolean);
    const variants = new Set();

    targetLangs.forEach(lang => {
        const dict = dictionaries[lang];
        if (!dict) return;
        const translated = words.map(word => dict[word] || word).join(' ');
        if (translated !== lower) variants.add(translated);
    });

    return {
        checkNeeded: true,
        targetLangs,
        variants: Array.from(variants)
    };
}
