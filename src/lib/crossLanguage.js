/**
 * Cross-Language Detection
 * Detects if text has been translated from another language
 */

import { isAIInitialized, callGemini } from './llmService';

/**
 * Common translation artifacts to detect
 */
const TRANSLATION_PATTERNS = {
    // Unusual word orders
    wordOrder: [
        /\b(very|really|quite)\s+(much|many)\s+\w+/gi,
        /\bfor\s+me\s+is\s+\w+/gi,
        /\bit\s+is\s+to\s+say/gi
    ],

    // Literal translations of idioms
    literalIdioms: [
        /\bmake\s+the\s+ears\b/gi,
        /\bbreak\s+the\s+head\b/gi,
        /\btake\s+the\s+leg\b/gi,
        /\bgive\s+the\s+hand\b/gi
    ],

    // Missing or unusual articles
    articleIssues: [
        /\b(is|was|are|were)\s+(very|quite|really)\s+\w+\s+(person|man|woman|thing)/gi,
        /\b(go|went)\s+to\s+\w+\b(?!\s+(the|a|an))/gi
    ],

    // Formality inconsistencies
    formalityMix: [
        /\b(gonna|wanna|gotta)\b.*\b(therefore|consequently|furthermore)\b/gi,
        /\b(thus|hence)\b.*\b(like|kinda|sorta)\b/gi
    ]
};

/**
 * Language indicators (common words by language)
 */
const LANGUAGE_INDICATORS = {
    spanish: ['el', 'la', 'de', 'que', 'en', 'los', 'del', 'las', 'con', 'para'],
    french: ['le', 'la', 'de', 'et', 'les', 'des', 'en', 'un', 'une', 'du'],
    german: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'ist'],
    portuguese: ['de', 'que', 'em', 'para', 'com', 'uma', 'os', 'das', 'dos', 'pelo'],
    italian: ['di', 'che', 'il', 'la', 'per', 'con', 'del', 'della', 'sono', 'nella'],
    chinese: ['的', '是', '在', '了', '和', '有', '这', '不', '我', '他'],
    hindi: ['है', 'में', 'के', 'की', 'को', 'से', 'पर', 'का', 'एक', 'यह']
};

/**
 * Detect primary language of text
 */
function detectLanguage(text) {
    const words = text.toLowerCase().split(/\s+/);
    const scores = {};

    // Check for non-Latin scripts
    if (/[\u4e00-\u9fff]/.test(text)) return { language: 'chinese', confidence: 0.9 };
    if (/[\u0900-\u097F]/.test(text)) return { language: 'hindi', confidence: 0.9 };
    if (/[\u0400-\u04FF]/.test(text)) return { language: 'russian', confidence: 0.9 };
    if (/[\u0600-\u06FF]/.test(text)) return { language: 'arabic', confidence: 0.9 };

    // Score based on indicator words
    Object.entries(LANGUAGE_INDICATORS).forEach(([lang, indicators]) => {
        scores[lang] = indicators.filter(ind => words.includes(ind)).length;
    });

    // English detection (most common words)
    const englishWords = ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'been', 'this', 'that'];
    scores.english = englishWords.filter(w => words.includes(w)).length;

    // Find highest score
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const topLang = sorted[0];
    const secondLang = sorted[1] || [null, 0];

    // Calculate confidence
    const total = sorted.reduce((sum, [, score]) => sum + score, 0);
    const confidence = total > 0 ? topLang[1] / total : 0;

    return {
        language: topLang[0],
        confidence: Math.round(confidence * 100) / 100,
        scores
    };
}

/**
 * Check for translation artifacts in text
 */
