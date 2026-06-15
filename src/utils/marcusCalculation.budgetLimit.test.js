import { describe, it, expect } from 'vitest';
import { computeMultiStageAllocation, computeWeightedAllocation } from './marcusCalculation.js';

// Flat DR (no ceiling) so the full budget is always allocated — lets us assert
// on the total without diminishing-returns saturation muddying the numbers.
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
    diminishing_returns: new Array(500).fill(1),
  };
}

const PROJECTS = {
  projectA: makeProject('type_a'),
  projectB: makeProject('type_b'),
};

const WORLDVIEWS = [
  {
    credence: 1,
    moral_weights: { type_a: 1, type_b: 1 },
    discount_factors: [1, 0, 0, 0, 0, 0],
    risk_profile: 0,
    p_extinction: 0,
  },
];

const INCREMENT = 10;
const DR_STEP = 10;
const sum = (obj) => Object.values(obj).reduce((s, v) => s + v, 0);

// Regression for task 412: the old $1B (1000M) hard ceiling is removed, so a
// budget above 1000 must allocate in full rather than clamp to 1000.
describe('budget limit removed (task 412)', () => {
  it('multi-stage allocates a budget above $1B in full', () => {
    const r = computeMultiStageAllocation(
      PROJECTS,
      WORLDVIEWS,
      [{ method: 'credenceWeighted', budget: 3000, options: {} }],
      INCREMENT,
      {},
      DR_STEP
    );
    expect(sum(r.funding)).toBeCloseTo(3000, 6);
  });

  it('weighted allocates a total weight above $1B in full', () => {
    const r = computeWeightedAllocation(
      PROJECTS,
      WORLDVIEWS,
      [{ method: 'credenceWeighted', budget: 3000, options: {} }],
      INCREMENT,
      {},
      DR_STEP
    );
    expect(sum(r.funding)).toBeCloseTo(3000, 6);
  });
});
