/**
 * PlagiarismGuard - Core Analysis Library
 * Multi-API plagiarism detection with local fallback
 */

import { searchPhrase } from './webSearch';

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
 * Extract key phrases for web search
 */
function extractKeyPhrases(text, minWords = 6, maxPhrases = 15) {
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
    const phrases = [];

    for (const sentence of sentences) {
        const words = sentence.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length >= minWords) {
            const phrase = words.slice(0, minWords).join(' ');
            if (phrase.length > 20 && !phrases.includes(phrase)) {
                phrases.push(phrase);
                if (phrases.length >= maxPhrases) break;
            }
        }
    }

    return phrases;
}

/**
 * Generate n-grams from text
 */

/**
 * Main plagiarism analysis function
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
        ngramMatches: []
    };

    // Step 1: Preprocessing (0-10%)
    onProgress(5);
    const words = cleanText(text).split(/\s+/).filter(w => w.length > 0);
    results.wordCount = words.length;
    results.uniqueWords = new Set(words.map(w => w.toLowerCase())).size;

    await new Promise(resolve => setTimeout(resolve, 300));
    onProgress(10);

    // Step 2: Extract Key Phrases for Search (10-20%)
    onProgress(15);
    // Extract unique, significant phrases
    const keyPhrases = extractKeyPhrases(text, 7, 8); // Slightly longer phrases for better specificity

    onProgress(20);

    // Step 3: Real-time Web & Academic Search (20-80%)
    onProgress(25);

    // Store potential sources found from web search
    const potentialSources = new Map(); // Use Map to deduplicate by URL/DOI

    // Search for each phrase
    for (let i = 0; i < keyPhrases.length; i++) {
        const phrase = keyPhrases[i];

        // Search using our webSearch module (CrossRef, Semantic Scholar)
        const searchResult = await searchPhrase(phrase);

        results.keyPhrases.push({
            text: phrase,
            found: searchResult.found,
            source: searchResult.source
        });

        if (searchResult.found && searchResult.matches) {
            searchResult.matches.forEach(match => {
                // Key by URL or Title to avoid duplicates
                const key = match.url || match.title;
                if (!potentialSources.has(key)) {
                    potentialSources.set(key, {
                        id: 'src_' + Math.random().toString(36).substr(2, 9),
                        name: match.title || 'Unknown Source',
                        type: match.type || match.source,
                        text: (match.snippet || '') + ' ' + (match.title || ''), // Text to compare against
                        url: match.url,
                        matches: 0
                    });
                }
                // Increment match count for this source
                potentialSources.get(key).matches++;
            });
        }

        // Update progress dynamically
        onProgress(25 + ((i + 1) / keyPhrases.length) * 55);

        // Rate limiting to be polite to APIs
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    onProgress(80);

    // Step 4: Analyze Found Sources (80-95%)
    const sourcesArray = Array.from(potentialSources.values());
    results.sourcesChecked = sourcesArray.length;

    for (let i = 0; i < sourcesArray.length; i++) {
        const source = sourcesArray[i];

        // Calculate similarity between user text and source snippet/abstract
        // Note: With free APIs, we often only get abstracts, so similarity might be lower than full text.
        // We boost the score slightly if multiple phrases matched this source.

        const tfidfScore = calculateTFIDFSimilarity(text, source.text);
        const ngramScore = calculateNgramOverlap(text, source.text, 3);

        // Weighted score: TF-IDF + N-gram + Boost from phrase matches
        let combinedScore = (tfidfScore * 0.4) + (ngramScore * 0.4) + (Math.min(source.matches, 5) * 4);

        // Cap at 100%
        combinedScore = Math.min(combinedScore, 100);

        // Only include relevant sources
        if (combinedScore > 5) {
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

    onProgress(95);

    // Step 5: Final Scoring (95-100%)

    // Sort sources by similarity
    results.sources.sort((a, b) => b.similarity - a.similarity);

    // Take top 10 sources for overall score calculation
    const topSources = results.sources.slice(0, 10);

    if (topSources.length > 0) {
        // Average of top matches
        const totalSim = topSources.reduce((sum, s) => sum + s.similarity, 0);
        results.overallScore = totalSim / topSources.length; // Simple average
        // Normalize: If fewer sources, don't artificially lower score too much, but don't exaggerate either.
        // Adjust logic: Score is primarily driven by how much IS copied. 
        // If max match is high, overall score should reflect that risk.
        results.overallScore = Math.max(results.overallScore, results.maxMatch * 0.8);
    } else {
        results.overallScore = 0;
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

