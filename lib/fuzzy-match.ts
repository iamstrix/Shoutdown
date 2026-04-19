// ─── Fuzzy Matching (Levenshtein Distance) ───────────────────────────────────

/**
 * Compute Levenshtein edit distance between two strings.
 * Uses an optimized single-row DP approach.
 */
export function levenshteinDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;

  if (la === 0) return lb;
  if (lb === 0) return la;

  // Previous row of distances
  const prev = new Array<number>(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    let prevDiag = prev[0];
    prev[0] = i;

    for (let j = 1; j <= lb; j++) {
      const temp = prev[j];
      if (a[i - 1] === b[j - 1]) {
        prev[j] = prevDiag;
      } else {
        prev[j] = 1 + Math.min(prevDiag, prev[j - 1], prev[j]);
      }
      prevDiag = temp;
    }
  }

  return prev[lb];
}

/**
 * Normalized similarity score between 0 and 1.
 * 1 = exact match, 0 = completely different.
 */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Find the best matching word from the pool against a spoken phrase.
 * Returns the matched word index or -1 if no match exceeds threshold.
 *
 * Strategy:
 * 1. Check exact substring match (spoken phrase contains the word)
 * 2. Check individual spoken tokens against word tokens
 * 3. Fuzzy match the full spoken phrase against each word
 * 4. Fuzzy match each spoken token against single-word entries
 */
export function findBestMatch(
  spokenPhrase: string,
  words: { text: string; cleared: boolean }[],
  threshold: number
): number {
  const spoken = spokenPhrase.toLowerCase().trim();
  if (!spoken) return -1;

  let bestIndex = -1;
  let bestScore = threshold;

  const spokenTokens = spoken.split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    if (words[i].cleared) continue;

    const wordText = words[i].text.toLowerCase().trim();

    // 1. Exact match
    if (spoken === wordText) return i;

    // 2. Spoken phrase contains the word as substring
    if (spoken.includes(wordText) && wordText.length >= 3) {
      const score = 0.95; // very high confidence
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
      continue;
    }

    // 3. Word contains spoken phrase (for short spoken phrases)
    if (wordText.includes(spoken) && spoken.length >= 3) {
      const score = 0.85;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
      continue;
    }

    // 4. Token-level matching for multi-word entries
    const wordTokens = wordText.split(/\s+/);
    if (wordTokens.length > 1) {
      // Check if enough word tokens match spoken tokens
      let matchedTokens = 0;
      for (const wt of wordTokens) {
        for (const st of spokenTokens) {
          const sim = similarity(st, wt);
          if (sim >= 0.75) {
            matchedTokens++;
            break;
          }
        }
      }
      const tokenScore = matchedTokens / wordTokens.length;
      if (tokenScore > bestScore) {
        bestScore = tokenScore;
        bestIndex = i;
      }
    }

    // 5. Full fuzzy match
    const fullSim = similarity(spoken, wordText);
    if (fullSim > bestScore) {
      bestScore = fullSim;
      bestIndex = i;
    }

    // 6. For single-word entries, check each spoken token
    if (wordTokens.length === 1) {
      for (const token of spokenTokens) {
        const tokenSim = similarity(token, wordText);
        if (tokenSim > bestScore) {
          bestScore = tokenSim;
          bestIndex = i;
        }
      }
    }
  }

  return bestIndex;
}
