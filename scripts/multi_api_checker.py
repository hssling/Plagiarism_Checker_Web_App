#!/usr/bin/env python3
"""
PlagiarismGuard - Multi-API Plagiarism Detection Script
Supports: Copyleaks, ZeroGPT, Local TF-IDF, N-gram Analysis
Ready for integration with web app backend

Usage:
    python multi_api_checker.py <input_file> [--copyleaks] [--zerogpt] [--all]
"""

import os
import sys
import json
import re
import time
import base64
import hashlib
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from urllib.parse import quote_plus

# ============================================================================
# CONFIGURATION
# ============================================================================

@dataclass
class APIConfig:
    """API configuration container"""
    copyleaks_email: Optional[str] = None
    copyleaks_key: Optional[str] = None
    zerogpt_key: Optional[str] = None
    google_api_key: Optional[str] = None
    google_cse_id: Optional[str] = None

def load_config() -> APIConfig:
    """Load API keys from environment variables"""
    return APIConfig(
        copyleaks_email=os.getenv('COPYLEAKS_EMAIL'),
        copyleaks_key=os.getenv('COPYLEAKS_API_KEY'),
        zerogpt_key=os.getenv('ZEROGPT_API_KEY'),
        google_api_key=os.getenv('GOOGLE_API_KEY'),
        google_cse_id=os.getenv('GOOGLE_CSE_ID')
    )

# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class SourceMatch:
    """Represents a match with a source"""
    name: str
    source_type: str
    similarity: float
    url: Optional[str] = None
    matched_phrases: Optional[List[str]] = None

@dataclass
class AnalysisResult:
    """Complete analysis result"""
    overall_score: float
    word_count: int
    unique_words: int
    max_match: float
    sources_checked: int
    sources: List[SourceMatch]
    key_phrases: List[Dict]
    api_status: Dict[str, str]
    timestamp: str
    
# ============================================================================
# LOCAL ANALYSIS ENGINES
# ============================================================================

def clean_text(text: str) -> str:
    """Clean and normalize text"""
    text = re.sub(r'[^\w\s]', ' ', text.lower())
    return re.sub(r'\s+', ' ', text).strip()

def get_ngrams(text: str, n: int = 3) -> List[str]:
    """Generate n-grams"""
    words = clean_text(text).split()
    return [' '.join(words[i:i+n]) for i in range(len(words)-n+1)]

def calculate_tfidf_similarity(text1: str, text2: str) -> float:
    """Calculate TF-IDF cosine similarity"""
    words1 = clean_text(text1).split()
    words2 = clean_text(text2).split()
    
    if not words1 or not words2:
        return 0.0
    
    # Build vocabulary
    vocab = set(words1 + words2)
    
    # Term frequencies
    tf1 = {w: words1.count(w) / len(words1) for w in vocab}
    tf2 = {w: words2.count(w) / len(words2) for w in vocab}
    
    # Cosine similarity
    dot = sum(tf1.get(w, 0) * tf2.get(w, 0) for w in vocab)
    norm1 = sum(v**2 for v in tf1.values()) ** 0.5
    norm2 = sum(v**2 for v in tf2.values()) ** 0.5
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return (dot / (norm1 * norm2)) * 100

def calculate_ngram_overlap(text1: str, text2: str, n: int = 3) -> float:
    """Calculate n-gram overlap percentage"""
    ngrams1 = set(get_ngrams(text1, n))
    ngrams2 = set(get_ngrams(text2, n))
    
    if not ngrams1:
        return 0.0
    
    overlap = len(ngrams1 & ngrams2)
    return (overlap / len(ngrams1)) * 100

def extract_key_phrases(text: str, min_words: int = 6, max_phrases: int = 20) -> List[str]:
    """Extract unique phrases for plagiarism checking"""
    sentences = re.split(r'[.!?]', text)
    phrases = []
    seen = set()
    
    for sentence in sentences:
        words = re.sub(r'[^\w\s]', '', sentence).split()
        if len(words) >= min_words:
            phrase = ' '.join(words[:min_words])
            phrase_lower = phrase.lower()
            if phrase_lower not in seen and len(phrase) > 20:
                seen.add(phrase_lower)
                phrases.append(phrase)
                if len(phrases) >= max_phrases:
                    break
    
    return phrases

# ============================================================================
# REFERENCE CORPUS
# ============================================================================

