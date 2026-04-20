/**
 * Hybrid Retrieval Index
 * Provides BM25 lexical retrieval with optional semantic reranking support.
 * Persists lightweight index metadata in localStorage for warm starts.
 */

import { cleanText } from './shared/analysisShared';

const DEFAULT_STORAGE_KEY = 'plagiarism_guard_hybrid_index_v1';

function tokenize(text) {
    return cleanText(text).split(/\s+/).filter(token => token.length > 1);
}

function buildTermFreq(tokens) {
    const tf = new Map();
    tokens.forEach(token => {
        tf.set(token, (tf.get(token) || 0) + 1);
    });
    return tf;
}

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

export class HybridRetrievalIndex {
    constructor({ storageKey = DEFAULT_STORAGE_KEY } = {}) {
        this.storageKey = storageKey;
        this.documents = [];
        this.docFreq = new Map();
        this.avgDocLength = 0;
    }

    static chunkText(text, chunkSize = 140, stride = 70) {
        const words = (text || '').split(/\s+/).filter(Boolean);
        if (!words.length) return [];

        const chunks = [];
        for (let i = 0; i < words.length; i += stride) {
            const windowWords = words.slice(i, i + chunkSize);
            if (windowWords.length < 40) continue;
            chunks.push(windowWords.join(' '));
            if (i + chunkSize >= words.length) break;
        }

        if (chunks.length === 0) {
            chunks.push(words.slice(0, Math.min(words.length, chunkSize)).join(' '));
        }

        return chunks;
    }

    addDocuments(items = []) {
        const prepared = items
            .filter(item => item?.id && item?.text)
            .map(item => {
                const tokens = tokenize(item.text);
                const termFreq = buildTermFreq(tokens);
                return {
                    id: item.id,
                    sourceId: item.sourceId || item.id,
                    sourceName: item.sourceName || '',
                    sourceUrl: item.sourceUrl || '',
                    text: item.text,
                    tokens,
                    termFreq,
                    length: tokens.length,
                    embedding: item.embedding || null
                };
            });

        this.documents = prepared;
        this.rebuildStats();
    }

    attachEmbeddings(embeddingsById = new Map()) {
        this.documents = this.documents.map(doc => ({
            ...doc,
            embedding: embeddingsById.get(doc.id) || doc.embedding || null
        }));
    }

    rebuildStats() {
        this.docFreq = new Map();
        let totalLength = 0;

        for (const doc of this.documents) {
            totalLength += doc.length;
            const uniqueTokens = new Set(doc.tokens);
            uniqueTokens.forEach(token => {
                this.docFreq.set(token, (this.docFreq.get(token) || 0) + 1);
            });
        }

        this.avgDocLength = this.documents.length ? (totalLength / this.documents.length) : 0;
    }

    bm25Score(queryTokens, doc, { k1 = 1.5, b = 0.75 } = {}) {
        const nDocs = this.documents.length || 1;
        const avgLen = this.avgDocLength || 1;
        let score = 0;

        for (const token of queryTokens) {
            const tf = doc.termFreq.get(token) || 0;
            if (!tf) continue;

            const df = this.docFreq.get(token) || 0;
            const idf = Math.log(1 + ((nDocs - df + 0.5) / (df + 0.5)));
            const denom = tf + (k1 * (1 - b + b * (doc.length / avgLen)));
            score += idf * ((tf * (k1 + 1)) / Math.max(denom, 1e-9));
        }

        return score;
    }

    search(queryText, {
        limit = 10,
        queryEmbedding = null,
        lexicalWeight = 0.65,
        semanticWeight = 0.35
    } = {}) {
        const queryTokens = tokenize(queryText);
        const lexicalScores = this.documents.map(doc => ({
            doc,
            lexicalScore: this.bm25Score(queryTokens, doc)
        }));

        const maxLex = Math.max(...lexicalScores.map(item => item.lexicalScore), 0) || 1;
        const lexicalNorm = lexicalScores.map(item => ({
            ...item,
            lexicalNorm: item.lexicalScore / maxLex
        }));

        const scored = lexicalNorm.map(item => {
            const semanticScore = (queryEmbedding && item.doc.embedding)
                ? Math.max(0, cosineSimilarity(queryEmbedding, item.doc.embedding))
                : 0;
            const finalScore = (item.lexicalNorm * lexicalWeight) + (semanticScore * semanticWeight);
            return {
                ...item,
                semanticScore,
                finalScore
            };
        });

        return scored
            .sort((a, b) => b.finalScore - a.finalScore)
            .slice(0, limit)
            .map(item => ({
                chunkId: item.doc.id,
                sourceId: item.doc.sourceId,
                sourceName: item.doc.sourceName,
                sourceUrl: item.doc.sourceUrl,
                text: item.doc.text,
                finalScore: item.finalScore * 100,
                lexicalScore: item.lexicalNorm * 100,
                semanticScore: item.semanticScore * 100
            }));
    }

    save() {
        if (typeof localStorage === 'undefined') return;
        try {
            const serialized = JSON.stringify({
                documents: this.documents.map(doc => ({
                    id: doc.id,
                    sourceId: doc.sourceId,
                    sourceName: doc.sourceName,
                    sourceUrl: doc.sourceUrl,
                    text: doc.text
                }))
            });
            localStorage.setItem(this.storageKey, serialized);
        } catch (error) {
            console.warn('Hybrid index persistence skipped:', error);
        }
    }

    load() {
        if (typeof localStorage === 'undefined') return false;
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            this.addDocuments(parsed.documents || []);
            return this.documents.length > 0;
        } catch (error) {
            console.warn('Hybrid index load failed:', error);
            return false;
        }
    }
}

