/**
 * Value-mode scoring engine.
 *
 * Value mode ("#value") scores discrete *allocations* (dollars-in-millions per
 * project) against fixed *worldviews*, rather than producing an allocation from
 * worldviews like table mode does. Two outputs per allocation column:
 *
 *   1. Primary — the total value of the allocation as judged by each worldview
 *      (the diminishing-returns-weighted integral from `allocationValue`).
 *   2. Secondary — for whichever worldview values the column *less*, how many
 *      additional dollars (allocated greedily by that worldview's own marginal
 *      value) would close the gap to the other worldview's score.
 *
 * Every function here is pure and parameterised: all tunables (drStepSize,
 * integration step, greedy chunk, give-up cap) arrive via an explicit params
 * object so a future debugger panel can override them without touching this
 * file. The `data` argument is the project map (`dataset.projects`).
 */

import {
  calculateAllProjects,
  adjustForExtinctionRisk,
  getDiminishingReturnsFactor,
} from './projectScoring';

/**
 * Per-project base value for one worldview, before any allocation/DR is applied.
 * This is the expensive part (independent of allocation) and should be memoised
 * by the caller per worldview identity.
 *
 * @param {Object} data - Project map (dataset.projects)
 * @param {Object} worldview - { moral_weights, discount_factors, risk_profile, p_extinction }
 * @returns {Object} base value keyed by project ID
 */
export function computeBase(data, worldview) {
  const raw = calculateAllProjects(
    data,
    worldview.moral_weights,
    worldview.discount_factors,
    worldview.risk_profile
  );
  return adjustForExtinctionRisk(raw, data, worldview.p_extinction);
}

/**
 * Value of the next dollar into one project at a given funding level — the
 * single definition of the heuristic's marginal-value curve.
 *
 * Both `allocationValue` (which integrates this) and `dollarsToCloseGap` (which
 * greedily climbs it) go through here, so the heuristic lives in exactly one
 * place. If the scoring model changes (e.g. enforcing a non-negative,
 * monotonically-flat-or-rising marginal), this is the function to edit — as long
 * as value stays a per-project, separable integral of a marginal curve.
 *
 * @param {Object} data - Project map (dataset.projects)
 * @param {Object} base - Per-project base values (from computeBase)
 * @param {string} pid - Project ID
 * @param {number} funding - Current funding level for this project ($M)
 * @param {number} drStepSize - $M per DR array entry (from dataset)
 * @returns {number} value of the next marginal dollar into `pid`
 */
export function marginalValue(data, base, pid, funding, drStepSize) {
  return base[pid] * getDiminishingReturnsFactor(data, pid, funding, drStepSize);
}

/**
 * Total value of an allocation under one worldview's precomputed base values.
 *
 * Walks each project's funding in `step`-sized chunks, integrating the
 * marginal-value curve (`marginalValue`) — a left-Riemann sum. Mirrors the
 * reference Python `worldview_value`.
 *
 * @param {Object} data - Project map (dataset.projects)
 * @param {Object} base - Per-project base values (from computeBase)
 * @param {Object} allocation - { projectId: dollarsInMillions }
 * @param {Object} [params]
 * @param {number} [params.drStepSize=10] - $M per DR array entry (from dataset)
 * @param {number} [params.step=1] - integration chunk size in $M
 * @returns {number} total value (one number)
 */
export function allocationValue(data, base, allocation, { drStepSize = 10, step = 1 } = {}) {
  let total = 0;
  for (const pid of Object.keys(data)) {
    const funded = allocation[pid] || 0;
    let f = 0;
    while (f < funded - 1e-9) {
      const chunk = Math.min(step, funded - f);
      total += marginalValue(data, base, pid, f, drStepSize) * chunk;
      f += chunk;
    }
  }
  return total;
}

/**
 * Greedy "water-fill": how many additional dollars, allocated each to the
 * project where this worldview values the next dollar most, are needed to add
 * `gapX` total value on top of `allocation`.
 *
 * DR continues from each project's *current* funding in `allocation` (it does
 * not reset). Spending past the DR domain is allowed at the clamped floor factor
 * (getDiminishingReturnsFactor clamps to the last array entry). The search walks
 * in `chunk`-sized steps for speed, then interpolates the final partial chunk so
 * the returned dollar figure is accurate regardless of chunk size. If `maxDollars`
 * is reached first — or no project has positive marginal value — the gap is
 * declared unclosable.
 *
 * @param {Object} data - Project map (dataset.projects)
 * @param {Object} base - Lagging worldview's base values (from computeBase)
 * @param {Object} allocation - starting allocation { projectId: $M }
 * @param {number} gapX - value to add
 * @param {Object} [params]
 * @param {number} [params.drStepSize=10]
 * @param {number} [params.chunk=1] - greedy step size in $M
 * @param {number} [params.maxDollars=4000] - give-up cap in $M
 * @returns {{closed: boolean, dollars: number, valueAdded: number, shortfall: number}}
 */
export function dollarsToCloseGap(
  data,
  base,
  allocation,
  gapX,
  { drStepSize = 10, chunk = 1, maxDollars = 4000 } = {}
) {
  if (gapX <= 1e-9) {
    return { closed: true, dollars: 0, valueAdded: 0, shortfall: 0 };
  }

  const ids = Object.keys(data);
  const funding = {};
  for (const id of ids) funding[id] = allocation[id] || 0;

  let dollars = 0;
  let valueAdded = 0;

  while (dollars < maxDollars - 1e-9) {
    // Pick the project where the next dollar buys the most value right now.
    let bestId = null;
    let bestMarginal = 0;
    for (const id of ids) {
      const marginal = marginalValue(data, base, id, funding[id], drStepSize);
      if (marginal > bestMarginal) {
        bestMarginal = marginal;
        bestId = id;
      }
    }

    // No project can add value (all non-positive marginal) — unclosable.
    if (bestId === null) break;

    const remaining = gapX - valueAdded;
    if (bestMarginal * chunk >= remaining) {
      // The gap closes inside this chunk — interpolate the exact dollars.
      dollars += remaining / bestMarginal;
      return { closed: true, dollars, valueAdded: gapX, shortfall: 0 };
    }

    const take = Math.min(chunk, maxDollars - dollars);
    funding[bestId] += take;
    valueAdded += bestMarginal * take;
    dollars += take;
  }

  return {
    closed: false,
    dollars: maxDollars,
    valueAdded,
    shortfall: gapX - valueAdded,
  };
}

/**
 * Full per-column output: both worldviews' scores, their gap, which one lags,
 * and the dollars the lagging worldview needs to catch up.
 *
 * @param {Object} data - Project map (dataset.projects)
 * @param {Object} allocation - { projectId: $M }
 * @param {Object} baseA - Worldview A base values (from computeBase, memoised)
 * @param {Object} baseB - Worldview B base values (from computeBase, memoised)
 * @param {Object} [params] - { drStepSize, step, chunk, maxDollars }
 * @returns {{valueA: number, valueB: number, gap: number, laggingIsA: boolean, close: Object}}
 */
export function evaluateColumn(data, allocation, baseA, baseB, params = {}) {
  const valueA = allocationValue(data, baseA, allocation, params);
  const valueB = allocationValue(data, baseB, allocation, params);
  const gap = Math.abs(valueA - valueB);
  const laggingIsA = valueA < valueB;
  const laggingBase = laggingIsA ? baseA : baseB;
  const close = dollarsToCloseGap(data, laggingBase, allocation, gap, params);
  return { valueA, valueB, gap, laggingIsA, close };
}
