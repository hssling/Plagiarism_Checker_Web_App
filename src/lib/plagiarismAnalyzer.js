/**
 * PlagiarismGuard - Core Analysis Library
 * Multi-API plagiarism detection with local fallback
 */

import { searchPhrase } from './webSearch';
import { analyzeCitationsLocal, extractReferencesSection } from './citationParser';
import { createOpenAIEmbeddings } from './llmService';
import { HybridRetrievalIndex } from './retrievalIndex';
import { calibrateSimilarityRisk } from './scoringCalibration';
import {
    cleanText,
    calculateTFIDFSimilarity,
    calculateShingleOverlap,
    getShingleMatches,
    extractSmartPhrases,
    isCommonChain
} from './shared/analysisShared';
import { semanticTranslationCheck } from './shared/languageShared';

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

function isRangeOverlapping(start, end, ranges = []) {
    return ranges.some(range => start < range.end && end > range.start);
}

function splitIntoPassages(text, excludedRanges = []) {
    const paragraphs = text
        .split(/\n{2,}/)
        .map(part => part.trim())
        .filter(part => part.length > 60);

    const passages = [];
    let searchCursor = 0;

    paragraphs.forEach((paragraph, index) => {
        const words = paragraph.split(/\s+/).filter(Boolean);
        const paragraphStart = text.indexOf(paragraph, searchCursor);
        if (paragraphStart >= 0) {
            searchCursor = paragraphStart + paragraph.length;
        }
        if (words.length <= 90) {
            const pStart = paragraphStart >= 0 ? paragraphStart : 0;
            const pEnd = pStart + paragraph.length;
            if (!isRangeOverlapping(pStart, pEnd, excludedRanges)) {
                passages.push({ id: `p_${index}_0`, text: paragraph, start: pStart, end: pEnd });
            }
            return;
        }

        for (let i = 0; i < words.length; i += 55) {
            const windowWords = words.slice(i, i + 90);
            if (windowWords.length < 30) continue;
            const windowText = windowWords.join(' ');
            const localStart = paragraph.indexOf(windowText);
            const start = paragraphStart >= 0 && localStart >= 0 ? paragraphStart + localStart : Math.max(0, paragraphStart);
            const end = start + windowText.length;
            if (isRangeOverlapping(start, end, excludedRanges)) continue;
            passages.push({
                id: `p_${index}_${i}`,
                text: windowText,
                start,
                end
            });
        }
    });

    if (passages.length === 0) {
        const fallback = text.split(/\s+/).slice(0, 120).join(' ');
        const fallbackStart = text.indexOf(fallback);
        passages.push({
            id: 'p_fallback',
            text: fallback,
            start: Math.max(0, fallbackStart),
            end: Math.max(0, fallbackStart) + fallback.length
        });
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

async function embedHybridUnits(passages, chunkDocs, sourceTexts) {
    try {
        const inputs = [
            ...passages.map(item => item.text),
            ...chunkDocs.map(item => item.text),
            ...sourceTexts
        ];
        const vectors = await createOpenAIEmbeddings(inputs);
        if (!vectors) return null;

        const passageOffset = passages.length;
        const chunkOffset = passageOffset + chunkDocs.length;

        return {
            passageVectors: vectors.slice(0, passageOffset),
            chunkVectors: vectors.slice(passageOffset, chunkOffset),
            sourceVectors: vectors.slice(chunkOffset)
        };
    } catch (error) {
        console.warn('Hybrid embedding stage skipped:', error);
        return null;
    }
}

function findReferenceSectionRange(text) {
    try {
        const refSection = extractReferencesSection(text);
        if (!refSection.found || !refSection.text) return null;
        const anchor = refSection.text.slice(0, Math.min(80, refSection.text.length));
        const start = text.indexOf(anchor);
        if (start < 0) return null;
        return { start, end: start + refSection.text.length };
    } catch (error) {
        return null;
    }
}

function collectPatternRanges(text, pattern) {
    const ranges = [];
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    let match;
    while ((match = globalPattern.exec(text)) !== null) {
        ranges.push({
            start: match.index,
            end: match.index + match[0].length
        });
    }
    return ranges;
}

function normalizeRanges(ranges = [], textLength = 0) {
    if (!ranges.length) return [];
    const prepared = ranges
        .map(range => ({
            start: Math.max(0, Math.min(range.start, textLength)),
            end: Math.max(0, Math.min(range.end, textLength))
        }))
        .filter(range => range.end > range.start)
        .sort((a, b) => a.start - b.start);

    const merged = [prepared[0]];
    for (let i = 1; i < prepared.length; i++) {
        const current = prepared[i];
        const prev = merged[merged.length - 1];
        if (current.start <= prev.end) {
            prev.end = Math.max(prev.end, current.end);
        } else {
            merged.push(current);
        }
    }
    return merged;
}

function collectStructuralExclusions(text) {
    const ranges = [];

    const refRange = findReferenceSectionRange(text);
    if (refRange) ranges.push(refRange);

    ranges.push(...collectPatternRanges(text, /```[\s\S]*?```/g));
    ranges.push(...collectPatternRanges(text, /(^|\n)\s{4,}[^\n]+/g));
    ranges.push(...collectPatternRanges(text, /(^|\n)>\s+[^\n]+/g));
    ranges.push(...collectPatternRanges(text, /"[^"\n]{180,}"/g));

    return normalizeRanges(ranges, text.length);
}

function applyExclusionsToText(text, ranges = []) {
    if (!ranges.length) return text;

    const chars = text.split('');
    ranges.forEach(range => {
        for (let i = range.start; i < range.end && i < chars.length; i++) {
            chars[i] = ' ';
        }
    });
    return chars.join('');
}

async function buildPhraseVariants(phrase, maxVariants = 3) {
    const variants = new Set([phrase]);
    try {
        const expansion = await semanticTranslationCheck(phrase, ['fr', 'es', 'de']);
        (expansion.variants || []).slice(0, maxVariants - 1).forEach(item => variants.add(item));
    } catch (error) {
        // no-op
    }
    return Array.from(variants).slice(0, maxVariants);
}

function buildSourceChunkDocuments(sourcesArray) {
    const chunkDocs = [];

    sourcesArray.forEach(source => {
        const sourceText = source.sourceText || source.text || '';
        const chunks = HybridRetrievalIndex.chunkText(sourceText, 140, 70);
        chunks.forEach((chunkText, idx) => {
            chunkDocs.push({
                id: `${source.id}_chunk_${idx}`,
                sourceId: source.id,
                sourceName: source.name,
                sourceUrl: source.url,
                text: chunkText
            });
        });
    });

    return chunkDocs;
}

function buildSourcePassageMatches(passages, retrievalIndex, embeddingBundle) {
    const grouped = new Map();

    passages.forEach((passage, index) => {
        const results = retrievalIndex.search(passage.text, {
            limit: 8,
            queryEmbedding: embeddingBundle?.passageVectors?.[index] || null,
            lexicalWeight: embeddingBundle ? 0.55 : 1.0,
            semanticWeight: embeddingBundle ? 0.45 : 0.0
        });

        results.forEach(result => {
            const sourceId = result.sourceId;
            if (!grouped.has(sourceId)) grouped.set(sourceId, []);
            grouped.get(sourceId).push({
                passage: passage.text,
                passageRange: { start: passage.start, end: passage.end },
                score: Math.min(100, result.finalScore),
                lexicalScore: Math.min(100, result.lexicalScore),
                semanticScore: Math.min(100, result.semanticScore),
                sourceExcerpt: result.text.slice(0, 320)
            });
        });
    });

    for (const [sourceId, matches] of grouped.entries()) {
        const deduped = matches
            .sort((a, b) => b.score - a.score)
            .filter((item, idx, arr) => arr.findIndex(candidate =>
                candidate.sourceExcerpt === item.sourceExcerpt && candidate.passage === item.passage
            ) === idx)
            .slice(0, 4);
        grouped.set(sourceId, deduped);
    }

    return grouped;
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
                passageRange: { start: passage.start, end: passage.end },
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
        rawOverallScore: 0,
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
            semantic: 'disabled',
            calibration: 'logistic_v1'
        }
    };

    // Step 0: Citation Analysis (First, to define exclusions)
    onProgress(5);
    try {
        results.citations = analyzeCitationsLocal(text);
        const structuralRanges = collectStructuralExclusions(text);
        results.excludedRanges.push(...structuralRanges);

        // Define Excluded Ranges
        if (options.excludeCitations && results.citations.inTextCitations) {
            results.excludedRanges.push(...results.citations.inTextCitations.map(c => ({
                start: c.start,
                end: c.end
            })));
        }
        results.excludedRanges = normalizeRanges(results.excludedRanges, text.length);
    } catch (err) {
        console.warn('Citation analysis warning:', err);
    }

    const analysisText = applyExclusionsToText(text, results.excludedRanges);

    // Step 1: Preprocessing
    onProgress(10);
    const words = cleanText(analysisText).split(/\s+/).filter(w => w.length > 0);
    results.wordCount = words.length;
    results.uniqueWords = new Set(words.map(w => w.toLowerCase())).size;

    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 2: Smart Phrase Selection (Aligned with new 5-word logic)
    onProgress(15);
    // Dynamic depth: check 1 phrase for every 50 words (less frequent)
    const dynamicMax = Math.min(Math.max(6, Math.ceil(words.length / 50)), 25);
    const initialKeyPhrases = extractSmartPhrases(analysisText, dynamicMax);

    // Filter common phrases if requested
    const keyPhrases = options.excludeCommonPhrases
        ? initialKeyPhrases.filter(p => !isCommonChain(p))
        : initialKeyPhrases;

    onProgress(20);

    // Step 3: Deep Web Search (OpenAlex, PubMed, etc.)
    const potentialSources = new Map();

    for (let i = 0; i < keyPhrases.length; i++) {
        const phrase = keyPhrases[i];
        const variants = await buildPhraseVariants(phrase);
        let mergedMatches = [];
        let detectedSource = null;

        for (const candidatePhrase of variants) {
            const searchResult = await searchPhrase(candidatePhrase);
            if (searchResult.found && searchResult.matches?.length) {
                mergedMatches = mergedMatches.concat(searchResult.matches);
                if (!detectedSource) detectedSource = searchResult.source;
            }
        }

        results.keyPhrases.push({
            text: phrase,
            found: mergedMatches.length > 0,
            source: detectedSource,
            variantsChecked: variants.length
        });

        if (mergedMatches.length > 0) {
            mergedMatches.forEach(match => {
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
    const passages = splitIntoPassages(text, results.excludedRanges);
    const chunkDocs = buildSourceChunkDocuments(sourcesArray);
    const retrievalIndex = new HybridRetrievalIndex();
    retrievalIndex.addDocuments(chunkDocs);

    const embeddingBundle = await embedHybridUnits(
        passages,
        chunkDocs,
        sourcesArray.map(source => source.sourceText || source.text || '')
    );

    if (embeddingBundle?.chunkVectors?.length) {
        const embeddingsById = new Map();
        chunkDocs.forEach((doc, idx) => {
            embeddingsById.set(doc.id, embeddingBundle.chunkVectors[idx]);
        });
        retrievalIndex.attachEmbeddings(embeddingsById);
    }

    retrievalIndex.save();
    if (embeddingBundle) {
        results.methodology.semantic = 'OpenAI text-embedding-3-large';
        results.methodology.reranking = 'hybrid BM25 + embedding ANN reranking';
    }

    const sourcePassageMap = buildSourcePassageMatches(passages, retrievalIndex, embeddingBundle);

    for (let i = 0; i < sourcesArray.length; i++) {
        const source = {
            ...sourcesArray[i],
            embeddingIndex: i
        };
        const sourceText = source.sourceText || source.text || '';
        const passageMatches = sourcePassageMap.get(source.id) || scorePassagesAgainstSource(passages, source, embeddingBundle);
        const topPassage = passageMatches[0];

        const shingleDetail = getShingleMatches(text, sourceText, 5, results.excludedRanges);
        const shingleScore = shingleDetail.coverage;
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
                matchedCharRanges: shingleDetail.matchedCharRanges.slice(0, 25),
                retrievalConfidence: Math.round(Math.max(passageScore, shingleScore, tfidfScore)),
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
        const avgSemanticLift = topSources.length
            ? topSources.reduce((sum, source) => sum + Math.max(0, (source.semanticScore || 0) - (source.exactMatchScore || 0)), 0) / topSources.length
            : 0;
        results.rawOverallScore = Math.min(100, (maxScore * 0.7) + (avgTop5 * 0.2) + Math.min(10, evidenceDensity * 0.8));
        const calibration = calibrateSimilarityRisk(results.rawOverallScore, {
            maxMatch: maxScore,
            sourceCount: topSources.length,
            evidenceDensity,
            semanticLift: avgSemanticLift
        });
        results.overallScore = calibration.calibratedScore;
        results.riskBand = calibration.riskBand;
        results.calibration = calibration.explainability;
    } else {
        results.overallScore = 0;
        results.rawOverallScore = 0;
        results.riskBand = 'low';
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
