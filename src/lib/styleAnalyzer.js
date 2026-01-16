/**
 * Style Analyzer
 * Analyzes writing style to create author fingerprints and detect anomalies
 */

/**
 * Calculate vocabulary richness (Type-Token Ratio)
 */
function calculateVocabularyRichness(text) {
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    if (words.length === 0) return 0;

    const uniqueWords = new Set(words);
    return Math.round((uniqueWords.size / words.length) * 100) / 100;
}

/**
 * Calculate average sentence length
 */
function calculateAvgSentenceLength(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;

    const words = text.match(/\b[a-z]+\b/gi) || [];
    return Math.round((words.length / sentences.length) * 10) / 10;
}

/**
 * Calculate text complexity (Flesch-Kincaid approximation)
 */
function calculateComplexity(text) {
    const words = text.match(/\b[a-z]+\b/gi) || [];
    if (words.length === 0) return 0;

    // Approximate syllables by vowel clusters
    const syllableCount = words.reduce((count, word) => {
        const syllables = word.match(/[aeiouy]+/gi) || [];
        return count + Math.max(1, syllables.length);
    }, 0);

    const avgSyllablesPerWord = syllableCount / words.length;

    // Score: 1-3 simple, 3-5 moderate, 5+ complex
    return Math.round(avgSyllablesPerWord * 100) / 100;
}

/**
 * Detect passive voice usage percentage
 */
function detectPassiveVoice(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;

    // Simple passive voice detection patterns
    const passivePatterns = [
        /\b(was|were|is|are|been|being|be)\s+\w+ed\b/gi,
        /\b(was|were|is|are|been|being|be)\s+\w+en\b/gi,
        /\b(was|were|is|are)\s+(being\s+)?\w+ed\b/gi
    ];

    let passiveCount = 0;
    sentences.forEach(sentence => {
        if (passivePatterns.some(pattern => pattern.test(sentence))) {
            passiveCount++;
        }
    });

    return Math.round((passiveCount / sentences.length) * 100);
}

/**
 * Analyze transition word usage
 */
function analyzeTransitions(text) {
    const transitions = [
        'however', 'therefore', 'furthermore', 'moreover', 'consequently',
        'nevertheless', 'although', 'meanwhile', 'similarly', 'indeed',
        'thus', 'hence', 'accordingly', 'conversely', 'subsequently'
    ];

    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    const transitionCount = words.filter(w => transitions.includes(w)).length;

    return {
        count: transitionCount,
        percentage: words.length > 0 ? Math.round((transitionCount / words.length) * 1000) / 10 : 0
    };
}

/**
 * Analyze punctuation patterns
 */
function analyzePunctuation(text) {
    const commas = (text.match(/,/g) || []).length;
    const semicolons = (text.match(/;/g) || []).length;
    const colons = (text.match(/:/g) || []).length;
    const dashes = (text.match(/[—–-]/g) || []).length;
    const exclamations = (text.match(/!/g) || []).length;
    const questions = (text.match(/\?/g) || []).length;

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

    return {
        commasPerSentence: sentences > 0 ? Math.round((commas / sentences) * 100) / 100 : 0,
        semicolonsPerSentence: sentences > 0 ? Math.round((semicolons / sentences) * 100) / 100 : 0,
        dashesPerSentence: sentences > 0 ? Math.round((dashes / sentences) * 100) / 100 : 0,
        exclamationRatio: sentences > 0 ? Math.round((exclamations / sentences) * 100) : 0,
        questionRatio: sentences > 0 ? Math.round((questions / sentences) * 100) : 0
    };
}

/**
 * Analyze paragraph structure
 */
function analyzeParagraphs(text) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    if (paragraphs.length === 0) {
        return { avgLength: 0, variance: 0, count: 0 };
    }

    const lengths = paragraphs.map(p => p.split(/\s+/).length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;

    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;

    return {
        count: paragraphs.length,
        avgLength: Math.round(avgLength),
        variance: Math.round(Math.sqrt(variance))
    };
}

/**
 * Generate a style fingerprint (numerical vector)
 */
function generateFingerprint(text) {
    const vocabRichness = calculateVocabularyRichness(text);
    const avgSentLen = calculateAvgSentenceLength(text);
    const complexity = calculateComplexity(text);
    const passiveVoice = detectPassiveVoice(text);
    const transitions = analyzeTransitions(text);
    const punctuation = analyzePunctuation(text);
    const paragraphs = analyzeParagraphs(text);

    // Normalized fingerprint vector (0-1 scale for each dimension)
    return {
        vocabRichness: Math.min(1, vocabRichness),
        sentenceLength: Math.min(1, avgSentLen / 40), // Normalize to ~40 words max
        complexity: Math.min(1, complexity / 4), // Normalize to 4 syllables max
        passiveVoice: passiveVoice / 100,
        transitions: Math.min(1, transitions.percentage / 5), // Normalize to 5%
        commaUsage: Math.min(1, punctuation.commasPerSentence / 3),
        paragraphVariance: Math.min(1, paragraphs.variance / 50)
    };
}

