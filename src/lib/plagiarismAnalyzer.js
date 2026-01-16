/**
 * PlagiarismGuard - Core Analysis Library
 * Multi-API plagiarism detection with local fallback
 */

import { searchPhrase } from './webSearch';
import { analyzeCitationsLocal } from './citationParser';

// Reference corpus for local analysis
const REFERENCE_CORPUS = {
    academic: [
        {
            name: "General Academic Writing",
            type: "Pattern",
            keywords: ["research", "study", "analysis", "findings", "conclusion", "methodology", "results", "discussion"]
        }
    ]
};

/**
 * Clean and normalize text for analysis
 */
function cleanText(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculate TF-IDF similarity between two texts
 */
function calculateTFIDFSimilarity(text1, text2) {
    const words1 = cleanText(text1).split(' ');
    const words2 = cleanText(text2).split(' ');

    // Build vocabulary
    const vocab = new Set([...words1, ...words2]);

    // Calculate term frequencies
    const tf1 = {};
    const tf2 = {};

    words1.forEach(word => {
        tf1[word] = (tf1[word] || 0) + 1;
    });

    words2.forEach(word => {
        tf2[word] = (tf2[word] || 0) + 1;
    });

    // Calculate TF-IDF vectors
    const vector1 = [];
    const vector2 = [];

    vocab.forEach(word => {
        const tfidf1 = (tf1[word] || 0) / words1.length;
        const tfidf2 = (tf2[word] || 0) / words2.length;
        vector1.push(tfidf1);
        vector2.push(tfidf2);
    });

    // Cosine similarity
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
function getNgrams(text, n = 3) {
    const words = cleanText(text).split(' ').filter(w => w.length > 2);
    const ngrams = [];

    for (let i = 0; i <= words.length - n; i++) {
        ngrams.push(words.slice(i, i + n).join(' '));
    }

    return ngrams;
}

/**
 * Calculate n-gram overlap between texts
 */
function calculateNgramOverlap(text1, text2, n = 3) {
    const ngrams1 = new Set(getNgrams(text1, n));
    const ngrams2 = new Set(getNgrams(text2, n));

    if (ngrams1.size === 0) return 0;

    let overlap = 0;
    ngrams1.forEach(ng => {
        if (ngrams2.has(ng)) overlap++;
    });

    return (overlap / ngrams1.size) * 100;
}

/**
 * SHINGLING ALGORITHM (Rabin-Karp inspired)
 * Breaks text into overlapping chunks (shingles) to find exact reuse.
 * Much more robust than simple n-grams or TF-IDF.
 */
function calculateShingleOverlap(text1, text2, k = 4) {
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

    // Jaccard Similarity
    const union = new Set([...shingles1, ...shingles2]).size;
    return (interaction / union) * 100;
}

/**
 * SMART PHRASE EXTRACTION
 * Selects phrases with "rare" words to avoid common academic fluff.
 * Dynamic depth based on text length.
 */
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

/**
 * Main plagiarism analysis function (ENHANCED)
 */
export async function analyzePlagiarism(text, onProgress) {
    const results = {
        overallScore: 0,
        wordCount: 0,
        uniqueWords: 0,
        maxMatch: 0,
        sourcesChecked: 0,
        sources: [],
        keyPhrases: [],
        ngramMatches: [],
        citations: null  // Citation analysis results
    };

    // Step 1: Preprocessing
    onProgress(5);
    const words = cleanText(text).split(/\s+/).filter(w => w.length > 0);
    results.wordCount = words.length;
    results.uniqueWords = new Set(words.map(w => w.toLowerCase())).size;

    await new Promise(resolve => setTimeout(resolve, 200));

    // Step 2: Smart Phrase Selection
    onProgress(10);
    // Dynamic depth: check 1 phrase for every 40 words, min 8, max 30
    const dynamicMax = Math.min(Math.max(8, Math.ceil(words.length / 40)), 30);
    const keyPhrases = extractSmartPhrases(text, dynamicMax);
    onProgress(15);

    // Step 3: Deep Web Search (OpenAlex, PubMed, etc.)
    onProgress(20);
    const potentialSources = new Map();

    for (let i = 0; i < keyPhrases.length; i++) {
        const phrase = keyPhrases[i];

        // Multi-API search
        const searchResult = await searchPhrase(phrase);

        results.keyPhrases.push({
            text: phrase,
            found: searchResult.found,
            source: searchResult.source
        });

        if (searchResult.found && searchResult.matches) {
            searchResult.matches.forEach(match => {
                const key = match.url || match.title;
                if (!potentialSources.has(key)) {
                    potentialSources.set(key, {
                        id: 'src_' + Math.random().toString(36).substr(2, 9),
                        name: match.title || 'Unknown Source',
                        type: match.type || match.source,     // e.g. "Medical Research"
                        text: (match.snippet || '') + ' ' + (match.title || ''),
                        url: match.url,
                        matches: 0
                    });
                }

                // Prioritize 'Book' type if found later
                if (match.type === 'Book') {
                    potentialSources.get(key).type = 'Book';
                }

                potentialSources.get(key).matches++;
            });
        }

        onProgress(20 + ((i + 1) / keyPhrases.length) * 60); // Up to 80%
        await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
    }

    onProgress(80);

    // Step 4: Advanced Source Analysis (Shingling & TF-IDF)
    const sourcesArray = Array.from(potentialSources.values());
    results.sourcesChecked = sourcesArray.length;

    for (let i = 0; i < sourcesArray.length; i++) {
        const source = sourcesArray[i];

        // 1. Shingling (Exact/Near-Exact Copy Detection) - Weight: 60%
        const shingleScore = calculateShingleOverlap(text, source.text, 3);

        // 2. TF-IDF (Topic/Keyword Similarity) - Weight: 20%
        const tfidfScore = calculateTFIDFSimilarity(text, source.text);

        // 3. Phrase Hits Boost - Weight: 20%
        // If we found this source via 3 different searches, it's very likely a match.
        const matchesBoost = Math.min(source.matches * 10, 30);

        // Combined Score
        // We prioritize Shingling because it proves structural similarity (plagiarism)
        // rather than just topical similarity.
        let combinedScore = (shingleScore * 2.5) + (tfidfScore * 0.3) + matchesBoost;

        // Boost for short text (less than 200 words) where shingling is harder
        if (words.length < 200) {
            combinedScore *= 1.5;
        }

        // Normalization & Cap
        if (combinedScore > 100) combinedScore = 100;

        if (combinedScore > 3) { // Lowered Threshold for better sensitivity
            results.sources.push({
                id: source.id,
                name: source.name,
                type: source.type,
                similarity: combinedScore,
                url: source.url
            });

            if (combinedScore > results.maxMatch) {
                results.maxMatch = combinedScore;
            }
        }
    }

    onProgress(90);

    // Step 5: Final Scoring
    results.sources.sort((a, b) => b.similarity - a.similarity);
    const topSources = results.sources.slice(0, 10);

    if (topSources.length > 0) {
        // Blended Scoring: Max match (most critical) + Weighted Average of others
        const maxScore = results.maxMatch;
        const avgScore = topSources.reduce((sum, s) => sum + s.similarity, 0) / topSources.length;

        // Final score leans heavily on the worst offender (max match)
        results.overallScore = (maxScore * 0.7) + (avgScore * 0.3);
    } else {
        results.overallScore = 0;
    }

    // Step 6: Citation Analysis (runs in parallel-ish, non-blocking)
    onProgress(92);
    try {
        results.citations = analyzeCitationsLocal(text);
    } catch (err) {
        console.warn('Citation analysis failed:', err);
        results.citations = { found: false, error: err.message };
    }

    await new Promise(resolve => setTimeout(resolve, 200));
    onProgress(100);

    return results;
}

/**
 * Generate Word-compatible HTML report with highlighting
 */
export function generateWordReport(results, originalText) {
    // 1. Highlight text
    let highlightedText = originalText;

    // Sort phrases by length (descending) to avoid partial replacement issues
    const uniquePhrases = [...new Set(results.keyPhrases.filter(p => p.found).map(p => p.text))];
    uniquePhrases.sort((a, b) => b.length - a.length);

    uniquePhrases.forEach(phrase => {
        // Simple case-insensitive replacement with highlighting span
        // Note: In a production app, we'd need more robust token-based matching to handle spacing/formatting variations
        const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        highlightedText = highlightedText.replace(regex, (match) =>
            `<span style="background-color: #fef08a; color: #000;">${match}</span>`
        );
    });

    // 2. Preserve paragraphs
    highlightedText = highlightedText.split('\n').map(p =>
        p.trim() ? `<p>${p}</p>` : '<br/>'
    ).join('');

    // 3. Generate HTML Document
    return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset="utf-8">
        <title>Plagiarism Analysis Report</title>
        <style>
            body { font-family: 'Times New Roman', serif; padding: 2rem; }
            h1, h2, h3 { color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
            .score-box { 
                background: #f8fafc; 
                border: 2px solid #2563eb; 
                padding: 1rem; 
                text-align: center; 
                margin-bottom: 2rem;
            }
            .score-val { font-size: 24pt; font-weight: bold; color: #2563eb; }
            .footer { margin-top: 3rem; border-top: 1px solid #ccc; padding-top: 1rem; font-size: 9pt; color: #666; }
            .highlight { background-color: #fef08a; }
        </style>
    </head>
    <body>
        <h1>PlagiarismGuard Analysis Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        <!-- Summary Section -->
        <div class="score-box">
            <div>Overall Similarity</div>
            <div class="score-val">${results.overallScore.toFixed(1)}%</div>
            <div style="margin-top: 10px;">
                Sources Found: ${results.sources.length} | 
                Analysis Status: ${results.overallScore < 15 ? 'Pass' : results.overallScore < 25 ? 'Review Needed' : 'Significant Plagiarism'}
            </div>
        </div>

        <!-- Sources Table -->
        <h2>Identified Sources</h2>
        <table>
            <thead>
                <tr>
                    <th>Source Name</th>
                    <th>Similarity</th>
                    <th>Type</th>
                    <th>Link</th>
                </tr>
            </thead>
            <tbody>
                ${results.sources.map(s => `
                <tr>
                    <td>${s.name}</td>
                    <td>${s.similarity.toFixed(1)}%</td>
                    <td>${s.type || 'Web/Academic'}</td>
                    <td><a href="${s.url}">${s.url ? 'View Source' : 'N/A'}</a></td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- Highlighted Text -->
        <h2>Manuscript Analysis</h2>
        <p><em>Passages found in existing literature are highlighted below.</em></p>
        <hr/>
        <div class="manuscript-body">
            ${highlightedText}
        </div>

        <div class="footer">
            <p>Report generated by PlagiarismGuard Pro v1.0</p>
            <p><strong>Developed by Dr. Siddalingaiah H S</strong>, Professor, Community Medicine.</p>
        </div>
    </body>
    </html>
    `;
}

/**
 * Export report as HTML (Legacy, keeping for compatibility if needed)
 */
export function exportReportHTML(results) {
    // ... existing function implementation if needed, or redirect to new one ...
    return generateWordReport(results, "");
}
