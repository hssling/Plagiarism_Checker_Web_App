/**
 * PlagiarismGuard - Core Analysis Library
 * Multi-API plagiarism detection with local fallback
 */

import { searchPhrase } from './webSearch';
import { analyzeCitationsLocal } from './citationParser';
import { createOpenAIEmbeddings } from './llmService';
import {
    cleanText,
    calculateTFIDFSimilarity,
    calculateShingleOverlap,
    extractSmartPhrases,
    isCommonChain
} from './shared/analysisShared';

function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (!normA || !normB) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function splitIntoPassages(text) {
    const paragraphs = text
        .split(/\n{2,}/)
        .map(part => part.trim())
        .filter(part => part.length > 60);

    const passages = [];

    paragraphs.forEach((paragraph, index) => {
        const words = paragraph.split(/\s+/).filter(Boolean);
        if (words.length <= 90) {
            passages.push({ id: `p_${index}_0`, text: paragraph });
            return;
        }

        for (let i = 0; i < words.length; i += 55) {
            const windowWords = words.slice(i, i + 90);
            if (windowWords.length < 30) continue;
            passages.push({
                id: `p_${index}_${i}`,
                text: windowWords.join(' ')
            });
        }
    });

    if (passages.length === 0) {
        passages.push({ id: 'p_fallback', text: text.split(/\s+/).slice(0, 120).join(' ') });
    }

    return passages.slice(0, 18);
}

async function fetchSourcePreview(url) {
    if (!url || !/^https?:/i.test(url)) return '';

    try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        const wrapper = await res.json();
        if (!wrapper.upstreamOk || typeof wrapper.data !== 'string') {
            return '';
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(wrapper.data, 'text/html');
        const text = [
            doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            doc.querySelector('article')?.innerText || '',
            doc.querySelector('main')?.innerText || '',
            doc.body?.innerText || ''
        ].join(' ');

        return text.replace(/\s+/g, ' ').trim().slice(0, 8000);
    } catch (error) {
        console.warn('Unable to fetch source preview:', url, error);
        return '';
    }
}

async function enrichSources(sources) {
    const enriched = [];
    for (const source of sources) {
        const fetchedText = await fetchSourcePreview(source.url);
        enriched.push({
            ...source,
            sourceText: [source.name, source.text, fetchedText].filter(Boolean).join(' ').trim()
        });
    }
    return enriched;
}

async function embedTexts(passages, sourceTexts) {
    try {
        const vectors = await createOpenAIEmbeddings([
            ...passages.map(item => item.text),
            ...sourceTexts
        ]);

        if (!vectors) return null;

        return {
            passageVectors: vectors.slice(0, passages.length),
            sourceVectors: vectors.slice(passages.length)
        };
    } catch (error) {
        console.warn('Semantic embedding stage skipped:', error);
        return null;
    }
}

function extractEvidenceSnippet(sourceText, passageText) {
    if (!sourceText) return '';
    const passageWords = cleanText(passageText).split(/\s+/).filter(word => word.length > 4);
    const anchor = passageWords.find(word => sourceText.toLowerCase().includes(word));
    if (!anchor) return sourceText.slice(0, 260);

    const index = sourceText.toLowerCase().indexOf(anchor);
    const start = Math.max(0, index - 100);
    const end = Math.min(sourceText.length, index + 180);
    return sourceText.slice(start, end).trim();
}

function scorePassagesAgainstSource(passages, source, embeddingBundle) {
    const sourceText = source.sourceText || source.text || '';
    const sourceVector = embeddingBundle?.sourceVectors?.[source.embeddingIndex];

    return passages
        .map((passage, index) => {
            const lexicalScore = (calculateShingleOverlap(passage.text, sourceText, 5) * 0.6) +
                (calculateTFIDFSimilarity(passage.text, sourceText) * 0.4);
            const semanticScore = sourceVector && embeddingBundle?.passageVectors?.[index]
                ? cosineSimilarity(embeddingBundle.passageVectors[index], sourceVector) * 100
                : lexicalScore;
            const score = (lexicalScore * 0.45) + (semanticScore * 0.55);

            return {
                passage: passage.text,
                score: Math.min(100, score),
                lexicalScore: Math.min(100, lexicalScore),
                semanticScore: Math.min(100, semanticScore),
                sourceExcerpt: extractEvidenceSnippet(sourceText, passage.text)
            };
        })
        .filter(match => match.score >= 18)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
}

/**
 * Main plagiarism analysis function (SCIENTIFIC & ENHANCED)
 * Updated to be less aggressive and support exclusions.
 */
