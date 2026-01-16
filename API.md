# 🔌 PlagiarismGuard API Documentation

> **Base URL**: `https://plagiarism-checker-web-app.vercel.app/api`  
> **Version**: 1.0

---

## Authentication

All endpoints (except `/health`) require an API key.

**Header Format:**
```
X-API-Key: pg_test_your_key_here
```

**Key Types:**
- `pg_test_*` — Test keys (free tier)
- `pg_live_*` — Production keys

**Demo Key for Testing:**
```
pg_test_demo123456789012345678
```

---

## Rate Limits

| Tier | Requests/Hour |
|------|---------------|
| Free | 10 |
| Basic | 100 |
| Pro | 1000 |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1705420800
```

---

## Endpoints

### `POST /api/analyze`

Analyze text for plagiarism and citations.

**Request:**
```bash
curl -X POST https://plagiarism-checker-web-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: pg_test_demo123456789012345678" \
  -d '{
    "text": "Your document text here...",
    "options": {
      "includeCitations": true,
      "maxSources": 10
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overallScore": 15.5,
    "wordCount": 250,
    "uniqueWords": 180,
    "maxMatch": 12.4,
    "sourcesChecked": 10,
    "sources": [
      {
        "id": "src_0",
        "name": "Academic Source 1",
        "similarity": 22.5,
        "type": "Journal Article"
      }
    ],
    "keyPhrases": [...],
    "citations": {
      "style": "vancouver",
      "styleConfidence": 0.7,
      "inTextCount": 5,
      "referencesCount": 8
    },
    "processingTime": 1250
  },
  "meta": {
    "processedAt": "2026-01-16T20:00:00.000Z",
    "processingTime": 1250,
    "tier": "free",
    "apiVersion": "1.0"
  }
}
```

**Error Responses:**

| Code | Status | Description |
|------|--------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid API key |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| TEXT_TOO_SHORT | 400 | Text under 50 characters |
| TEXT_TOO_LONG | 400 | Text over 100,000 characters |

---

### `GET /api/health`

Check API status (no auth required).

**Request:**
```bash
curl https://plagiarism-checker-web-app.vercel.app/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "2.1.0",
  "timestamp": "2026-01-16T20:00:00.000Z",
  "endpoints": {
    "analyze": "POST /api/analyze",
    "health": "GET /api/health"
  }
}
```

---

## Error Format

All errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## Examples

### JavaScript (fetch)
```javascript
const response = await fetch('https://plagiarism-checker-web-app.vercel.app/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'pg_test_demo123456789012345678'
  },
  body: JSON.stringify({
    text: 'Your document text here...'
  })
});

const data = await response.json();
console.log(data.data.overallScore);
```

### Python (requests)
```python
import requests

response = requests.post(
    'https://plagiarism-checker-web-app.vercel.app/api/analyze',
    headers={'X-API-Key': 'pg_test_demo123456789012345678'},
    json={'text': 'Your document text here...'}
)

data = response.json()
print(f"Similarity: {data['data']['overallScore']}%")
```

---

## Support

- **GitHub**: [hssling/Plagiarism_Checker_Web_App](https://github.com/hssling/Plagiarism_Checker_Web_App)
- **Issues**: Report bugs via GitHub Issues
