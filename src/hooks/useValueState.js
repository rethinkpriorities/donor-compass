import { useState, useMemo, useEffect, useCallback } from 'react';
import { useDataset } from '../context/DatasetContext';
import { computeBase, evaluateColumn } from '../utils/valueScoring';
import worldviewPresets from '../../config/worldviewPresets.json';

const STORAGE_KEY = 'value_state';
const STATE_VERSION = 2;

// Worldviews seeded into the two scorer slots. longtermist is deliberately one
// of them: it scores the x-risk funds hugely negative (so an even split goes
// negative — an unsurmountable gap) and its best positive fund is modest (so
// catch-up costs real, visible dollars rather than closing instantly).
const DEFAULT_WORLDVIEW_IDS = ['human_focused', 'longtermist'];

// Pool of worldviews the two scorers can be chosen from. For now this is the
// preset list; a future selector will let the user swap either slot by id.
const WORLDVIEW_POOL = worldviewPresets.presets;

function resolveWorldview(id) {
  return WORLDVIEW_POOL.find((w) => w.id === id) ?? WORLDVIEW_POOL[0];
}

// Non-DR-derived calc defaults. drStepSize comes from the dataset; the rest are
// the tunables a future debugger panel would override (kept here so nothing is a
// magic number buried in valueScoring.js).
const DEFAULT_PARAMS = { step: 1, chunk: 1, maxDollars: 4000 };

/**
 * Seed three contrasting allocations so the grid shows the full range of
 * behaviours on first load (with the default human_focused × longtermist pair):
 *   - Even split: drags longtermist negative → unsurmountable gap (N/A).
 *   - All on GiveWell: a large but surmountable gap (~$442M).
 *   - All on LEAF: a smaller surmountable gap (~$82M).
 */
function buildDefaultAllocations(projectIds, budget) {
  const even = {};
  const perProject = budget / projectIds.length;
  for (const id of projectIds) even[id] = perProject;

  const onFirst = { [projectIds[0]]: budget };
  const onLast = { [projectIds[projectIds.length - 1]]: budget };

  return [even, onFirst, onLast];
}

function emptyAllocation() {
  return {};
}

function loadSavedState() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.version !== STATE_VERSION) return null;
    const { allocations, selectedWorldviewIds } = parsed.state;
    if (!Array.isArray(allocations) || allocations.length < 1) return null;
    return { allocations, selectedWorldviewIds };
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
 * Holds two allocation columns and two selected worldviews; everything else is
 * derived. Per-worldview base values are memoised by identity so typing in an
 * allocation never recomputes a base, and results flow straight from a useMemo
 * (no recalculate button).
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

  const [selectedWorldviewIds, setSelectedWorldviewIds] = useState(() => {
    const saved = loadSavedState();
    if (saved?.selectedWorldviewIds?.length === 2) return saved.selectedWorldviewIds;
    return DEFAULT_WORLDVIEW_IDS.map((id) => resolveWorldview(id).id);
  });

  const worldviews = useMemo(
    () => selectedWorldviewIds.map(resolveWorldview),
    [selectedWorldviewIds]
  );

  // Memoise the expensive base computation per worldview identity.
  const baseA = useMemo(() => computeBase(data, worldviews[0]), [data, worldviews]);
  const baseB = useMemo(() => computeBase(data, worldviews[1]), [data, worldviews]);

  // Derived per-column results — instant on every allocation keystroke.
  const columns = useMemo(
    () => allocations.map((alloc) => evaluateColumn(data, alloc, baseA, baseB, params)),
    [data, allocations, baseA, baseB, params]
  );

  // Persist allocations + worldview selection (debounced).
  useEffect(() => {
    const t = setTimeout(() => saveState({ allocations, selectedWorldviewIds }), 300);
    return () => clearTimeout(t);
  }, [allocations, selectedWorldviewIds]);

  const setAllocation = useCallback((colIndex, projectId, value) => {
    setAllocations((prev) => {
      const next = prev.map((col) => ({ ...col }));
      next[colIndex][projectId] = value;
      return next;
    });
  }, []);

  const setWorldview = useCallback((slot, id) => {
    setSelectedWorldviewIds((prev) => {
      const next = [...prev];
      next[slot] = id;
      return next;
    });
  }, []);

  const addAllocation = useCallback(() => {
    setAllocations((prev) => [...prev, emptyAllocation()]);
  }, []);

  const removeAllocation = useCallback((colIndex) => {
    setAllocations((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== colIndex)));
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
    columns,
    worldviews,
    worldviewOptions: WORLDVIEW_POOL.map((w) => ({ id: w.id, name: w.name })),
    selectedWorldviewIds,
    params,
    setAllocation,
    setWorldview,
    addAllocation,
    removeAllocation,
    resetAllocations,
  };
}
