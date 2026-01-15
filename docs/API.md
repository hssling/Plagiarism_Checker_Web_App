# API Documentation

## Overview

PlagiarismGuard Pro provides both client-side analysis and optional server-side APIs for extended functionality.

## Client-Side API

### `analyzePlagiarism(text, onProgress)`

Main analysis function that runs entirely in the browser.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `text` | `string` | Document text to analyze |
| `onProgress` | `function` | Callback for progress updates (0-100) |

**Returns:** `Promise<AnalysisResult>`

**Example:**
```javascript
import { analyzePlagiarism } from './lib/plagiarismAnalyzer';

const results = await analyzePlagiarism(documentText, (progress) => {
  console.log(`Analysis: ${progress}% complete`);
});

console.log(`Similarity: ${results.overallScore}%`);
```

### AnalysisResult Object

```typescript
interface AnalysisResult {
  overallScore: number;        // 0-100 percentage
  wordCount: number;           // Total words
  uniqueWords: number;         // Unique word count
  maxMatch: number;            // Highest single-source match
  sourcesChecked: number;      // Number of sources compared
  sources: SourceMatch[];      // Detailed source matches
  keyPhrases: KeyPhrase[];     // Extracted phrases
  timestamp: string;           // ISO timestamp
}

interface SourceMatch {
  name: string;                // Source name
  type: string;                // Source type (Report, Paper, etc.)
  similarity: number;          // Match percentage
  url?: string;                // Source URL if available
}

interface KeyPhrase {
  text: string;                // Phrase text
  found: boolean;              // Whether match found
  source?: string;             // Matching source
}
```

---

## Document Parsing

### `parseDocument(file)`

Extracts text from uploaded documents.

**Supported Formats:**
- `.txt` - Plain text
- `.pdf` - PDF documents (via pdf.js)
- `.docx` - Word documents (via mammoth.js)
- `.doc` - Legacy Word (limited support)

**Example:**
```javascript
import { parseDocument } from './lib/documentParser';

const file = event.target.files[0];
const text = await parseDocument(file);
```

---

## Web Search API

### `searchPhrase(phrase)`

Searches for exact phrase matches on the web.

**Note:** Requires Google Custom Search API key.

**Example:**
```javascript
import { searchPhrase } from './lib/webSearch';

const results = await searchPhrase("tuberculosis detection delays");
// Returns array of matching URLs
```

---

## Supabase Integration

### Setup

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Logging Analysis (Optional)

```javascript
// Log analysis for aggregate statistics
await supabase.from('analyses').insert({
  word_count: results.wordCount,
  similarity_score: results.overallScore,
  file_type: 'pdf',
  timestamp: new Date().toISOString()
});
```

### Database Schema

```sql
-- analyses table
CREATE TABLE analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word_count INTEGER,
  similarity_score DECIMAL(5,2),
  file_type VARCHAR(10),
  sources_checked INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- No personal data stored
-- Row-level security enabled
```

---

## Python Backend API

### CLI Usage

```bash
python scripts/multi_api_checker.py input.txt --output report
```

### Options

| Flag | Description |
|------|-------------|
| `--copyleaks` | Use Copyleaks API |
| `--zerogpt` | Use ZeroGPT API |
| `--all-apis` | Use all available APIs |
| `--output FILE` | Output filename |
| `--json` | Also generate JSON report |

### Python Module Usage

```python
from multi_api_checker import PlagiarismChecker, load_config

config = load_config()
checker = PlagiarismChecker(config)

result = checker.analyze(text, use_apis=True)
print(f"Score: {result.overall_score}%")
```

---

## Rate Limits

### Free Tier (No API Keys)
- Unlimited local analysis
- No external API calls

### With Google API
- 100 queries/day (free tier)
- 10,000 queries/day (paid)

### With Copyleaks
- 100 credits/month (free)
- Various paid plans

---

## Error Handling

```javascript
try {
  const results = await analyzePlagiarism(text, onProgress);
} catch (error) {
  if (error.code === 'DOCUMENT_TOO_LARGE') {
    // Handle large document
  } else if (error.code === 'API_RATE_LIMIT') {
    // Handle rate limit
  } else {
    // General error
    console.error('Analysis failed:', error.message);
  }
}
```

---

## Webhooks (Future)

Planned for v2.0:

```javascript
// Register webhook for async analysis
POST /api/analyze
{
  "text": "...",
  "webhook": "https://your-app.com/callback"
}

// Receive results
POST https://your-app.com/callback
{
  "analysis_id": "abc123",
  "status": "complete",
  "results": { ... }
}
```

---

*Last updated: 2026-01-15*
