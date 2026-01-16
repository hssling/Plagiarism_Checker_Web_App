/**
 * Citation Parser - Extract and parse references from academic documents
 * Supports: Vancouver, APA, MLA, Chicago styles
 */

// ==========================================
// REFERENCE SECTION EXTRACTION
// ==========================================

/**
 * Extract the references/bibliography section from document text
 */
export function extractReferencesSection(text) {
    // Common headers for reference sections
    const sectionHeaders = [
        /\n\s*references?\s*\n/i,
        /\n\s*bibliography\s*\n/i,
        /\n\s*works?\s+cited\s*\n/i,
        /\n\s*literature\s+cited\s*\n/i,
        /\n\s*sources?\s*\n/i,
        /\n\s*citations?\s*\n/i
    ];

    let refStart = -1;
    let matchedHeader = '';

    for (const pattern of sectionHeaders) {
        const match = text.match(pattern);
        if (match && match.index !== undefined) {
            if (refStart === -1 || match.index > refStart) {
                refStart = match.index;
                matchedHeader = match[0].trim();
            }
        }
    }

    if (refStart === -1) {
        return { found: false, text: '', header: '' };
    }

    // Extract from header to end of document (or next major section)
    const refSection = text.slice(refStart);

    // Try to find where references end (next major section or appendix)
    const endPatterns = [
        /\n\s*appendix/i,
        /\n\s*supplementary/i,
        /\n\s*acknowledgements?\s*\n/i,
        /\n\s*author\s+contributions?\s*\n/i,
        /\n\s*conflict\s+of\s+interest/i,
        /\n\s*funding\s*\n/i
    ];

    let refEnd = refSection.length;
    for (const pattern of endPatterns) {
        const match = refSection.match(pattern);
        if (match && match.index !== undefined && match.index < refEnd && match.index > 50) {
            refEnd = match.index;
        }
    }

    return {
        found: true,
        text: refSection.slice(0, refEnd).trim(),
        header: matchedHeader
    };
}

// ==========================================
// CITATION STYLE DETECTION
// ==========================================

/**
 * Detect the citation style used in the document
 */
export function detectCitationStyle(text, references = []) {
    const styles = {
        vancouver: 0,
        apa: 0,
        mla: 0,
        chicago: 0,
        ieee: 0
    };

    // Check in-text citations
    const vancouverInText = (text.match(/\[\d+(?:-\d+)?(?:,\s*\d+)*\]/g) || []).length;
    const apaInText = (text.match(/\([A-Z][a-z]+(?:\s+(?:et\s+al\.?|&\s+[A-Z][a-z]+))?,?\s*\d{4}[a-z]?\)/g) || []).length;
    const mlaInText = (text.match(/\([A-Z][a-z]+\s+\d+\)/g) || []).length;
    const superscriptInText = (text.match(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g) || []).length;

    styles.vancouver += vancouverInText * 2;
    styles.apa += apaInText * 2;
    styles.mla += mlaInText * 2;
    styles.ieee += superscriptInText * 2;

    // Check reference format patterns
    for (const ref of references) {
        const refText = typeof ref === 'string' ? ref : ref.original || '';

        // Vancouver: Starts with number, period, then author
        if (/^\d+\.\s*[A-Z]/.test(refText)) {
            styles.vancouver += 3;
        }

        // APA: Author (Year). Title
        if (/^[A-Z][a-z]+,?\s+[A-Z]\..*?\(\d{4}\)/.test(refText)) {
            styles.apa += 3;
        }

        // MLA: Author. "Title." 
        if (/^[A-Z][a-z]+,\s+[A-Z][a-z]+\.\s+"/.test(refText)) {
            styles.mla += 3;
        }

        // Chicago: Author, Firstname. Year.
        if (/^[A-Z][a-z]+,\s+[A-Z][a-z]+\.\s+\d{4}\./.test(refText)) {
            styles.chicago += 3;
        }

        // IEEE: [1] Author
        if (/^\[\d+\]\s*[A-Z]/.test(refText)) {
            styles.ieee += 3;
        }
    }

    // Find the style with highest score
    const maxScore = Math.max(...Object.values(styles));
    if (maxScore === 0) {
        return { style: 'unknown', confidence: 0 };
    }

    const detectedStyle = Object.entries(styles).find(([, score]) => score === maxScore)?.[0] || 'unknown';
    const confidence = Math.min((maxScore / (references.length + vancouverInText + apaInText + 1)) * 100, 100);

    return {
        style: detectedStyle,
        confidence: Math.round(confidence),
        scores: styles
    };
}