export async function analyzePlagiarism(text, onProgress, options = { excludeCitations: true, excludeCommonPhrases: true }) {
    const results = {
        overallScore: 0,
        wordCount: 0,
        uniqueWords: 0,
        maxMatch: 0,
        sourcesChecked: 0,
        sources: [],
        keyPhrases: [],
        citations: null,
        excludedRanges: [],
        methodology: {
            retrieval: 'multi-source phrase retrieval',
            reranking: 'lexical passage alignment',
            semantic: 'disabled'
        }
    };

    // Step 0: Citation Analysis (First, to define exclusions)
    onProgress(5);
    try {
        results.citations = analyzeCitationsLocal(text);

        // Define Excluded Ranges
        if (options.excludeCitations && results.citations.inTextCitations) {
            results.excludedRanges = results.citations.inTextCitations.map(c => ({
                start: c.start,
                end: c.end
            }));

            // Also exclude the References section if found
            const refSection = results.citations.found ? results.citations : null;
            // Note: analyzeCitationsLocal calls extractReferencesSection but returns summary. 
            // We trust the parser would separate it, but here we might want to ensure we don't scan the biblio.
            // For now, inTextCitations ranges are the main focus for inline exclusions.
        }
    } catch (err) {
        console.warn('Citation analysis warning:', err);
    }

    // Step 1: Preprocessing
    onProgress(10);
    const words = cleanText(text).split(/\s+/).filter(w => w.length > 0);
    results.wordCount = words.length;
    results.uniqueWords = new Set(words.map(w => w.toLowerCase())).size;

    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 2: Smart Phrase Selection (Aligned with new 5-word logic)
    onProgress(15);
    // Dynamic depth: check 1 phrase for every 50 words (less frequent)
    const dynamicMax = Math.min(Math.max(6, Math.ceil(words.length / 50)), 25);
    const initialKeyPhrases = extractSmartPhrases(text, dynamicMax);

    // Filter common phrases if requested
    const keyPhrases = options.excludeCommonPhrases
        ? initialKeyPhrases.filter(p => !isCommonChain(p))
        : initialKeyPhrases;

    onProgress(20);

    // Step 3: Deep Web Search (OpenAlex, PubMed, etc.)
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
                        type: match.type || match.source,
                        text: (match.snippet || '') + ' ' + (match.title || ''),
                        url: match.url,
                        matches: 0,
                        source: match.source
                    });
                }
                potentialSources.get(key).matches++;
            });
        }

        onProgress(20 + ((i + 1) / keyPhrases.length) * 60); // Up to 80%
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    onProgress(85);

    // Step 4: Advanced Source Analysis (retrieval enrichment + semantic reranking)
    const sourcesArray = await enrichSources(Array.from(potentialSources.values()).slice(0, 12));
    results.sourcesChecked = sourcesArray.length;
    const passages = splitIntoPassages(text);
    const embeddingBundle = await embedTexts(passages, sourcesArray.map(source => source.sourceText || source.text || ''));
    if (embeddingBundle) {
        results.methodology.semantic = 'OpenAI text-embedding-3-large';
        results.methodology.reranking = 'hybrid lexical + embedding passage alignment';
    }

    for (let i = 0; i < sourcesArray.length; i++) {
        const source = {
            ...sourcesArray[i],
            embeddingIndex: i
        };
        const sourceText = source.sourceText || source.text || '';
        const passageMatches = scorePassagesAgainstSource(passages, source, embeddingBundle);
        const topPassage = passageMatches[0];

        const shingleScore = calculateShingleOverlap(text, sourceText, 5, results.excludedRanges);
        const tfidfScore = calculateTFIDFSimilarity(text, sourceText);
        const passageScore = topPassage?.score || 0;
        const semanticScore = topPassage?.semanticScore || 0;

        const matchesBoost = Math.min(source.matches * 4, 16);
        let combinedScore = (passageScore * 0.44) + (shingleScore * 0.28) + (tfidfScore * 0.14) + matchesBoost;
        if (hasMeaningfulSemanticLift(shingleScore, semanticScore)) {
            combinedScore += 4;
        }

        if (combinedScore > 100) combinedScore = 100;

        if (combinedScore > 8) {
            results.sources.push({
                id: source.id,
                name: source.name,
                type: source.type,
                similarity: combinedScore,
                url: source.url,
                source: source.source,
                matches: source.matches,
                snippet: sourceText.substring(0, 280) + (sourceText.length > 280 ? '...' : ''),
                text: sourceText.substring(0, 1200),
                passageMatches,
                retrievalConfidence: Math.round(Math.max(passageScore, shingleScore)),
                semanticScore: Math.round(semanticScore * 10) / 10,
                exactMatchScore: Math.round(shingleScore * 10) / 10
            });

            if (combinedScore > results.maxMatch) {
                results.maxMatch = combinedScore;
            }
        }
    }

    // Step 5: Final Scoring
    results.sources.sort((a, b) => b.similarity - a.similarity);
    const topSources = results.sources.slice(0, 10);

    if (topSources.length > 0) {
        const maxScore = results.maxMatch;
        const avgTop5 = topSources.slice(0, 5).reduce((sum, s) => sum + s.similarity, 0) / Math.min(topSources.length, 5);
        const evidenceDensity = topSources.reduce((sum, source) => sum + (source.passageMatches?.length || 0), 0);
        results.overallScore = Math.min(100, (maxScore * 0.7) + (avgTop5 * 0.2) + Math.min(10, evidenceDensity * 0.8));
    } else {
        results.overallScore = 0;
    }

    onProgress(100);

    return results;
}

function hasMeaningfulSemanticLift(shingleScore, semanticScore) {
    return semanticScore > (shingleScore * 0.9) + 10;
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
