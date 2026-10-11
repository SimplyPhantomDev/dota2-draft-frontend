// Convert raw matchup data into the maps used by every scoring function.
// Normal drafting and the tutorial share this conversion, including baseline validation.
export function indexMatrix(data) {
  const idx = {};

  for (const [heroId, entry] of Object.entries(data)) {
    const withMap = new Map();
    const vsMap = new Map();

    for (const p of entry.with || []) {
      withMap.set(String(p.heroId2), p.synergy);
    }

    for (const p of entry.vs || []) {
      vsMap.set(String(p.heroId2), p.synergy);
    }

    // Older and incomplete datasets have no usable baseline.
    // Validate counts and the 0–1 winrate before retaining it for draft analysis.
    const candidate = entry.baseline;
    const validBaseline = candidate != null &&
      Number.isSafeInteger(candidate.winCount) && candidate.winCount >= 0 &&
      Number.isSafeInteger(candidate.matchCount) && candidate.matchCount > 0 &&
      candidate.winCount <= candidate.matchCount &&
      Number.isFinite(candidate.winRate) &&
      candidate.winRate >= 0 && candidate.winRate <= 1 &&
      Math.abs(candidate.winRate - candidate.winCount / candidate.matchCount) < 1e-12;

    const baseline = validBaseline ? {
      winCount: candidate.winCount,
      matchCount: candidate.matchCount,
      winRate: candidate.winRate,
    } : null;

    idx[String(heroId)] = { withMap, vsMap, baseline };
  }

  return idx;
}