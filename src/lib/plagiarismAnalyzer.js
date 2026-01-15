/**
 * PlagiarismGuard - Core Analysis Library
 * Multi-API plagiarism detection with local fallback
 */

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
 * Simulate web search for phrases (in production, use actual API)
 */
async function searchPhrase(phrase) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // In production, this would call Google Custom Search API or similar
    // For demo, return no match for most phrases
    const commonPatterns = [
        'the results show',
        'in this study',
        'we found that',
        'according to',
        'previous research'
    ];

    const found = commonPatterns.some(pattern =>
        phrase.toLowerCase().includes(pattern)
    );

    return { phrase, found, source: found ? 'Common Academic Phrase' : null };
}

/**
 * Academic reference database for comparison
 */
const ACADEMIC_REFERENCES = [
    {
        id: 'WHO2024',
        name: 'WHO Global TB Report 2024',
        type: 'Official Report',
        text: `Global tuberculosis report 2024. Tuberculosis remains one of the 
      world's deadliest infectious diseases. India accounts for 26% of the global 
      TB burden. Early diagnosis and prompt treatment are essential to end TB.`
    },
    {
        id: 'Teo2021',
        name: 'Teo et al. 2021 - TB Delays Review',
        type: 'Meta-analysis',
        text: `Duration and determinants of delayed tuberculosis diagnosis and treatment 
      in high-burden countries: a mixed-methods systematic review and meta-analysis.`
    },
    {
        id: 'Storla2008',
        name: 'Storla et al. 2008 - Delay Review',
        type: 'Systematic Review',
        text: `A systematic review of delay in the diagnosis and treatment of tuberculosis.
      Delayed diagnosis and treatment results in increased infectivity and poor outcomes.`
    },
    {
        id: 'Sreeramareddy2009',
        name: 'Sreeramareddy et al. 2009',
        type: 'Systematic Review',
        text: `Time delays in diagnosis of pulmonary tuberculosis: a systematic review.
      Patient delay contributes significantly to the total delay.`
    },
    {
        id: 'Subbaraman2016',
        name: 'Subbaraman et al. 2016 - India TB Cascade',
        type: 'Meta-analysis',
        text: `The tuberculosis cascade of care in India's public sector: 
      a systematic review and meta-analysis. India has the highest TB burden globally.`
    },
    {
        id: 'CommonAcademic',
        name: 'Academic Writing Patterns',
        type: 'Pattern Library',
        text: `This study aims to investigate the relationship between variables.
      Our findings suggest that the intervention was effective.
      The results indicate statistical significance.
      Further research is needed to explore these findings.`
    }
];

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
    const words = text.split(/\s+/).filter(w => w.length > 0);
    results.wordCount = words.length;
    results.uniqueWords = new Set(words.map(w => w.toLowerCase())).size;

    await new Promise(resolve => setTimeout(resolve, 300));
    onProgress(10);

    // Step 2: TF-IDF Analysis (10-30%)
    onProgress(15);

    for (let i = 0; i < ACADEMIC_REFERENCES.length; i++) {
        const ref = ACADEMIC_REFERENCES[i];
        const similarity = calculateTFIDFSimilarity(text, ref.text);

        results.sources.push({
            id: ref.id,
            name: ref.name,
            type: ref.type,
            similarity: similarity
        });

        if (similarity > results.maxMatch) {
            results.maxMatch = similarity;
        }

        results.sourcesChecked++;
        onProgress(15 + (i + 1) * 2);
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    onProgress(30);

    // Step 3: N-gram Analysis (30-50%)
    onProgress(35);

    for (const ref of ACADEMIC_REFERENCES) {
        const ngramOverlap = calculateNgramOverlap(text, ref.text, 3);

        // Update source with n-gram data
        const sourceIndex = results.sources.findIndex(s => s.id === ref.id);
        if (sourceIndex >= 0) {
            // Combine TF-IDF and n-gram scores
            const combinedScore = (results.sources[sourceIndex].similarity * 0.6) + (ngramOverlap * 0.4);
            results.sources[sourceIndex].similarity = combinedScore;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    onProgress(50);

    // Step 4: Web/Phrase Search (50-70%)
    onProgress(55);

    const keyPhrases = extractKeyPhrases(text, 6, 10);

    for (let i = 0; i < keyPhrases.length; i++) {
        const result = await searchPhrase(keyPhrases[i]);
        results.keyPhrases.push({
            text: keyPhrases[i],
            found: result.found,
            source: result.source
        });
        onProgress(55 + ((i + 1) / keyPhrases.length) * 15);
    }

    onProgress(70);

    // Step 5: API Checks (70-90%) - Simulated
    onProgress(75);

    // In production, these would be actual API calls
    const apiChecks = [
        { name: 'Copyleaks', status: 'Not configured' },
        { name: 'ZeroGPT', status: 'Not configured' },
        { name: 'Google Scholar', status: 'Rate limited' }
    ];

    for (let i = 0; i < apiChecks.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        onProgress(75 + ((i + 1) / apiChecks.length) * 15);
    }

    onProgress(90);

    // Step 6: Generate Report (90-100%)
    onProgress(95);

    // Calculate overall score
    const sourceScores = results.sources.map(s => s.similarity);
    results.overallScore = sourceScores.reduce((a, b) => a + b, 0) / sourceScores.length;

    // Sort sources by similarity (highest first)
    results.sources.sort((a, b) => b.similarity - a.similarity);

    await new Promise(resolve => setTimeout(resolve, 200));
    onProgress(100);

    return results;
}

/**
 * Export report as HTML
 */
export function exportReportHTML(results) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Plagiarism Report - PlagiarismGuard</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
    h1 { color: #2563eb; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.5rem; border: 1px solid #ddd; text-align: left; }
    th { background: #f3f4f6; }
    .score { font-size: 2rem; font-weight: bold; }
    .good { color: #16a34a; }
    .warning { color: #f59e0b; }
    .danger { color: #dc2626; }
  </style>
</head>
<body>
  <h1>📋 Plagiarism Analysis Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  
  <h2>Summary</h2>
  <p class="score ${results.overallScore < 15 ? 'good' : results.overallScore < 25 ? 'warning' : 'danger'}">
    ${results.overallScore.toFixed(1)}% Overall Similarity
  </p>
  
  <table>
    <tr><th>Word Count</th><td>${results.wordCount}</td></tr>
    <tr><th>Unique Words</th><td>${results.uniqueWords}</td></tr>
    <tr><th>Sources Checked</th><td>${results.sourcesChecked}</td></tr>
  </table>
  
  <h2>Source Analysis</h2>
  <table>
    <tr><th>Source</th><th>Similarity</th><th>Status</th></tr>
    ${results.sources.map(s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.similarity.toFixed(1)}%</td>
        <td>${s.similarity < 15 ? '✓ Pass' : s.similarity < 25 ? '⚠ Review' : '✗ Flag'}</td>
      </tr>
    `).join('')}
  </table>
  
  <footer style="margin-top: 2rem; color: #666; font-size: 0.85rem;">
    <p>Report generated by PlagiarismGuard v1.0</p>
    <p>For official certification, use iThenticate or Turnitin</p>
  </footer>
</body>
</html>
  `;
}
