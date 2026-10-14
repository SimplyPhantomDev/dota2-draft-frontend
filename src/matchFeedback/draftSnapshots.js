export const PENDING_DRAFT_KEY = "d2dt.match-feedback.pending.v1";

function draftIds(selectedHeroes) {
  if (selectedHeroes?.ally?.length !== 5
    || selectedHeroes?.enemy?.length !== 5) {
    return null;
  }

  const ally = selectedHeroes.ally.map(hero => Number(hero.HeroId));
  const enemy = selectedHeroes.enemy.map(hero => Number(hero.HeroId));
  const all = [...ally, ...enemy];

  if (
    all.some(id => !Number.isSafeInteger(id) || id <= 0)
    || new Set(all).size !== 10
  ) {
    return null;
  }

  return { ally, enemy };
}

export function getDraftKey(selectedHeroes) {
  const ids = draftIds(selectedHeroes);

  return ids ? JSON.stringify([
    [...ids.ally].sort((a, b) => a - b),
    [...ids.enemy].sort((a, b) => a - b),
  ]) : null;
}

export function createDraftSnapshot({
  selectedHeroes,
  prediction,
  manifest,
  appVersion,
  now = Date.now(),
  id = crypto.randomUUID(),
}) {
  const ids = draftIds(selectedHeroes);

  if (
    !ids
    || !Number.isFinite(prediction?.ally)
    || prediction.ally < 0
    || prediction.ally > 1
  ) {
    return null;
  }

  return {
    schema: 1,
    id,
    draftKey: getDraftKey(selectedHeroes),
    allyHeroIds: ids.ally,
    enemyHeroIds: ids.enemy,
    capturedAt: new Date(now).toISOString(),
    firstLeftAt: null,
    predictedAllyWinRate: prediction.ally,
    displayedAllyWinPercent: Math.round(prediction.ally * 10000) / 100,
    predictorVersion: "baseline-average-v1",
    appVersion: appVersion ?? null,
    dataset: {
      generatedAt: manifest?.generatedAt ?? null,
      sha256: manifest?.sha256 ?? null,
      patch: manifest?.patch ?? null,
    },
  };
}

export function readPendingDraft(storage = localStorage) {
  const raw = storage.getItem(PENDING_DRAFT_KEY);
  if (raw === null) return null;

  const draft = JSON.parse(raw);
  const ids = [
    ...(draft?.allyHeroIds ?? []),
    ...(draft?.enemyHeroIds ?? []),
  ];

  if (
    draft?.schema !== 1
    || typeof draft.id !== "string"
    || draft.allyHeroIds?.length !== 5
    || draft.enemyHeroIds?.length !== 5
    || ids.some(id => !Number.isSafeInteger(id) || id <= 0)
    || new Set(ids).size !== 10
    || !Number.isFinite(Date.parse(draft.capturedAt))
    || (
      draft.firstLeftAt !== null
      && !Number.isFinite(Date.parse(draft.firstLeftAt))
    )
    || !Number.isFinite(draft.predictedAllyWinRate)
    || draft.predictedAllyWinRate < 0
    || draft.predictedAllyWinRate > 1
  ) {
    // Preserve unexpected stored data instead of silently overwriting it.
    throw new Error("The saved match-feedback draft is invalid.");
  }

  return draft;
}

export function savePendingDraft(draft, storage = localStorage) {
  storage.setItem(PENDING_DRAFT_KEY, JSON.stringify(draft));
}

export function clearPendingDraft(storage = localStorage) {
  storage.removeItem(PENDING_DRAFT_KEY);
}

export function markDraftLeft(now = Date.now(), storage = localStorage) {
  const draft = readPendingDraft(storage);

  if (!draft || draft.firstLeftAt !== null) return;

  savePendingDraft({
    ...draft,
    firstLeftAt: new Date(now).toISOString(),
  }, storage);
}