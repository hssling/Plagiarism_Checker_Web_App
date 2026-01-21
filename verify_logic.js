
import { cleanText, getShingleMatches, isCommonChain } from './src/lib/shared/analysisShared.js';

async function runTest() {
    console.log("Starting Verification Test...");

    // Test 1: Common Phrase Logic
    const commonText = "in the context of the proposed changes it is important to note that";
    console.log(`Analyzing Common Phrase: "${commonText}"`);
    console.log(`Is Common Chain? ${isCommonChain(commonText)}`);

    // Test 2: Exact Coverage Logic
    const text1 = "The results of this study showed that X is Y [1]. However, Z is A.";
    const text2 = "The results of this study showed that X is Y. However, Z is A.";

    // Create an exclusion range for the first part of the sentence (approx indices)
    // "The results of this study showed that" is roughly 0-40 chars
    const exclusion = [{ start: 0, end: 40 }];

    console.log("\nTesting Exact Coverage (k=5)...");

    // Run without exclusion
    const res = getShingleMatches(text1, text2, 5, []);
    console.log(`Coverage (No Exclusion): ${res.coverage.toFixed(2)}% (${res.matchedIndices.size}/${res.totalWords} words)`);

    // Run with exclusion
    const resExcluded = getShingleMatches(text1, text2, 5, exclusion);
    console.log(`Coverage (With Exclusion): ${resExcluded.coverage.toFixed(2)}% (${resExcluded.matchedIndices.size}/${resExcluded.totalWords} words)`);

    if (resExcluded.coverage < res.coverage) {
        console.log("PASS: Exclusion logic successfully reduced the coverage.");
    } else {
        console.error("FAIL: Exclusion logic did not reduce coverage.");
    }

    // Test 3: Multiple Matches aggregation
    // text1 has 10 words. If 5 match source A and 5 match source B, coverage should be 100%.
    // But our getShingleMatches tests one source. The aggregation happens in analyzer.
    // We can just verify that getShingleMatches returns specific indices.

    console.log(`\nMatched Indices (No Excl): ${Array.from(res.matchedIndices).join(', ')}`);

    console.log("\nTest Complete.");
}

runTest();