// ==========================================
// REFERENCE PARSING
// ==========================================

/**
 * Split reference section into individual references
 */
export function splitReferences(refSectionText) {
    const references = [];

    // Remove the header
    let text = refSectionText.replace(/^(references?|bibliography|works?\s+cited|literature\s+cited|sources?|citations?)\s*/i, '').trim();

    // Try different splitting strategies

    // Strategy 1: Numbered references [1], 1., (1)
    const numberedPattern = /(?:^|\n)\s*(?:\[(\d+)\]|(\d+)\.|(\d+)\))\s*/gm;
    const numberedMatches = [...text.matchAll(numberedPattern)];

    if (numberedMatches.length >= 3) {
        for (let i = 0; i < numberedMatches.length; i++) {
            const start = numberedMatches[i].index + numberedMatches[i][0].length;
            const end = i < numberedMatches.length - 1 ? numberedMatches[i + 1].index : text.length;
            const refText = text.slice(start, end).trim();

            if (refText.length > 10) {
                references.push({
                    number: parseInt(numberedMatches[i][1] || numberedMatches[i][2] || numberedMatches[i][3]),
                    original: refText
                });
            }
        }
        return references;
    }

    // Strategy 2: Line-by-line (each reference on new line)
    const lines = text.split(/\n+/).filter(line => line.trim().length > 20);

    if (lines.length >= 2) {
        let refNum = 1;
        for (const line of lines) {
            references.push({
                number: refNum++,
                original: line.trim()
            });
        }
        return references;
    }

    // Strategy 3: Period-based splitting for run-on text
    const periodSplit = text.split(/\.\s+(?=[A-Z][a-z]+,?\s+[A-Z])/);
    if (periodSplit.length >= 2) {
        let refNum = 1;
        for (const chunk of periodSplit) {
            if (chunk.trim().length > 20) {
                references.push({
                    number: refNum++,
                    original: chunk.trim() + (chunk.endsWith('.') ? '' : '.')
                });
            }
        }
    }

    return references;
}

/**
 * Parse a single reference into structured fields
 */