/**
 * Compare two fingerprints and return similarity score
 * @returns {number} 0-100 (100 = identical style)
 */
export function compareFingerprints(fp1, fp2) {
    const keys = Object.keys(fp1);
    let totalDiff = 0;

    keys.forEach(key => {
        totalDiff += Math.abs(fp1[key] - fp2[key]);
    });

    const avgDiff = totalDiff / keys.length;
    const similarity = (1 - avgDiff) * 100;

    return Math.round(Math.max(0, Math.min(100, similarity)));
}

/**
 * Detect style anomalies within a document
 * Splits into sections and compares each to overall style
 */
function detectAnomalies(text) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);

    if (paragraphs.length < 3) {
        return { hasAnomalies: false, sections: [] };
    }

    // Get overall fingerprint
    const overallFingerprint = generateFingerprint(text);

    // Check each section
    const sections = paragraphs.map((para, index) => {
        const sectionFingerprint = generateFingerprint(para);
        const similarity = compareFingerprints(overallFingerprint, sectionFingerprint);

        return {
            index,
            preview: para.substring(0, 50) + '...',
            similarity,
            isAnomaly: similarity < 60 // Less than 60% similar = anomaly
        };
    });

    const anomalies = sections.filter(s => s.isAnomaly);

    return {
        hasAnomalies: anomalies.length > 0,
        anomalyCount: anomalies.length,
        sections,
        anomalySections: anomalies
    };
}

/**
 * Get style consistency score
 */
function calculateConsistency(text) {
    const anomalyResult = detectAnomalies(text);

    if (!anomalyResult.sections.length) return 100;

    const avgSimilarity = anomalyResult.sections.reduce((sum, s) => sum + s.similarity, 0) / anomalyResult.sections.length;

    return Math.round(avgSimilarity);
}

/**
 * Main style analysis function
 */
export function analyzeWritingStyle(text) {
    if (!text || text.length < 100) {
        return {
            error: 'Text too short for style analysis (minimum 100 characters)'
        };
    }

    const fingerprint = generateFingerprint(text);
    const anomalies = detectAnomalies(text);
    const transitions = analyzeTransitions(text);
    const punctuation = analyzePunctuation(text);
    const paragraphs = analyzeParagraphs(text);

    return {
        // Core metrics
        vocabularyRichness: Math.round(calculateVocabularyRichness(text) * 100),
        avgSentenceLength: calculateAvgSentenceLength(text),
        complexityScore: calculateComplexity(text),
        passiveVoicePercentage: detectPassiveVoice(text),

        // Derived metrics
        consistencyScore: calculateConsistency(text),
        transitions,
        punctuation,
        paragraphs,

        // Fingerprint for comparison
        fingerprint,

        // Anomaly detection
        anomalies,

        // Summary
        summary: generateSummary(text, fingerprint, anomalies)
    };
}

/**
 * Generate human-readable style summary
 */
function generateSummary(text, fingerprint, anomalies) {
    const summaryPoints = [];

    // Vocabulary analysis
    if (fingerprint.vocabRichness > 0.7) {
        summaryPoints.push('Rich and varied vocabulary');
    } else if (fingerprint.vocabRichness < 0.4) {
        summaryPoints.push('Repetitive vocabulary usage');
    }

    // Sentence length
    const avgLen = calculateAvgSentenceLength(text);
    if (avgLen > 25) {
        summaryPoints.push('Long, complex sentences');
    } else if (avgLen < 12) {
        summaryPoints.push('Short, punchy sentences');
    }

    // Passive voice
    const passive = detectPassiveVoice(text);
    if (passive > 30) {
        summaryPoints.push('High passive voice usage (' + passive + '%)');
    }

    // Anomalies
    if (anomalies.hasAnomalies) {
        summaryPoints.push(`${anomalies.anomalyCount} section(s) with different writing style detected`);
    }

    return summaryPoints;
}

/**
 * Compare two texts and determine if same author
 */
export function compareTwoTexts(text1, text2) {
    const fp1 = generateFingerprint(text1);
    const fp2 = generateFingerprint(text2);

    const similarity = compareFingerprints(fp1, fp2);

    let verdict;
    if (similarity >= 80) {
        verdict = 'Likely same author';
    } else if (similarity >= 60) {
        verdict = 'Possibly same author';
    } else if (similarity >= 40) {
        verdict = 'Different writing styles';
    } else {
        verdict = 'Very different authors';
    }

    return {
        similarity,
        verdict,
        fingerprint1: fp1,
        fingerprint2: fp2
    };
}
