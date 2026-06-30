import { useState, useMemo, useEffect, useCallback } from 'react';
import { useDataset } from '../context/DatasetContext';
import { computeBase, evaluateWorldviewRow } from '../utils/valueScoring';
import valueModeWorldviews from '../../config/valueModeWorldviews.json';

const STORAGE_KEY = 'value_state';
const STATE_VERSION = 4;

// Default worldviews shown as rows. Sourced from a mode-specific config file so
// they can be edited independently of the quiz/table presets — discrepancies
// between this file and the others are intentional and not a dev concern. The
// user can replace these at runtime by importing a Table Mode share link (see
// `worldviewOverride`).
const WORLDVIEW_POOL = valueModeWorldviews.worldviews;

// Non-DR-derived calc defaults. drStepSize comes from the dataset; the rest are
// the tunables a future debugger panel would override (kept here so nothing is a
// magic number buried in valueScoring.js).
const DEFAULT_PARAMS = { step: 1, chunk: 1, maxDollars: 4000 };

// The two seed allocation columns, configured in valueModeWorldviews.json so
// the numbers can be edited without touching this hook (see that file's
// `defaultAllocations.description`).
const DEFAULT_ALLOCATIONS = valueModeWorldviews.defaultAllocations?.columns ?? [];

// Built-in fallbacks, used per-column when the config column is missing or its
// weights reference no project id present in the active dataset.
function fallbackColumn(index, projectIds, budget) {
  if (index === 0) {
    const even = {};
    const perProject = budget / projectIds.length;
    for (const id of projectIds) even[id] = perProject;
    return even;
  }
  return { [projectIds[0]]: budget };
}

// Turn one config column's fractional weights into dollar amounts for the
// active dataset's projects. Returns null if no weight matches, so the caller
// can fall back.
function columnFromWeights(weights, projectIds, budget) {
  if (!weights) return null;
  const matched = projectIds.filter((id) => id in weights);
  if (matched.length === 0) return null;
  const col = {};
  for (const id of matched) col[id] = budget * weights[id];
  return col;
}

/**
 * Seed two contrasting allocations so the grid shows live numbers on first
 * load (and on reset). The numbers come from valueModeWorldviews.json's
 * `defaultAllocations`; by default that's:
 *   - Allocation 1: RP's recommended split of the budget across the funds.
 *   - Allocation 2: the whole budget on the first project.
 * The two diverge enough that most worldviews value them quite differently,
 * exercising both the surmountable and unsurmountable (N/A) gap cases.
 */
function buildDefaultAllocations(projectIds, budget) {
  return [0, 1].map((index) => {
    const configured = columnFromWeights(DEFAULT_ALLOCATIONS[index]?.weights, projectIds, budget);
    return configured ?? fallbackColumn(index, projectIds, budget);
  });
}

function loadSavedState() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.version !== STATE_VERSION) return null;
    const { allocations, floorNegativeScores, worldviewOverride } = parsed.state;
    if (!Array.isArray(allocations) || allocations.length !== 2) return null;
    return {
      allocations,
      floorNegativeScores: !!floorNegativeScores,
      // An imported set, or null to use the config default. Must be a non-empty
      // array if present.
      worldviewOverride:
        Array.isArray(worldviewOverride) && worldviewOverride.length ? worldviewOverride : null,
    };
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STATE_VERSION, state }));
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

/**
 * State + derived results for value mode (#value).
 *
 * Holds exactly two allocation columns; everything else is derived. Each
 * worldview in the pool becomes an output row comparing how it values the two
 * allocations (scores, gap, and the dollars the lagging allocation needs to
 * catch up). Per-worldview base values are memoised so typing in an allocation
 * never recomputes a base, and results flow straight from a useMemo (no
 * recalculate button).
 */
