import { useState, useMemo, useEffect, useCallback } from 'react';
import { useDataset } from '../context/DatasetContext';
import { computeBase, evaluateWorldviewRow } from '../utils/valueScoring';
import valueModeWorldviews from '../../config/valueModeWorldviews.json';

const STORAGE_KEY = 'value_state';
const STATE_VERSION = 3;

// Worldviews shown as rows. Sourced from a mode-specific config file so they can
// be edited independently of the quiz/table presets — discrepancies between
// this file and the others are intentional and not a dev concern.
const WORLDVIEW_POOL = valueModeWorldviews.worldviews;

// Non-DR-derived calc defaults. drStepSize comes from the dataset; the rest are
// the tunables a future debugger panel would override (kept here so nothing is a
// magic number buried in valueScoring.js).
const DEFAULT_PARAMS = { step: 1, chunk: 1, maxDollars: 4000 };

/**
 * Seed two contrasting allocations so the grid shows live numbers on first
 * load:
 *   - Allocation 1: the dataset budget spread evenly across all projects.
 *   - Allocation 2: the whole budget on the first project.
 * The two diverge enough that most worldviews value them quite differently,
 * exercising both the surmountable and unsurmountable (N/A) gap cases.
 */
function buildDefaultAllocations(projectIds, budget) {
  const even = {};
  const perProject = budget / projectIds.length;
  for (const id of projectIds) even[id] = perProject;

  const onFirst = { [projectIds[0]]: budget };

  return [even, onFirst];
}

function loadSavedState() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.version !== STATE_VERSION) return null;
    const { allocations } = parsed.state;
    if (!Array.isArray(allocations) || allocations.length !== 2) return null;
    return { allocations };
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

  // Memoise each worldview's expensive base computation by identity.
  const bases = useMemo(() => WORLDVIEW_POOL.map((wv) => computeBase(data, wv)), [data]);

  // Derived per-worldview rows — instant on every allocation keystroke.
  const rows = useMemo(
    () =>
      WORLDVIEW_POOL.map((wv, i) => ({
        name: wv.name,
        worldview: wv,
        ...evaluateWorldviewRow(data, allocations[0], allocations[1], bases[i], params),
      })),
    [data, allocations, bases, params]
  );

  // Dataset label metadata, for rendering the per-worldview values tooltip.
  const labels = useMemo(
    () => ({
      moralWeightKeys: dataset.moralWeightKeys ?? [],
      discountFactorLabels: dataset.discountFactorLabels ?? [],
      riskProfileOptions: dataset.riskProfileOptions ?? [],
    }),
    [dataset.moralWeightKeys, dataset.discountFactorLabels, dataset.riskProfileOptions]
  );

  // Persist allocations (debounced).
  useEffect(() => {
    const t = setTimeout(() => saveState({ allocations }), 300);
    return () => clearTimeout(t);
  }, [allocations]);

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

  return {
    projectList,
    allocations,
    rows,
    labels,
    params,
    setAllocation,
    resetAllocations,
  };
}