export function parseReference(refText, style = 'auto') {
    const result = {
        original: refText,
        authors: [],
        year: null,
        title: null,
        journal: null,
        volume: null,
        issue: null,
        pages: null,
        doi: null,
        url: null,
        pmid: null,
        parsed: false
    };

    // Extract DOI
    const doiMatch = refText.match(/10\.\d{4,}\/[^\s\]>]+/i);
    if (doiMatch) {
        result.doi = doiMatch[0].replace(/[.,;:]$/, ''); // Remove trailing punctuation
    }

    // Extract URL
    const urlMatch = refText.match(/https?:\/\/[^\s\]>]+/i);
    if (urlMatch) {
        result.url = urlMatch[0].replace(/[.,;:]$/, '');
    }

    // Extract PMID
    const pmidMatch = refText.match(/PMID[:\s]*(\d+)/i);
    if (pmidMatch) {
        result.pmid = pmidMatch[1];
    }

    // Extract Year (4-digit number in parentheses or standalone)
    const yearMatch = refText.match(/\(?(19|20)\d{2}\)?/);
    if (yearMatch) {
        result.year = parseInt(yearMatch[0].replace(/[()]/g, ''));
    }

    // Extract Authors (beginning of reference, before year or title)
    const authorSection = refText.split(/\(\d{4}\)|(?:19|20)\d{2}/)[0];
    if (authorSection) {
        // Split by common author separators
        const authorParts = authorSection
            .replace(/^\d+\.?\s*/, '') // Remove leading number
            .split(/,\s*(?=[A-Z][a-z])|;\s*|\s+and\s+|\s+&\s+/)
            .map(a => a.trim())
            .filter(a => a.length > 1 && a.length < 50);

        result.authors = authorParts.slice(0, 10); // Cap at 10 authors
    }

    // Extract Title (usually in quotes or after year)
    const titlePatterns = [
        /"([^"]+)"/,                    // "Title in quotes"
        /'([^']+)'/,                    // 'Title in single quotes'
        /\d{4}\)?[.\s]+([^.]+\.)/,      // After year: Title ending with period
    ];

    for (const pattern of titlePatterns) {
        const match = refText.match(pattern);
        if (match && match[1] && match[1].length > 10) {
            result.title = match[1].trim();
            break;
        }
    }

    // Extract Journal (often in italics in original, or after title)
    const journalMatch = refText.match(/(?:In|Published in|)\s*([A-Z][A-Za-z\s&]+(?:Journal|Review|Medicine|Lancet|BMJ|JAMA|Nature|Science|PLOS|Cell|Proc|Ann|Am J|Br J|Int J|Eur J)[A-Za-z\s]*)/i);
    if (journalMatch) {
        result.journal = journalMatch[1].trim();
    }

    // Extract Volume/Issue/Pages
    const volMatch = refText.match(/(\d+)\s*\((\d+)\)\s*[:\s]*(\d+[-–]\d+|\d+)/);
    if (volMatch) {
        result.volume = volMatch[1];
        result.issue = volMatch[2];
        result.pages = volMatch[3];
    } else {
        // Try simpler patterns
        const pagesMatch = refText.match(/(?:pp?\.|pages?)[:\s]*(\d+[-–]\d+)/i);
        if (pagesMatch) {
            result.pages = pagesMatch[1];
        }
    }

    // Mark as parsed if we got essential fields
    result.parsed = !!(result.authors.length > 0 || result.title || result.doi);

    return result;
}

// ==========================================
// IN-TEXT CITATION DETECTION
// ==========================================

/**
 * Find all in-text citations and their positions
 */
export function findInTextCitations(text) {
    const citations = [];

    // Vancouver style: [1], [2-5], [1,3,5]
    const vancouverPattern = /\[(\d+(?:[-–]\d+)?(?:,\s*\d+)*)\]/g;
    let match;
    while ((match = vancouverPattern.exec(text)) !== null) {
        const numbers = parseNumberRange(match[1]);
        citations.push({
            type: 'vancouver',
            text: match[0],
            position: match.index,
            references: numbers
        });
    }

    // APA style: (Smith, 2020), (Smith & Jones, 2020), (Smith et al., 2020)
    const apaPattern = /\(([A-Z][a-z]+(?:\s+(?:et\s+al\.?|&\s+[A-Z][a-z]+(?:\s+&\s+[A-Z][a-z]+)?))?),?\s*(\d{4}[a-z]?)\)/g;
    while ((match = apaPattern.exec(text)) !== null) {
        citations.push({
            type: 'apa',
            text: match[0],
            position: match.index,
            author: match[1],
            year: match[2]
        });
    }

    // Superscript numbers: ¹²³
    const superscriptPattern = /([¹²³⁴⁵⁶⁷⁸⁹⁰]+)/g;
    while ((match = superscriptPattern.exec(text)) !== null) {
        const numbers = match[1].split('').map(char => {
            const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹';
            return superscripts.indexOf(char);
        }).filter(n => n >= 0);

        if (numbers.length > 0) {
            citations.push({
                type: 'superscript',
                text: match[0],
                position: match.index,
                references: numbers
            });
        }
    }

    // Sort by position
    citations.sort((a, b) => a.position - b.position);

    return citations;
}

