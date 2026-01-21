# 📘 PlagiarismGuard Pro v3.2.0 User Guide

Welcome to **PlagiarismGuard Pro**, the comprehensive academic integrity tool. This guide covers the advanced features, including the new Remediation Engine and Scientific Scoring.

---

## 🚀 Getting Started

### Option 1: Web App (No Installation)
Visit [plagiarism-checker-web-app.vercel.app](https://plagiarism-checker-web-app.vercel.app)

### Option 2: Browser Extension
1. Go to the `extension/` folder in the source code.
2. Open `chrome://extensions` in Chrome/Edge.
3. Enable **Developer Mode**.
4. Click **Load Unpacked** and select the `extension` folder.
*Now you can right-click any webpage text to scan it instantly!*

---

## ⚡ Core Features

### 1. Scientific Plagiarism Detection
We use the **Exact Coverage** standard (similar to Turnitin/iThenticate).
*   **What it means**: The score reflects the *exact percentage* of words in your document that match external sources in sequences of 5 or more words.
*   **No False Positives**: We exclude:
    *   **Citations**: Text in `[1]` or `(Smith, 2020)`
    *   **Quotes**: Text between `" "` marks.
    *   **Common Phrases**: Generic academic linkers (e.g., "in the context of").

### 2. Remediation Pro (Fix it Fast)
Found plagiarism? Fix it instantly without leaving the app.
1. Run a scan.
2. Click the **"Remediate"** button next to a flagged segment.
3. The AI will generate a **paraphrased version** that keeps the meaning but changes the structure.
4. Choose **"Formal"** (for journals) or **"Narrative"** (for essays).

### 3. Teacher Dashboard
*   **Analytics**: View charts showing plagiarism trends across all student submissions.
*   **Audit Log**: Export a CSV of every scan performed this session.

---

## 🧠 Configuring the AI Hub

PlagiarismGuard Pro connects to multiple AI providers for resilience. You can configure this in **Settings**.

### Getting Your API Keys
We have added direct links in the Settings menu, but here is the reference:

| Provider | Model | Performance | Get Key |
|----------|-------|-------------|---------|
| **Google Gemini** | Flash 1.5 | ⚡ Fast & Free | [Get Key](https://aistudio.google.com/app/apikey) |
| **OpenAI** | GPT-4o | 🧠 Smartest | [Get Key](https://platform.openai.com/api-keys) |
| **Anthropic** | Claude 3.5 | ✍️ Natural Writing | [Get Key](https://console.anthropic.com/settings/keys) |
| **Groq** | Llama 3 | 🚀 Ultra Fast | [Get Key](https://console.groq.com/keys) |

> **Note**: Your keys are stored securely in your browser. We never see them.

---

## 🔍 Understanding Your Report

### Similarity Score Guide
| Score | Status | Action Required |
|-------|--------|----------------|
| **0-10%** | 🟢 Safe | Likely just standard terminology. |
| **10-24%** | 🟡 Monitor | Check if quotes are properly cited. |
| **25%+** | 🔴 Critical | Significant matching content found. Rewrite required. |

### The "Details" Tab
*   **Matches**: Shows the exact source URL and the % of text matched.
*   **AI Probability**: Shows the likelihood the text was AI-generated (requires AI Hub setup).
*   **Intent**: Analyzes if the copying looks accidental (missing quotes) or deliberate.

---

## 🆘 Troubleshooting

**"Production Error" on Vercel?**
*   Ensure you have configured your environment variables if using custom backend features.
*   Check the browser console (F12) for detailed error logs.

**"AI Check Failed"?**
*   Go to **Settings**.
*   Click **"Run Diagnostic"** to test your API connection.
*   Ensure you have credits in your API provider account.

---

## 📄 License & Attribution
**PlagiarismGuard Pro** is Open Source (MIT License).
Developed by **Dr. Siddalingaiah H S**.
