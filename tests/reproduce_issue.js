
// Mock of extractSmartPhrases from src/lib/plagiarismAnalyzer.js (UPDATED LOGIC)

function cleanText(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractSmartPhrases(text, maxPhrases = 12) {
    // Clean and split text
    const clean = cleanText(text);
    const words = clean.split(/\s+/).filter(w => w.length > 0);

    // Strategy based on length
    const isShortText = words.length < 50;
    const minPhraseLength = isShortText ? 4 : 6;
    const phraseWindow = isShortText ? 5 : 7;

    // If text is very short, just take everything as one chunk if possible
    if (words.length <= phraseWindow) {
        return [words.join(' ')];
    }

    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10); // Lowered from 15
    const complexPhrases = [];

    // Common stop words to ignore in "rareness" check
    const stopWords = new Set(['the', 'and', 'was', 'for', 'that', 'with', 'from', 'this', 'are', 'not', 'is', 'in']);

    for (const sentence of sentences) {
        const sWords = sentence.trim().split(/\s+/).filter(w => w.length > 0);

        // We want phrases of varying length
        if (sWords.length >= minPhraseLength) {
            // Score sentence by complexity
            let score = 0;
            sWords.forEach(w => {
                if (w.length > 6) score += 2;
                if (!stopWords.has(w.toLowerCase())) score += 1;
            });

            // For short texts, be more aggressive: grab multiple overlapping windows
            const step = isShortText ? 1 : 3;

            for (let i = 0; i <= sWords.length - phraseWindow; i += step) {
                const phrase = sWords.slice(i, i + phraseWindow).join(' ');
                // Add position bias: earlier phrases in sentence might be subjects
                const positionScore = (1 - (i / sWords.length)) * 0.5;
                complexPhrases.push({ phrase, score: score + positionScore });
            }
        }
    }

    // Sort by complexity score
    complexPhrases.sort((a, b) => b.score - a.score);

    // Filter duplicates and similar phrases
    const uniquePhrases = [];
    const seen = new Set();

    for (const p of complexPhrases) {
        if (!seen.has(p.phrase)) {
            uniquePhrases.push(p.phrase);
            seen.add(p.phrase);
        }
        if (uniquePhrases.length >= maxPhrases) break;
    }

    // Fallback: If "Smart" extraction failed (e.g. simple text), force simple chunking
    if (uniquePhrases.length === 0 && words.length > 0) {
        const simpleChunk = words.slice(0, Math.min(words.length, phraseWindow)).join(' ');
        uniquePhrases.push(simpleChunk);
    }

    return uniquePhrases;
}

// Test Cases
const shortText = "This is a quick run.";
const mediumText = "This is a slightly longer text that might just pass the check if it is long enough.";
const longText = "This is a much longer text. We want to verify if the plagiarism checker works correctly. It should identify phrases from this text. The system uses smart phrase extraction to find complex sentences.";

console.log("--- Short Text ---");
console.log(`Text: "${shortText}"`);
const phrases1 = extractSmartPhrases(shortText);
console.log(`Phrases found: ${phrases1.length}`);
console.log(phrases1);

console.log("\n--- Medium Text ---");
console.log(`Text: "${mediumText}"`);
const phrases2 = extractSmartPhrases(mediumText);
console.log(`Phrases found: ${phrases2.length}`);
console.log(phrases2);

console.log("\n--- Long Text ---");
console.log(`Text: "${longText}"`);
const phrases3 = extractSmartPhrases(longText);
console.log(`Phrases found: ${phrases3.length}`);
console.log(phrases3);