export function useValueState() {
  const { dataset } = useDataset();
  const data = dataset.projects;

  const projectList = useMemo(
    () => Object.entries(data).map(([id, p]) => ({ id, name: p.name, color: p.color })),
    [data]
  );

  const params = useMemo(
    () => ({ ...DEFAULT_PARAMS, drStepSize: dataset.drStepSize ?? 10 }),
    [dataset.drStepSize]
  );

  const [allocations, setAllocations] = useState(() => {
    const saved = loadSavedState();
    if (saved) return saved.allocations;
    return buildDefaultAllocations(
      projectList.map((p) => p.id),
      dataset.budget ?? 400
    );
  });

  // When on, negative allocation scores are floored to 0 before the gap and
  // catch-up are computed (see evaluateWorldviewRow).
  const [floorNegativeScores, setFloorNegativeScores] = useState(
    () => loadSavedState()?.floorNegativeScores ?? false
  );

  // Worldview rows come from the config pool by default, or from a set the user
  // imported from a Table Mode share link. Null = use the config default.
  // Persisted (sessionStorage) so an import survives reload, nothing harder.
  const [worldviewOverride, setWorldviewOverride] = useState(
    () => loadSavedState()?.worldviewOverride ?? null
  );

  const activePool = worldviewOverride ?? WORLDVIEW_POOL;

  // Memoise each worldview's expensive base computation by identity.
  const bases = useMemo(() => activePool.map((wv) => computeBase(data, wv)), [data, activePool]);

  // Derived per-worldview rows — instant on every allocation keystroke.
  const rowParams = useMemo(
    () => ({ ...params, floorNegativeScores }),
    [params, floorNegativeScores]
  );

  const rows = useMemo(
    () =>
      activePool.map((wv, i) => ({
        name: wv.name,
        worldview: wv,
        ...evaluateWorldviewRow(data, allocations[0], allocations[1], bases[i], rowParams),
      })),
    [data, allocations, bases, rowParams, activePool]
  );

  // Totals row: each allocation's score summed across all worldviews, and the
  // gap as the signed difference of those two totals (Σv1 − Σv2). Because the
  // per-row gaps are now signed (value1 − value2), this also equals the sum of
  // the per-row gaps exactly — the "same number two ways" holds.
  const totals = useMemo(() => {
    const value1 = rows.reduce((sum, r) => sum + r.value1, 0);
    const value2 = rows.reduce((sum, r) => sum + r.value2, 0);
    return { value1, value2, gap: value1 - value2 };
  }, [rows]);

  // Dataset label metadata, for rendering the per-worldview values tooltip.
  const labels = useMemo(
    () => ({
      moralWeightKeys: dataset.moralWeightKeys ?? [],
      discountFactorLabels: dataset.discountFactorLabels ?? [],
      riskProfileOptions: dataset.riskProfileOptions ?? [],
    }),
    [dataset.moralWeightKeys, dataset.discountFactorLabels, dataset.riskProfileOptions]
  );

  // Persist allocations + toggle + imported worldviews (debounced).
  useEffect(() => {
    const t = setTimeout(
      () => saveState({ allocations, floorNegativeScores, worldviewOverride }),
      300
    );
    return () => clearTimeout(t);
  }, [allocations, floorNegativeScores, worldviewOverride]);

  const setAllocation = useCallback((colIndex, projectId, value) => {
    setAllocations((prev) => {
      const next = prev.map((col) => ({ ...col }));
      next[colIndex][projectId] = value;
      return next;
    });
  }, []);

  const resetAllocations = useCallback(() => {
    setAllocations(
      buildDefaultAllocations(
        projectList.map((p) => p.id),
        dataset.budget ?? 400
      )
    );
  }, [projectList, dataset.budget]);

  // Replace the worldview rows with an imported set (from a share link).
  const importWorldviews = useCallback((worldviews) => {
    setWorldviewOverride(worldviews);
  }, []);

  // Drop the imported set and go back to the config default.
  const restoreDefaultWorldviews = useCallback(() => {
    setWorldviewOverride(null);
  }, []);

  return {
    projectList,
    allocations,
    rows,
    totals,
    labels,
    params,
    floorNegativeScores,
    setFloorNegativeScores,
    setAllocation,
    resetAllocations,
    worldviewsImported: worldviewOverride != null,
    importWorldviews,
    restoreDefaultWorldviews,
  };
}
