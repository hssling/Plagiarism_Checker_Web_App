import { analyzeWritingStyle } from './styleAnalyzer.js';

const QA_RULES = [
    {
        id: 'double_determiner',
        category: 'grammar',
        severity: 'medium',
        title: 'Possible determiner stacking',
        detail: 'Review repeated determiners (for example: "the the").',
        pattern: /\b(the|a|an)\s+\1\b/gi
    },
    {
        id: 'repeated_word',
        category: 'clarity',
        severity: 'low',
        title: 'Repeated word sequence',
        detail: 'Repeated adjacent words reduce fluency.',
        pattern: /\b([a-zA-Z]+)\s+\1\b/gi
    },
    {
        id: 'weak_hedging',
        category: 'style',
        severity: 'low',
        title: 'Heavy hedging',
        detail: 'Repeated hedging can weaken claims.',
        pattern: /\b(might|could|perhaps|possibly|maybe)\b/gi
    }
];

function getSentences(text) {
    return text
        .split(/(?<=[.!?])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean);
}

function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
}

function collectRegexMatches(text, regex) {
    const matches = [];
    let match;
    const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);

    while ((match = globalRegex.exec(text)) !== null) {
        matches.push(match[0]);
        if (matches.length >= 5) break;
    }

    return matches;
}

function runRuleEngine(text) {
    const ruleIssues = [];
    QA_RULES.forEach(rule => {
        const matches = collectRegexMatches(text, rule.pattern);
        if (matches.length > 0) {
            ruleIssues.push({
                category: rule.category,
                severity: rule.severity,
                title: rule.title,
                detail: rule.detail,
                examples: matches.slice(0, 3),
                ruleId: rule.id
            });
        }
    });
    return ruleIssues;
}