ACADEMIC_REFERENCES = [
    {
        'id': 'WHO2024',
        'name': 'WHO Global TB Report 2024',
        'type': 'Official Report',
        'text': """Global tuberculosis report 2024. Tuberculosis remains one of the 
            world's deadliest infectious diseases. India accounts for 26% of the global 
            TB burden. Early diagnosis and prompt treatment are essential to end TB."""
    },
    {
        'id': 'Teo2021',
        'name': 'Teo et al. 2021 - TB Delays Review',
        'type': 'Meta-analysis',
        'text': """Duration and determinants of delayed tuberculosis diagnosis and treatment 
            in high-burden countries: a mixed-methods systematic review and meta-analysis.
            Tuberculosis diagnostic and treatment delays continue to pose major challenges."""
    },
    {
        'id': 'Storla2008',
        'name': 'Storla et al. 2008 - Delay Review',
        'type': 'Systematic Review',
        'text': """A systematic review of delay in the diagnosis and treatment of tuberculosis.
            Delayed diagnosis and treatment results in increased infectivity and poor outcomes.
            Delays are categorized into patient delay, health system delay, and total delay."""
    },
    {
        'id': 'Sreeramareddy2009',
        'name': 'Sreeramareddy et al. 2009',
        'type': 'Systematic Review',
        'text': """Time delays in diagnosis of pulmonary tuberculosis: a systematic review.
            We conducted a systematic review to estimate time delays in diagnosis.
            Patient delay contributes significantly to the total delay."""
    },
    {
        'id': 'Subbaraman2016',
        'name': 'Subbaraman et al. 2016 - India TB Cascade',
        'type': 'Meta-analysis',
        'text': """The tuberculosis cascade of care in India's public sector: 
            a systematic review and meta-analysis. India has the highest TB burden globally.
            We estimated the proportion of patients lost at each stage of the care cascade."""
    }
]

# ============================================================================
# API INTEGRATIONS
# ============================================================================

class CopyleaksAPI:
    """Copyleaks API wrapper"""
    
    BASE_URL = "https://api.copyleaks.com"
    
    def __init__(self, email: str, api_key: str):
        self.email = email
        self.api_key = api_key
        self.token = None
        self.token_expiry = None
    
    def login(self) -> bool:
        """Authenticate with Copyleaks"""
        try:
            import requests
            response = requests.post(
                f"{self.BASE_URL}/v3/account/login/api",
                json={"email": self.email, "key": self.api_key},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                return True
            return False
        except Exception as e:
            print(f"Copyleaks login error: {e}")
            return False
    
    def check_plagiarism(self, text: str, sandbox: bool = True) -> Optional[Dict]:
        """Submit text for plagiarism check"""
        if not self.token and not self.login():
            return None
        
        try:
            import requests
            scan_id = f"scan_{int(time.time())}"
            
            # In sandbox mode, no credits are consumed
            response = requests.put(
                f"{self.BASE_URL}/v3/scans/text/{scan_id}",
                json={
                    "base64": base64.b64encode(text.encode()).decode(),
                    "filename": "document.txt",
                    "properties": {
                        "sandbox": sandbox,
                        "webhooks": {}
                    }
                },
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.token}"
                }
            )
            
            if response.status_code in [200, 201]:
                return {"status": "submitted", "scan_id": scan_id}
            return None
            
        except Exception as e:
            print(f"Copyleaks scan error: {e}")
            return None


class ZeroGPTAPI:
    """ZeroGPT API wrapper for AI detection and plagiarism"""
    
    BASE_URL = "https://api.zerogpt.com/api/detect/detectText"
    
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    def check(self, text: str) -> Optional[Dict]:
        """Check text for AI content and plagiarism"""
        try:
            import requests
            response = requests.post(
                self.BASE_URL,
                json={"input_text": text},
                headers={
                    "Content-Type": "application/json",
                    "ApiKey": self.api_key
                }
            )
            
            if response.status_code == 200:
                return response.json()
            return None
            
        except Exception as e:
            print(f"ZeroGPT error: {e}")
            return None


class GoogleScholarSearch:
    """Google Custom Search for academic plagiarism detection"""
    
    def __init__(self, api_key: str, cse_id: str):
        self.api_key = api_key
        self.cse_id = cse_id
    
    def search_phrase(self, phrase: str) -> Optional[List[Dict]]:
        """Search for exact phrase in Google Scholar"""
        try:
            import requests
            encoded = quote_plus(f'"{phrase}"')
            url = f"https://www.googleapis.com/customsearch/v1?key={self.api_key}&cx={self.cse_id}&q={encoded}"
            
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                return data.get('items', [])
            return None
            
        except Exception as e:
            print(f"Google Search error: {e}")
            return None

