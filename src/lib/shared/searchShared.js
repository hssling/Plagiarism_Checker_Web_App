/**
 * PlagiarismGuard - Shared Search Sources
 * Environment-agnostic implementation of search strategies.
 */

// Simple XML snippet extractor for arXiv (replaces DOMParser in Node.js)
function extractXmlTags(xml, tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
    const matches = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
        matches.push(match[1]);
    }
    return matches;
}

export async function executeSearch(phrase, config, fetchFn) {
    const results = [];
    const searchStrategies = [
        () => searchSemanticScholar(phrase, fetchFn),
        () => searchOpenAlex(phrase, fetchFn),
        () => searchPubMed(phrase, fetchFn),
        () => searchCrossRef(phrase, fetchFn),
        () => searchArxiv(phrase, fetchFn),
        () => searchOpenLibrary(phrase, fetchFn)
        // Others simplified for the initial shared implementation
    ];

    // Concurrency control (limited for serverless stability)
    for (let i = 0; i < searchStrategies.length; i += 2) {
        const batch = searchStrategies.slice(i, i + 2).map(fn => fn());
        const batchResults = await Promise.allSettled(batch);
        batchResults.forEach(res => {
            if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                results.push(...res.value);
            }
        });
    }

    return results;
}

async function searchSemanticScholar(phrase, fetchFn) {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(phrase)}&limit=3&fields=title,url,abstract`;
    const res = await fetchFn(url, {}, true); // true = useProxy if needed
    if (res?.ok) {
        const data = await res.json();
        return (data.data || []).map(p => ({
            title: p.title, url: p.url, snippet: p.abstract || '', source: 'Semantic Scholar', type: 'Academic Paper'
        }));
    }
    return [];
}

async function searchOpenAlex(phrase, fetchFn) {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(phrase)}&per-page=3`;
    const res = await fetchFn(url, {}, false);
    if (res?.ok) {
        const data = await res.json();
        return (data.results || []).map(w => ({
            title: w.title || w.display_name, url: w.doi || w.ids?.openalex, snippet: 'Scholarly Record', source: 'OpenAlex', type: 'Scholarly Work'
        }));
    }
    return [];
}

async function searchPubMed(phrase, fetchFn) {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(phrase)}&retmode=json&retmax=3`;
    const res = await fetchFn(url, {}, true);
    if (res?.ok) {
        const data = await res.json();
        const ids = data.esearchresult?.idlist || [];
        return ids.map(id => ({
            title: `PubMed Publication ${id}`, url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, snippet: `Academic medical research (ID: ${id})`, source: 'PubMed', type: 'Medical Research'
        }));
    }
    return [];
}

async function searchCrossRef(phrase, fetchFn) {
    const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(phrase)}&rows=3`;
    const res = await fetchFn(url, {}, true);
    if (res?.ok) {
        const data = await res.json();
        return (data.message?.items || []).map(i => ({
            title: i.title?.[0], url: i.URL, snippet: '', source: 'CrossRef', type: 'Metadata'
        }));
    }
    return [];
}

async function searchArxiv(phrase, fetchFn) {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(phrase)}&start=0&max_results=3`;
    const res = await fetchFn(url, {}, true);
    if (res?.ok) {
        const xml = await res.text();
        const entries = extractXmlTags(xml, 'entry');
        return entries.map(entry => {
            const title = extractXmlTags(entry, 'title')[0] || 'Unknown';
            const id = extractXmlTags(entry, 'id')[0] || '';
            const summary = extractXmlTags(entry, 'summary')[0] || '';
            return { title, url: id, snippet: summary.substring(0, 200), source: 'arXiv', type: 'Preprint' };
        });
    }
    return [];
}

async function searchOpenLibrary(phrase, fetchFn) {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(phrase)}&limit=3`;
    const res = await fetchFn(url, {}, false);
    if (res?.ok) {
        const data = await res.json();
        return (data.docs || []).map(d => ({
            title: d.title, url: `https://openlibrary.org${d.key}`, snippet: d.first_sentence?.[0] || '', source: 'Open Library', type: 'Book'
        }));
    }
    return [];
}
