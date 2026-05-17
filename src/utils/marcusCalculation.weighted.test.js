import { describe, it, expect } from 'vitest';
import { computeMarcusAllocation, computeWeightedAllocation } from './marcusCalculation.js';

function makeProject(recipientType, baseValue) {
  return {
    name: `Project ${recipientType}`,
    effects: {
      e1: {
        recipient_type: recipientType,
        values: [
          [baseValue, baseValue, baseValue, baseValue],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
      },
    },
    tags: { near_term_xrisk: false },
    diminishing_returns: new Array(20).fill(1),
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
  projectA: makeProject('type_a', 1),
  projectB: makeProject('type_b', 1),
};

// Two worldviews, each exclusively values one project.
const WORLDVIEWS = [
  makeWorldview(0.5, { type_a: 1, type_b: 0 }),
  makeWorldview(0.5, { type_a: 0, type_b: 1 }),
];

const INCREMENT = 1;
const DR_STEP = 10;

describe('computeWeightedAllocation', () => {
  it('with a single stage at full weight, matches computeMarcusAllocation', () => {
    const budget = 100;
    const single = computeMarcusAllocation(
      PROJECTS,
      WORLDVIEWS,
      'credenceWeighted',
      budget,
      INCREMENT,
      { drStepSize: DR_STEP }
    );

    const weighted = computeWeightedAllocation(
      PROJECTS,
      WORLDVIEWS,
      [{ method: 'credenceWeighted', budget, options: {} }],
      INCREMENT,
      {},
      DR_STEP
    );

    for (const id of Object.keys(PROJECTS)) {
      expect(weighted.funding[id]).toBeCloseTo(single.funding[id], 6);
      expect(weighted.allocations[id]).toBeCloseTo(single.allocations[id], 6);
    }
    expect(weighted.perMethod.credenceWeighted.normWeight).toBe(1);
  });

  it('is order-independent (reordering stages yields identical funding)', () => {
    const stagesAB = [
      { method: 'credenceWeighted', budget: 30, options: {} },
      { method: 'mec', budget: 70, options: {} },
    ];
    const stagesBA = [
      { method: 'mec', budget: 70, options: {} },
      { method: 'credenceWeighted', budget: 30, options: {} },
    ];

    const ab = computeWeightedAllocation(PROJECTS, WORLDVIEWS, stagesAB, INCREMENT, {}, DR_STEP);
    const ba = computeWeightedAllocation(PROJECTS, WORLDVIEWS, stagesBA, INCREMENT, {}, DR_STEP);

    for (const id of Object.keys(PROJECTS)) {
      expect(ab.funding[id]).toBeCloseTo(ba.funding[id], 6);
    }
  });

  it('linearly combines per-method funding by normalised weight', () => {
    const budget1 = 25;
    const budget2 = 75;
    const total = budget1 + budget2;

    const stages = [
      { method: 'credenceWeighted', budget: budget1, options: {} },
      { method: 'mec', budget: budget2, options: {} },
    ];
    const combined = computeWeightedAllocation(
      PROJECTS,
      WORLDVIEWS,
      stages,
      INCREMENT,
      {},
      DR_STEP
    );

    // Reference: run each method independently on the full pot.
    const m1 = computeMarcusAllocation(PROJECTS, WORLDVIEWS, 'credenceWeighted', total, INCREMENT, {
      drStepSize: DR_STEP,
    });
    const m2 = computeMarcusAllocation(PROJECTS, WORLDVIEWS, 'mec', total, INCREMENT, {
      drStepSize: DR_STEP,
    });

    const w1 = budget1 / total;
    const w2 = budget2 / total;

    for (const id of Object.keys(PROJECTS)) {
      const expected = w1 * m1.funding[id] + w2 * m2.funding[id];
      expect(combined.funding[id]).toBeCloseTo(expected, 6);
    }
  });

  it('returns zeros when total weight is zero', () => {
    const result = computeWeightedAllocation(
      PROJECTS,
      WORLDVIEWS,
      [
        { method: 'credenceWeighted', budget: 0, options: {} },
        { method: 'mec', budget: 0, options: {} },
      ],
      INCREMENT,
      {},
      DR_STEP
    );

    for (const id of Object.keys(PROJECTS)) {
      expect(result.funding[id]).toBe(0);
      expect(result.allocations[id]).toBe(0);
    }
    expect(result.stageResults).toEqual([]);
    expect(result.perMethod).toEqual({});
  });

  it('skips zero-weight stages but still records them in stageResults', () => {
    const stages = [
      { method: 'credenceWeighted', budget: 100, options: {} },
      { method: 'mec', budget: 0, options: {} },
    ];
    const result = computeWeightedAllocation(PROJECTS, WORLDVIEWS, stages, INCREMENT, {}, DR_STEP);

    expect(result.stageResults).toHaveLength(2);
    for (const id of Object.keys(PROJECTS)) {
      expect(result.stageResults[1].funding[id]).toBe(0);
    }
    expect(result.perMethod).not.toHaveProperty('mec');
    expect(result.perMethod.credenceWeighted.normWeight).toBe(1);
  });
});