/**
 * Parse number ranges like "1-5" or "1,3,5" into array of numbers
 */
function parseNumberRange(str) {
    const numbers = [];
    const parts = str.split(/,\s*/);

    for (const part of parts) {
        if (part.includes('-') || part.includes('–')) {
            const [start, end] = part.split(/[-–]/).map(n => parseInt(n.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) {
                    numbers.push(i);
                }
            }
        } else {
            const num = parseInt(part.trim());
            if (!isNaN(num)) {
                numbers.push(num);
            }
        }
    }

    return [...new Set(numbers)].sort((a, b) => a - b);
}

// ==========================================
// MAIN ANALYSIS FUNCTION
// ==========================================

/**
 * Perform complete citation analysis on document text
 */
export function analyzeCitationsLocal(text) {
    // Step 1: Extract references section
    const refSection = extractReferencesSection(text);

    // Step 2: Split into individual references
    const rawReferences = refSection.found ? splitReferences(refSection.text) : [];

    // Step 3: Parse each reference
    const references = rawReferences.map(ref => ({
        ...ref,
        ...parseReference(ref.original)
    }));

    // Step 4: Detect citation style
    const styleInfo = detectCitationStyle(text, references);

    // Step 5: Find in-text citations
    const inTextCitations = findInTextCitations(text);

    // Step 6: Cross-reference citations to references
    const citationMap = new Map();
    const unreferencedCitations = [];

    for (const citation of inTextCitations) {
        if (citation.references) {
            for (const refNum of citation.references) {
                const ref = references.find(r => r.number === refNum);
                if (ref) {
                    if (!citationMap.has(refNum)) {
                        citationMap.set(refNum, { count: 0, positions: [] });
                    }
                    citationMap.get(refNum).count++;
                    citationMap.get(refNum).positions.push(citation.position);
                } else {
                    unreferencedCitations.push({ citation, refNum });
                }
            }
        }
    }

    // Step 7: Find uncited references
    const uncitedReferences = references.filter(ref => !citationMap.has(ref.number));

    // Step 8: Identify issues
    const issues = [];

    if (unreferencedCitations.length > 0) {
        issues.push({
            type: 'missing_reference',
            severity: 'error',
            message: `${unreferencedCitations.length} citation(s) reference non-existent sources`,
            details: unreferencedCitations.map(u => `[${u.refNum}]`).join(', ')
        });
    }

    if (uncitedReferences.length > 0) {
        issues.push({
            type: 'uncited_reference',
            severity: 'warning',
            message: `${uncitedReferences.length} reference(s) are never cited in text`,
            details: uncitedReferences.map(r => `#${r.number}`).join(', ')
        });
    }

    // Check for references without DOIs (in academic writing)
    const noDOICount = references.filter(r => !r.doi && !r.url && !r.pmid).length;
    if (noDOICount > references.length * 0.5 && references.length > 3) {
        issues.push({
            type: 'missing_identifiers',
            severity: 'info',
            message: `${noDOICount} reference(s) lack DOI/URL/PMID identifiers`,
            details: 'Consider adding DOIs for better verifiability'
        });
    }

    return {
        found: refSection.found,
        style: styleInfo.style,
        styleConfidence: styleInfo.confidence,
        references,
        inTextCitations,
        citationMap: Object.fromEntries(citationMap),
        issues,
        stats: {
            totalReferences: references.length,
            totalCitations: inTextCitations.length,
            uncitedCount: uncitedReferences.length,
            missingRefCount: unreferencedCitations.length,
            withDOI: references.filter(r => r.doi).length,
            withURL: references.filter(r => r.url).length,
            withPMID: references.filter(r => r.pmid).length
        }
    };
}

export default {
    extractReferencesSection,
    detectCitationStyle,
    splitReferences,
    parseReference,
    findInTextCitations,
    analyzeCitationsLocal
};