function checkTranslationArtifacts(text) {
    const artifacts = [];

    // Check word order issues
    TRANSLATION_PATTERNS.wordOrder.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            artifacts.push({
                type: 'word_order',
                examples: matches.slice(0, 3),
                severity: 'medium'
            });
        }
    });

    // Check article issues
    TRANSLATION_PATTERNS.articleIssues.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            artifacts.push({
                type: 'article_issues',
                examples: matches.slice(0, 3),
                severity: 'low'
            });
        }
    });

    // Check formality mix
    TRANSLATION_PATTERNS.formalityMix.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            artifacts.push({
                type: 'formality_inconsistency',
                examples: matches.slice(0, 3),
                severity: 'medium'
            });
        }
    });

    // Check for unusual phrase structures
    const unusualPhrases = [
        { pattern: /\baccording\s+to\s+me\b/gi, msg: 'Non-native phrasing' },
        { pattern: /\bit\s+is\s+said\s+that\b/gi, msg: 'Literal translation' },
        { pattern: /\bin\s+the\s+actually\b/gi, msg: 'Word order issue' },
        { pattern: /\bI\s+am\s+agree\b/gi, msg: 'Grammar artifact' },
        { pattern: /\bSince\s+\d+\s+years\b/gi, msg: 'Time expression' }
    ];

    unusualPhrases.forEach(({ pattern, msg }) => {
        const matches = text.match(pattern);
        if (matches) {
            artifacts.push({
                type: 'unusual_phrase',
                message: msg,
                examples: matches.slice(0, 2),
                severity: 'high'
            });
        }
    });

    return artifacts;
}

/**
 * Use Gemini AI for deeper translation analysis
 */
async function aiTranslationAnalysis(text) {
    if (!isAIInitialized()) {
        return null;
    }

    const prompt = `Analyze this text for signs of machine translation or non-native writing. Rate confidence 0-100.

Text: "${text.substring(0, 1500)}"

Respond in JSON format only:
{
  "isTranslated": boolean,
  "confidence": number,
  "sourceLanguage": string or null,
  "artifacts": ["list of specific examples"],
  "explanation": "brief explanation"
}`;

    try {
        const response = await callGemini(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        console.error('AI translation analysis failed:', error);
    }

    return null;
}

/**
 * Main function: Detect translated content
 */
export async function detectTranslatedContent(text) {
    if (!text || text.length < 100) {
        return {
            isLikelyTranslated: false,
            confidence: 0,
            error: 'Text too short for analysis'
        };
    }

    // Step 1: Detect language
    const languageResult = detectLanguage(text);

    // Step 2: Check for artifacts
    const artifacts = checkTranslationArtifacts(text);

    // Step 3: Calculate base confidence
    let translationScore = 0;

    // Score based on artifacts
    artifacts.forEach(artifact => {
        if (artifact.severity === 'high') translationScore += 25;
        else if (artifact.severity === 'medium') translationScore += 15;
        else translationScore += 5;
    });

    // Cap at 70 without AI
    translationScore = Math.min(70, translationScore);

    // Step 4: Try AI analysis if available
    let aiResult = null;
    if (translationScore > 20 || languageResult.language !== 'english') {
        aiResult = await aiTranslationAnalysis(text);

        if (aiResult && aiResult.isTranslated) {
            translationScore = Math.max(translationScore, aiResult.confidence);
        }
    }

    // Step 5: Determine result
    const isLikelyTranslated = translationScore >= 40;

    return {
        isLikelyTranslated,
        confidence: translationScore,
        detectedLanguage: languageResult.language,
        languageConfidence: languageResult.confidence,
        artifacts: artifacts.map(a => ({
            type: a.type,
            message: a.message || a.type.replace('_', ' '),
            severity: a.severity
        })),
        aiAnalysis: aiResult,
        summary: generateTranslationSummary(isLikelyTranslated, translationScore, artifacts, aiResult)
    };
}

/**
 * Generate human-readable summary
 */
function generateTranslationSummary(isTranslated, confidence, artifacts, aiResult) {
    if (!isTranslated && confidence < 20) {
        return 'No signs of translation detected. Text appears to be originally written in English.';
    }

    if (confidence >= 60) {
        return `High likelihood of translated content (${confidence}% confidence). ${artifacts.length} translation artifact(s) detected.`;
    }

    if (confidence >= 40) {
        return `Possible translated content (${confidence}% confidence). Some unusual phrasing detected.`;
    }

    return `Low likelihood of translation (${confidence}% confidence). Minor irregularities found.`;
}

/**
 * Quick check for obvious non-English text
 */
export function quickLanguageCheck(text) {
    const result = detectLanguage(text);

    return {
        isEnglish: result.language === 'english' && result.confidence > 0.5,
        detectedLanguage: result.language,
        confidence: result.confidence
    };
}