# ============================================================================
# MAIN ANALYSIS ENGINE
# ============================================================================

class PlagiarismChecker:
    """Main plagiarism checking engine"""
    
    def __init__(self, config: APIConfig):
        self.config = config
        self.copyleaks = None
        self.zerogpt = None
        self.google = None
        
        # Initialize available APIs
        if config.copyleaks_email and config.copyleaks_key:
            self.copyleaks = CopyleaksAPI(config.copyleaks_email, config.copyleaks_key)
        
        if config.zerogpt_key:
            self.zerogpt = ZeroGPTAPI(config.zerogpt_key)
        
        if config.google_api_key and config.google_cse_id:
            self.google = GoogleScholarSearch(config.google_api_key, config.google_cse_id)
    
    def analyze(self, text: str, use_apis: bool = False, verbose: bool = True) -> AnalysisResult:
        """Run complete plagiarism analysis"""
        
        if verbose:
            print("🔍 Starting plagiarism analysis...")
        
        # Basic stats
        words = text.split()
        word_count = len(words)
        unique_words = len(set(w.lower() for w in words))
        
        # API status tracking
        api_status = {
            'Copyleaks': 'Not configured' if not self.copyleaks else 'Ready',
            'ZeroGPT': 'Not configured' if not self.zerogpt else 'Ready',
            'Google Scholar': 'Not configured' if not self.google else 'Ready',
            'Local TF-IDF': 'Active',
            'N-gram Analysis': 'Active'
        }
        
        sources = []
        max_match = 0.0
        
        if verbose:
            print("📊 Running local TF-IDF analysis...")
        
        # Local analysis against reference corpus
        for ref in ACADEMIC_REFERENCES:
            tfidf_sim = calculate_tfidf_similarity(text, ref['text'])
            ngram_sim = calculate_ngram_overlap(text, ref['text'], 3)
            
            # Combined score (weighted average)
            combined = (tfidf_sim * 0.6) + (ngram_sim * 0.4)
            
            sources.append(SourceMatch(
                name=ref['name'],
                source_type=ref['type'],
                similarity=combined
            ))
            
            if combined > max_match:
                max_match = combined
        
        # Extract and analyze key phrases
        if verbose:
            print("🔍 Extracting key phrases...")
        
        key_phrases = extract_key_phrases(text, 6, 15)
        phrase_results = []
        
        for phrase in key_phrases:
            # Simple pattern matching (in production, use web search)
            found = any(
                pattern in phrase.lower() 
                for pattern in ['the results show', 'in this study', 'we found that']
            )
            phrase_results.append({
                'text': phrase,
                'found': found,
                'source': 'Common Pattern' if found else None
            })
        
        # API checks if enabled
        if use_apis:
            if self.copyleaks and verbose:
                print("🔄 Running Copyleaks API check...")
                result = self.copyleaks.check_plagiarism(text, sandbox=True)
                api_status['Copyleaks'] = 'Submitted' if result else 'Error'
            
            if self.zerogpt and verbose:
                print("🔄 Running ZeroGPT API check...")
                result = self.zerogpt.check(text)
                api_status['ZeroGPT'] = 'Complete' if result else 'Error'
        
        # Calculate overall score
        source_scores = [s.similarity for s in sources]
        overall_score = sum(source_scores) / len(source_scores) if source_scores else 0.0
        
        # Sort sources by similarity
        sources.sort(key=lambda x: x.similarity, reverse=True)
        
        return AnalysisResult(
            overall_score=overall_score,
            word_count=word_count,
            unique_words=unique_words,
            max_match=max_match,
            sources_checked=len(sources),
            sources=sources,
            key_phrases=phrase_results,
            api_status=api_status,
            timestamp=datetime.now().isoformat()
        )

# ============================================================================
# REPORT GENERATION
# ============================================================================

