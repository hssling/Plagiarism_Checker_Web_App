# System Architecture

## Overview

PlagiarismGuard Pro is a modern web application built with a decoupled architecture that separates concerns between the frontend, analysis engines, and optional backend services.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
├─────────────────────────────────────────────────────────────────┤
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    React Frontend                        │   │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│   │  │  Upload  │ │  Input   │ │ Progress │ │ Results  │   │   │
│   │  │Component │ │Component │ │Component │ │Dashboard │   │   │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Analysis Engine (JavaScript)                │   │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│   │  │  TF-IDF  │ │  N-gram  │ │  Parser  │ │  Report  │   │   │
│   │  │  Engine  │ │  Engine  │ │  Engine  │ │Generator │   │   │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│   │ Supabase │  │  Google  │  │Copyleaks │  │CrossRef  │       │
│   │    DB    │  │  Search  │  │   API    │  │   API    │       │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Components

| Component | Purpose | State |
|-----------|---------|-------|
| `App.jsx` | Main container, routing | Global app state |
| `Header.jsx` | Branding, navigation | None |
| `FileUpload.jsx` | File drag-drop, selection | File, upload status |
| `TextInput.jsx` | Text paste input | Text content |
| `AnalysisProgress.jsx` | Progress display | Progress % |
| `ResultsDashboard.jsx` | Results visualization | Analysis results |
| `ReportExport.jsx` | Export functionality | Export format |

### Analysis Library (`src/lib/`)

```javascript
// Analysis pipeline
const pipeline = [
  documentParser,    // Extract text from PDF/DOCX
  textPreprocessor,  // Clean, normalize, tokenize
  tfidfAnalyzer,     // TF-IDF similarity
  ngramAnalyzer,     // Phrase matching
  webSearcher,       // Optional web search
  scoreAggregator,   // Combine scores
  reportGenerator    // Generate output
];
```

### Data Flow

```
Document Input
      │
      ▼
┌─────────────┐
│  Document   │
│   Parser    │──────> Raw Text
└─────────────┘
      │
      ▼
┌─────────────┐
│  Text       │
│ Preprocessor│──────> Clean Tokens
└─────────────┘
      │
      ├──────────────────┬──────────────────┐
      ▼                  ▼                  ▼
┌───────────┐    ┌───────────┐    ┌─────────────┐
│  TF-IDF   │    │  N-gram   │    │ Web Search  │
│  Engine   │    │  Engine   │    │   Engine    │
└───────────┘    └───────────┘    └─────────────┘
      │                  │                  │
      └──────────────────┴──────────────────┘
                         │
                         ▼
                ┌─────────────┐
                │   Score     │
                │ Aggregator  │──────> Final Score
                └─────────────┘
                         │
                         ▼
                ┌─────────────┐
                │  Report     │
                │ Generator   │──────> Detailed Report
                └─────────────┘
```

## Technology Decisions

### Why React + Vite?
- Fast development with HMR
- Optimized production builds
- Modern JavaScript support
- Large ecosystem

### Why Client-Side Analysis?
- Privacy: Documents never leave browser
- Speed: No network latency for local analysis
- Cost: No server infrastructure needed
- Scalability: Unlimited users

### Why Supabase?
- PostgreSQL database
- Real-time subscriptions
- Row-level security
- Generous free tier
- Easy integration

## Security Considerations

1. **No document storage** - Files processed in memory only
2. **Client-side analysis** - Sensitive content stays local
3. **Optional backend** - APIs only used when configured
4. **Environment variables** - Secrets never in code

## Performance Optimizations

1. **Lazy loading** - Components loaded on demand
2. **Web Workers** - Analysis runs off main thread (planned)
3. **Caching** - Reference corpus cached locally
4. **Chunked processing** - Large documents split for analysis

## Future Architecture

### Version 2.0 Plans

```
┌─────────────────────────────────────────────────────────────────┐
│                     PlagiarismGuard 2.0                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  React App  │  │  ML Models  │  │   Browser   │             │
│  │  (Current)  │  │  (TensorFlow│  │  Extension  │             │
│  │             │  │    .js)     │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│            │              │              │                       │
│            └──────────────┴──────────────┘                       │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Supabase Backend                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │   │
│  │  │ Database │ │   Auth   │ │  Edge    │ │ Storage  │    │   │
│  │  │(Postgres)│ │ (Optional│ │Functions │ │  (Docs)  │    │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

*Last updated: 2026-01-15*
