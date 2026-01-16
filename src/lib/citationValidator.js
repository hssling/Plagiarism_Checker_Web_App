/**
 * Citation Validator - Validate references against external APIs
 * Uses: CrossRef, OpenAlex for DOI/reference verification
 */

const VALIDATION_TIMEOUT = 8000; // 8 seconds per request
const RATE_LIMIT_DELAY = 300; // 300ms between requests

// ==========================================
// DOI VALIDATION via CrossRef
// ==========================================

/**
 * Validate a DOI against CrossRef API
 */
export async function validateDOI(doi) {
    if (!doi) {
        return { valid: false, error: 'No DOI provided' };
    }

    // Normalize DOI
    const cleanDOI = doi.replace(/^https?:\/\/doi\.org\//i, '').trim();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);

        const response = await fetch(
            `https://api.crossref.org/works/${encodeURIComponent(cleanDOI)}`,
            {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'PlagiarismGuard/2.0 (Academic Tool; mailto:support@plagiarismguard.com)'
                }
            }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 404) {
                return { valid: false, error: 'DOI not found in CrossRef' };
            }
            return { valid: false, error: `CrossRef error: ${response.status}` };
        }

        const data = await response.json();
        const work = data.message;

        return {
            valid: true,
            source: 'crossref',
            data: {
                doi: work.DOI,
                title: work.title?.[0] || null,
                authors: (work.author || []).map(a => `${a.given || ''} ${a.family || ''}`.trim()),
                year: work.published?.['date-parts']?.[0]?.[0] || work.created?.['date-parts']?.[0]?.[0],
                journal: work['container-title']?.[0] || null,
                publisher: work.publisher || null,
                type: work.type || null,
                url: work.URL || `https://doi.org/${work.DOI}`
            }
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            return { valid: false, error: 'Request timeout' };
        }
        return { valid: false, error: error.message };
    }
}

// ==========================================
// REFERENCE SEARCH via OpenAlex
// ==========================================

/**
 * Search for a reference in OpenAlex by title/author
 */
