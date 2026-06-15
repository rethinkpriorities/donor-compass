import { describe, it, expect } from 'vitest';
import { computeMultiStageAllocation, computeWeightedAllocation } from './marcusCalculation.js';

// A project whose diminishing-returns curve actually decays, so that seeding it
// with initial funding (a DR head-start) measurably reduces the value of each
// new dollar. No zero entries → no spending ceiling.
function makeProject(recipientType) {
  return {
    name: `Project ${recipientType}`,
    effects: {
      e1: {
        recipient_type: recipientType,
        values: [
          [1, 1, 1, 1],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
      },
    },
    tags: { near_term_xrisk: false },
    // 1.00, 0.96, 0.92, ... 0.24 over 20 entries — strictly decreasing, all > 0.
    diminishing_returns: Array.from({ length: 20 }, (_, k) => 1 - 0.04 * k),
  };
}

function makeWorldview(credence, moralWeights) {
  return {
    credence,
    moral_weights: moralWeights,
    discount_factors: [1, 0, 0, 0, 0, 0],
    risk_profile: 0,
    p_extinction: 0,
  };
}

const PROJECTS = {
  projectA: makeProject('type_a'),
  projectB: makeProject('type_b'),
};

// Single worldview that values both projects equally → symmetric baseline.
const WORLDVIEWS = [makeWorldview(1, { type_a: 1, type_b: 1 })];

const INCREMENT = 1;
const DR_STEP = 10;
const BUDGET = 100;

const sum = (obj) => Object.values(obj).reduce((s, v) => s + v, 0);

describe('initial funding (DR head-start) — multi-stage', () => {
  const stages = [{ method: 'credenceWeighted', budget: BUDGET, options: {} }];

  it('is symmetric with no initial funding', () => {
    const r = computeMultiStageAllocation(PROJECTS, WORLDVIEWS, stages, INCREMENT, {}, DR_STEP);
    expect(r.funding.projectA).toBeCloseTo(r.funding.projectB, 6);
    expect(sum(r.funding)).toBeCloseTo(BUDGET, 6);
  });

  it('does not appear in the reported total — funding still sums to the budget', () => {
    const r = computeMultiStageAllocation(PROJECTS, WORLDVIEWS, stages, INCREMENT, {}, DR_STEP, {
      projectA: 80,
    });
    // The $80 head-start is excluded; the displayed total is the budget, not budget + 80.
    expect(sum(r.funding)).toBeCloseTo(BUDGET, 6);
  });

  it('deprioritizes the seeded fund (it receives fewer new dollars)', () => {
    const r = computeMultiStageAllocation(PROJECTS, WORLDVIEWS, stages, INCREMENT, {}, DR_STEP, {
      projectA: 80,
    });
    // projectA starts further down its DR curve, so each new dollar is worth
    // less than the same dollar to projectB → B wins more of the budget.
    expect(r.funding.projectB).toBeGreaterThan(r.funding.projectA);
    expect(r.allocations.projectB).toBeGreaterThan(r.allocations.projectA);
  });

  it('treats null / empty initial funding identically to omitting it', () => {
    const base = computeMultiStageAllocation(PROJECTS, WORLDVIEWS, stages, INCREMENT, {}, DR_STEP);
    const withNull = computeMultiStageAllocation(
      PROJECTS,
      WORLDVIEWS,
      stages,
      INCREMENT,
      {},
      DR_STEP,
      null
    );
    const withEmpty = computeMultiStageAllocation(
      PROJECTS,
      WORLDVIEWS,
      stages,
      INCREMENT,
      {},
      DR_STEP,
      {}
    );
    for (const id of Object.keys(PROJECTS)) {
      expect(withNull.funding[id]).toBeCloseTo(base.funding[id], 6);
      expect(withEmpty.funding[id]).toBeCloseTo(base.funding[id], 6);
    }
  });
});

describe('initial funding (DR head-start) — weighted', () => {
  const stages = [{ method: 'credenceWeighted', budget: BUDGET, options: {} }];

  it('does not appear in the reported total — funding still sums to the budget', () => {
    const r = computeWeightedAllocation(PROJECTS, WORLDVIEWS, stages, INCREMENT, {}, DR_STEP, {
      projectA: 80,
    });
    expect(sum(r.funding)).toBeCloseTo(BUDGET, 6);
  });

  it('deprioritizes the seeded fund (it receives fewer new dollars)', () => {
    const r = computeWeightedAllocation(PROJECTS, WORLDVIEWS, stages, INCREMENT, {}, DR_STEP, {
      projectA: 80,
    });
    expect(r.funding.projectB).toBeGreaterThan(r.funding.projectA);
    // The seed is excluded from the per-method funding too.
    expect(sum(r.perMethod.credenceWeighted.funding)).toBeCloseTo(BUDGET, 6);
  });

  it('treats null initial funding identically to omitting it', () => {
    const base = computeWeightedAllocation(PROJECTS, WORLDVIEWS, stages, INCREMENT, {}, DR_STEP);
    const withNull = computeWeightedAllocation(
      PROJECTS,
      WORLDVIEWS,
      stages,
      INCREMENT,
      {},
      DR_STEP,
      null
    );
    for (const id of Object.keys(PROJECTS)) {
      expect(withNull.funding[id]).toBeCloseTo(base.funding[id], 6);
    }
  });
});