export function analyzeLanguageQualityLocal(text) {
    if (!text || text.trim().length < 80) {
        return {
            status: 'insufficient_text',
            overallScore: 0,
            readabilityScore: 0,
            grammarScore: 0,
            clarityScore: 0,
            toneScore: 0,
            issueCount: 0,
            issues: [],
            highlights: [],
            recommendations: ['Provide at least 80 characters to run the language QA review.'],
            editedText: ''
        };
    }

    const sentences = getSentences(text);
    const words = text.match(/\b[\w'-]+\b/g) || [];
    const paragraphs = text.split(/\n{2,}/).filter(Boolean);
    const style = analyzeWritingStyle(text);

    const longSentences = sentences.filter(sentence => {
        const count = (sentence.match(/\b[\w'-]+\b/g) || []).length;
        return count > 32;
    });
    const repeatedTransitions = collectRegexMatches(
        text.toLowerCase(),
        /\b(however|therefore|furthermore|moreover|indeed|thus)\b/g
    );
    const fillerMatches = collectRegexMatches(
        text.toLowerCase(),
        /\b(very|really|quite|basically|actually|clearly|obviously|in order to)\b/g
    );
    const agreementMatches = collectRegexMatches(
        text,
        /\b(this|these|it|they)\s+(are|is)\b/gi
    );

    const issues = [];

    if (longSentences.length > 0) {
        issues.push({
            category: 'clarity',
            severity: longSentences.length > 3 ? 'high' : 'medium',
            title: 'Long sentences reduce readability',
            detail: `${longSentences.length} sentence(s) exceed 32 words.`,
            examples: longSentences.slice(0, 2)
        });
    }

    if ((style.passiveVoicePercentage || 0) > 25) {
        issues.push({
            category: 'style',
            severity: style.passiveVoicePercentage > 40 ? 'high' : 'medium',
            title: 'Passive voice is overused',
            detail: `Passive constructions appear in about ${style.passiveVoicePercentage}% of sentences.`,
            examples: []
        });
    }

    if (fillerMatches.length > 0) {
        issues.push({
            category: 'conciseness',
            severity: fillerMatches.length > 3 ? 'medium' : 'low',
            title: 'Wordy fillers detected',
            detail: 'Some phrases add length without adding precision.',
            examples: fillerMatches
        });
    }

    if (agreementMatches.length > 0) {
        issues.push({
            category: 'grammar',
            severity: 'medium',
            title: 'Possible subject-verb agreement issues',
            detail: 'Review pronoun and verb-number agreement in the highlighted phrases.',
            examples: agreementMatches
        });
    }

    if ((style.consistencyScore || 100) < 65) {
        issues.push({
            category: 'consistency',
            severity: 'medium',
            title: 'Tone and style shift across sections',
            detail: `Document consistency scored ${style.consistencyScore}%.`,
            examples: style.anomalies?.anomalySections?.slice(0, 2).map(section => section.preview) || []
        });
    }

    if (repeatedTransitions.length > 3) {
        issues.push({
            category: 'flow',
            severity: 'low',
            title: 'Transitions are repetitive',
            detail: 'Repeated discourse markers can make the prose sound formulaic.',
            examples: repeatedTransitions.slice(0, 4)
        });
    }

    const ruleIssues = runRuleEngine(text);
    issues.push(...ruleIssues);

    const readabilityScore = clamp(100 - (longSentences.length * 8) - Math.max(0, (style.avgSentenceLength || 0) - 24) * 1.8);
    const grammarScore = clamp(96 - (agreementMatches.length * 10) - Math.max(0, issues.filter(issue => issue.category === 'grammar').length * 6));
    const clarityScore = clamp(100 - (fillerMatches.length * 7) - Math.max(0, (style.passiveVoicePercentage || 0) - 20) * 0.8);
    const toneScore = clamp((style.consistencyScore || 100) - Math.max(0, paragraphs.length < 2 ? 8 : 0));
    const overallScore = Math.round((readabilityScore * 0.28) + (grammarScore * 0.3) + (clarityScore * 0.24) + (toneScore * 0.18));

    const recommendations = [];
    if (longSentences.length > 0) recommendations.push('Split long sentences so each sentence carries one main idea.');
    if ((style.passiveVoicePercentage || 0) > 25) recommendations.push('Prefer active verbs where the actor matters to the claim.');
    if (fillerMatches.length > 0) recommendations.push('Trim filler words and replace vague modifiers with specific evidence.');
    if ((style.consistencyScore || 100) < 65) recommendations.push('Normalize tone across sections before submission.');
    if (recommendations.length === 0) recommendations.push('Language quality is stable. Focus on discipline-specific terminology and final proofreading.');

    const highlights = issues.flatMap(issue =>
        (issue.examples || []).map(example => ({
            category: issue.category,
            severity: issue.severity,
            text: example
        }))
    ).slice(0, 8);

    return {
        status: 'ok',
        overallScore,
        readabilityScore: Math.round(readabilityScore),
        grammarScore: Math.round(grammarScore),
        clarityScore: Math.round(clarityScore),
        toneScore: Math.round(toneScore),
        issueCount: issues.length,
        issues,
        highlights,
        recommendations,
        editedText: '',
        executiveSummary: overallScore >= 85
            ? 'Language quality is publication-ready with minor polishing only.'
            : overallScore >= 70
                ? 'Language quality is solid, but several edits would improve clarity and consistency.'
                : 'Language quality needs a focused edit before professional submission.',
        metrics: {
            sentenceCount: sentences.length,
            wordCount: words.length,
            paragraphCount: paragraphs.length,
            avgSentenceLength: style.avgSentenceLength || 0,
            passiveVoicePercentage: style.passiveVoicePercentage || 0,
            consistencyScore: style.consistencyScore || 0
        },
        validation: {
            engine: 'hybrid_rules_v1',
            ruleHits: ruleIssues.length,
            confidence: Math.max(0.45, Math.min(0.95, 0.55 + (issues.length * 0.05)))
        }
    };
}

export function mergeLanguageQuality(localReview, aiReview) {
    if (!aiReview) return localReview;

    return {
        ...localReview,
        ...aiReview,
        readabilityScore: aiReview.readabilityScore ?? localReview.readabilityScore,
        grammarScore: aiReview.grammarScore ?? localReview.grammarScore,
        clarityScore: aiReview.clarityScore ?? localReview.clarityScore,
        toneScore: aiReview.toneScore ?? localReview.toneScore,
        overallScore: aiReview.overallScore ?? localReview.overallScore,
        issues: aiReview.issues?.length ? aiReview.issues : localReview.issues,
        issueCount: aiReview.issueCount ?? aiReview.issues?.length ?? localReview.issueCount,
        recommendations: aiReview.recommendations?.length ? aiReview.recommendations : localReview.recommendations,
        editedText: aiReview.editedText || localReview.editedText,
        executiveSummary: aiReview.executiveSummary || localReview.executiveSummary,
        highlights: aiReview.highlights?.length ? aiReview.highlights : localReview.highlights
    };
}