export async function searchOpenAlex(query, filters = {}) {
    if (!query || query.length < 10) {
        return { found: false, error: 'Query too short' };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);

        // Build search URL
        let url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=5`;

        if (filters.year) {
            url += `&filter=publication_year:${filters.year}`;
        }

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'PlagiarismGuard/2.0 (Academic Tool)'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return { found: false, error: `OpenAlex error: ${response.status}` };
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return { found: false, error: 'No matches found' };
        }

        // Return top matches
        const matches = data.results.slice(0, 3).map(work => ({
            title: work.title,
            authors: (work.authorships || []).map(a => a.author?.display_name).filter(Boolean),
            year: work.publication_year,
            doi: work.doi?.replace('https://doi.org/', ''),
            journal: work.primary_location?.source?.display_name,
            openAlexId: work.id,
            citedByCount: work.cited_by_count,
            url: work.doi || work.id
        }));

        return {
            found: true,
            source: 'openalex',
            matches,
            bestMatch: matches[0]
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            return { found: false, error: 'Request timeout' };
        }
        return { found: false, error: error.message };
    }
}

// ==========================================
// REFERENCE VALIDATION
// ==========================================

/**
 * Validate a single parsed reference
 */
export async function validateReference(ref) {
    const result = {
        referenceNumber: ref.number,
        original: ref.original,
        status: 'unknown', // 'valid', 'partial', 'suspicious', 'unverified', 'error'
        confidence: 0,
        issues: [],
        verification: null
    };

    // Strategy 1: If DOI exists, validate it directly
    if (ref.doi) {
        const doiResult = await validateDOI(ref.doi);

        if (doiResult.valid) {
            result.status = 'valid';
            result.confidence = 95;
            result.verification = {
                method: 'doi',
                source: 'crossref',
                data: doiResult.data
            };

            // Cross-check author/year if we have them
            if (ref.year && doiResult.data.year && ref.year !== doiResult.data.year) {
                result.issues.push({
                    type: 'year_mismatch',
                    message: `Year mismatch: reference says ${ref.year}, DOI says ${doiResult.data.year}`
                });
                result.confidence -= 20;
                result.status = 'partial';
            }

            return result;
        } else {
            result.issues.push({
                type: 'invalid_doi',
                message: `DOI validation failed: ${doiResult.error}`
            });
        }
    }

    // Strategy 2: Search by title
    if (ref.title && ref.title.length > 15) {
        const searchResult = await searchOpenAlex(ref.title, { year: ref.year });

        if (searchResult.found && searchResult.bestMatch) {
            const match = searchResult.bestMatch;

            // Calculate similarity score
            let matchScore = 0;

            // Title similarity (fuzzy)
            const titleSimilarity = calculateStringSimilarity(
                ref.title.toLowerCase(),
                match.title?.toLowerCase() || ''
            );
            matchScore += titleSimilarity * 50;

            // Year match
            if (ref.year && match.year && ref.year === match.year) {
                matchScore += 25;
            } else if (ref.year && match.year && Math.abs(ref.year - match.year) <= 1) {
                matchScore += 15;
            }

            // Author match (any author name appears)
            if (ref.authors && ref.authors.length > 0 && match.authors) {
                const refAuthorLower = ref.authors.join(' ').toLowerCase();
                const matchAuthorLower = match.authors.join(' ').toLowerCase();

                for (const author of ref.authors) {
                    const lastName = author.split(/[,\s]+/)[0].toLowerCase();
                    if (lastName.length > 2 && matchAuthorLower.includes(lastName)) {
                        matchScore += 10;
                        break;
                    }
                }
            }

            result.confidence = Math.min(matchScore, 100);
            result.verification = {
                method: 'title_search',
                source: 'openalex',
                data: match,
                similarity: titleSimilarity
            };

            if (matchScore >= 70) {
                result.status = 'valid';
            } else if (matchScore >= 40) {
                result.status = 'partial';
                result.issues.push({
                    type: 'partial_match',
                    message: 'Reference partially matches a known publication'
                });
            } else {
                result.status = 'suspicious';
                result.issues.push({
                    type: 'low_match',
                    message: 'Could not confidently verify this reference'
                });
            }

            return result;
        }
    }

    // Strategy 3: Search by author + year
    if (ref.authors && ref.authors.length > 0 && ref.year) {
        const authorQuery = ref.authors[0].split(/[,\s]+/)[0]; // First author's last name
        const searchQuery = `${authorQuery} ${ref.year}`;

        const searchResult = await searchOpenAlex(searchQuery, { year: ref.year });

        if (searchResult.found) {
            result.status = 'unverified';
            result.confidence = 30;
            result.verification = {
                method: 'author_year_search',
                source: 'openalex',
                possibleMatches: searchResult.matches
            };
            result.issues.push({
                type: 'manual_review',
                message: 'Found similar publications but could not auto-verify'
            });
            return result;
        }
    }

    // No verification possible
    result.status = 'unverified';
    result.confidence = 0;
    result.issues.push({
        type: 'no_identifiers',
        message: 'Reference lacks DOI/title for automated verification'
    });

    return result;
}

/**
 * Calculate string similarity (Jaccard-like)
 */
function calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return 0;

    let intersection = 0;
    for (const word of words1) {
        if (words2.has(word)) intersection++;
    }

    return intersection / Math.max(words1.size, words2.size);
}

// ==========================================
// BATCH VALIDATION
// ==========================================

/**
 * Validate all references with rate limiting
 */
export async function batchValidateReferences(references, onProgress) {
    const results = [];
    const total = references.length;

    // Limit to 15 references for performance (can be adjusted)
    const toValidate = references.slice(0, 15);

    for (let i = 0; i < toValidate.length; i++) {
        const ref = toValidate[i];

        try {
            const validation = await validateReference(ref);
            results.push(validation);
        } catch (error) {
            results.push({
                referenceNumber: ref.number,
                original: ref.original,
                status: 'error',
                confidence: 0,
                issues: [{ type: 'error', message: error.message }],
                verification: null
            });
        }

        // Progress callback
        if (onProgress) {
            onProgress(Math.round(((i + 1) / toValidate.length) * 100));
        }

        // Rate limiting
        if (i < toValidate.length - 1) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
    }

    // Mark remaining references as not validated (if we hit the limit)
    for (let i = toValidate.length; i < references.length; i++) {
        results.push({
            referenceNumber: references[i].number,
            original: references[i].original,
            status: 'skipped',
            confidence: 0,
            issues: [{ type: 'skipped', message: 'Skipped due to batch limit' }],
            verification: null
        });
    }

    // Compute summary stats
    const summary = {
        total: references.length,
        validated: toValidate.length,
        valid: results.filter(r => r.status === 'valid').length,
        partial: results.filter(r => r.status === 'partial').length,
        suspicious: results.filter(r => r.status === 'suspicious').length,
        unverified: results.filter(r => r.status === 'unverified').length,
        errors: results.filter(r => r.status === 'error').length,
        skipped: results.filter(r => r.status === 'skipped').length
    };

    return { results, summary };
}

export default {
    validateDOI,
    searchOpenAlex,
    validateReference,
    batchValidateReferences
};