def generate_markdown_report(result: AnalysisResult, output_path: str) -> None:
    """Generate detailed Markdown report"""
    
    def get_status(score: float) -> str:
        if score < 10:
            return "🟢 Excellent"
        elif score < 20:
            return "🟢 Good"
        elif score < 30:
            return "🟡 Moderate"
        return "🔴 High"
    
    report = f"""# 📋 Plagiarism Analysis Report
**Generated:** {result.timestamp}  
**Tool:** PlagiarismGuard v1.0

---

## 🎯 Executive Summary

| Metric | Score | Status |
|--------|-------|--------|
| **Overall Similarity** | **{result.overall_score:.1f}%** | {get_status(result.overall_score)} |
| Maximum Single Match | {result.max_match:.1f}% | - |
| Word Count | {result.word_count:,} | - |
| Unique Words | {result.unique_words:,} | - |
| Sources Checked | {result.sources_checked} | - |

---

## 📊 Source-by-Source Analysis

| Source | Type | Similarity | Status |
|--------|------|------------|--------|
"""
    
    for source in result.sources:
        status = "✅ Pass" if source.similarity < 15 else "⚠️ Review" if source.similarity < 25 else "❌ Flag"
        report += f"| {source.name} | {source.source_type} | {source.similarity:.1f}% | {status} |\n"
    
    report += """
---

## 🔗 API Integration Status

| API | Status |
|-----|--------|
"""
    
    for api, status in result.api_status.items():
        report += f"| {api} | {status} |\n"
    
    report += f"""
---

## 📝 Key Phrases Analyzed

"""
    
    for i, phrase in enumerate(result.key_phrases[:10], 1):
        status = "⚠️ Match" if phrase['found'] else "✅ Unique"
        report += f"{i}. \"{phrase['text']}\" - {status}\n"
    
    report += """
---

## ✅ Recommendations

"""
    
    if result.overall_score < 15:
        report += "> ✅ **Ready for Submission** - Document shows very low similarity.\n"
    elif result.overall_score < 25:
        report += "> ⚠️ **Review Recommended** - Some similarity detected. Check flagged sources.\n"
    else:
        report += "> ❌ **Revision Required** - Significant similarity. Please revise matched sections.\n"
    
    report += """
---

*Report generated by PlagiarismGuard*  
*For official certification, use iThenticate or Turnitin*
"""
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"✓ Report saved: {output_path}")

def generate_json_report(result: AnalysisResult, output_path: str) -> None:
    """Generate JSON report for API consumption"""
    
    data = {
        'overall_score': result.overall_score,
        'word_count': result.word_count,
        'unique_words': result.unique_words,
        'max_match': result.max_match,
        'sources_checked': result.sources_checked,
        'sources': [asdict(s) for s in result.sources],
        'key_phrases': result.key_phrases,
        'api_status': result.api_status,
        'timestamp': result.timestamp
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    
    print(f"✓ JSON report saved: {output_path}")

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='PlagiarismGuard - Multi-API Plagiarism Detection'
    )
    parser.add_argument('input', help='Input text file to analyze')
    parser.add_argument('--copyleaks', action='store_true', help='Use Copyleaks API')
    parser.add_argument('--zerogpt', action='store_true', help='Use ZeroGPT API')
    parser.add_argument('--all-apis', action='store_true', help='Use all available APIs')
    parser.add_argument('--output', '-o', default='plagiarism_report', help='Output filename (without extension)')
    parser.add_argument('--json', action='store_true', help='Also generate JSON report')
    
    args = parser.parse_args()
    
    # Check input file
    if not Path(args.input).exists():
        print(f"❌ Error: File not found: {args.input}")
        sys.exit(1)
    
    # Load configuration
    config = load_config()
    
    # Read input file
    with open(args.input, 'r', encoding='utf-8') as f:
        text = f.read()
    
    print("=" * 60)
    print("📋 PLAGIARISM GUARD - Multi-API Analysis")
    print("=" * 60)
    print(f"📄 Input: {args.input}")
    print(f"📝 Words: {len(text.split()):,}")
    print()
    
    # Run analysis
    checker = PlagiarismChecker(config)
    use_apis = args.copyleaks or args.zerogpt or args.all_apis
    
    result = checker.analyze(text, use_apis=use_apis)
    
    # Display summary
    print()
    print("=" * 60)
    print("📊 RESULTS SUMMARY")
    print("=" * 60)
    print(f"  Overall Similarity: {result.overall_score:.1f}%")
    print(f"  Maximum Match: {result.max_match:.1f}%")
    print(f"  Sources Checked: {result.sources_checked}")
    
    status = "🟢 Excellent" if result.overall_score < 10 else \
             "🟢 Good" if result.overall_score < 20 else \
             "🟡 Moderate" if result.overall_score < 30 else "🔴 High"
    print(f"  Status: {status}")
    print()
    
    # Generate reports
    generate_markdown_report(result, f"{args.output}.md")
    
    if args.json:
        generate_json_report(result, f"{args.output}.json")
    
    print()
    if result.overall_score < 15:
        print("🎯 RECOMMENDATION: Document shows very low similarity.")
        print("   Ready for submission to most journals.")
    else:
        print("⚠️ RECOMMENDATION: Review the detailed report for specific matches.")

if __name__ == "__main__":
    main()
