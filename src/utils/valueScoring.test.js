import { describe, it, expect } from 'vitest';
import {
  computeBase,
  allocationValue,
  dollarsToCloseGap,
  evaluateWorldviewRow,
} from './valueScoring';

// --- Synthetic dataset helpers -------------------------------------------
// A project whose single effect contributes `valueAtT0` (times moral weight,
// times discount) and whose DR array we control directly. near_term_xrisk is
// true so extinction adjustment leaves base values untouched.
function makeProject(valueAtT0, drArray, recipient = 'x') {
  return {
    name: 'P',
    tags: { near_term_xrisk: true },
    diminishing_returns: drArray,
    effects: {
      e: {
        recipient_type: recipient,
        // 6 time periods x 1 risk column. Only t=0 is non-zero.
        values: [[valueAtT0], [0], [0], [0], [0], [0]],
      },
    },
  };
}

const FLAT_DISCOUNT = [1, 1, 1, 1, 1, 1];
function worldview(weight, recipient = 'x') {
  return {
    moral_weights: { [recipient]: weight },
    discount_factors: FLAT_DISCOUNT,
    risk_profile: 0,
    p_extinction: 0.9, // ignored: near_term_xrisk projects are unaffected
  };
}

describe('computeBase', () => {
  it('multiplies effect value by moral weight, ignores extinction for near-term-xrisk', () => {
    const data = { p1: makeProject(10, [1, 1, 1]) };
    const base = computeBase(data, worldview(2));
    expect(base.p1).toBe(20); // 10 * discount(1) * weight(2)
  });
});

describe('allocationValue', () => {
  it('is zero for an empty allocation', () => {
    const data = { p1: makeProject(10, [1, 1, 1, 1, 1, 1]) };
    const base = computeBase(data, worldview(2));
    expect(allocationValue(data, base, {}, { drStepSize: 1, step: 1 })).toBe(0);
  });

  it('with flat DR equals base * dollars', () => {
    const data = { p1: makeProject(10, [1, 1, 1, 1, 1, 1, 1]) };
    const base = computeBase(data, worldview(2)); // base = 20
    const v = allocationValue(data, base, { p1: 5 }, { drStepSize: 1, step: 1 });
    expect(v).toBeCloseTo(100, 9); // 20 * 5
  });

  it('applies diminishing returns as a left-Riemann sum', () => {
    // DR halves each $1M step: factors 1, 0.5, 0.25 at f = 0, 1, 2.
    const data = { p1: makeProject(10, [1, 0.5, 0.25, 0.125]) };
    const base = computeBase(data, worldview(2)); // base = 20
    const v = allocationValue(data, base, { p1: 3 }, { drStepSize: 1, step: 1 });
    // 20*1 + 20*0.5 + 20*0.25 = 35
    expect(v).toBeCloseTo(35, 9);
  });

  it('is monotonically increasing in funding', () => {
    const data = { p1: makeProject(10, [1, 0.5, 0.25, 0.125, 0.06]) };
    const base = computeBase(data, worldview(2));
    const params = { drStepSize: 1, step: 1 };
    const v2 = allocationValue(data, base, { p1: 2 }, params);
    const v3 = allocationValue(data, base, { p1: 3 }, params);
    expect(v3).toBeGreaterThan(v2);
  });
});

describe('dollarsToCloseGap', () => {
  const data = { p1: makeProject(10, [1, 1, 1, 1, 1, 1]) }; // flat DR
  const baseLow = computeBase(data, worldview(1)); // marginal 10/$M (flat)
  const params = { drStepSize: 1, chunk: 1, maxDollars: 1000 };

  it('returns zero dollars for a zero gap', () => {
    const r = dollarsToCloseGap(data, baseLow, { p1: 5 }, 0, params);
    expect(r).toMatchObject({ closed: true, dollars: 0 });
  });

  it('closes a gap exactly under flat DR (interpolated)', () => {
    // marginal = base(10) * 1 = 10 per $M; need 50 value -> 5 dollars.
    const r = dollarsToCloseGap(data, baseLow, { p1: 5 }, 50, params);
    expect(r.closed).toBe(true);
    expect(r.dollars).toBeCloseTo(5, 9);
  });

  it('reports unclosable when the cap is hit first', () => {
    const r = dollarsToCloseGap(data, baseLow, { p1: 5 }, 50, {
      ...params,
      maxDollars: 3,
    });
    expect(r.closed).toBe(false);
    expect(r.dollars).toBe(3);
    expect(r.valueAdded).toBeCloseTo(30, 9); // 3 dollars * 10
    expect(r.shortfall).toBeCloseTo(20, 9);
  });

  it('declares unclosable when no project has positive marginal value', () => {
    const zeroBase = computeBase(data, worldview(0)); // base = 0 -> marginal 0
    const r = dollarsToCloseGap(data, zeroBase, { p1: 5 }, 50, params);
    expect(r.closed).toBe(false);
    expect(r.valueAdded).toBe(0);
  });

  it('switches projects as marginal value drops (greedy)', () => {
    // p1 is best initially but its DR collapses to 0 after $1M; p2 is flat.
    const d2 = {
      p1: makeProject(10, [1, 0]),
      p2: makeProject(5, [1, 1, 1, 1, 1, 1]),
    };
    const base = computeBase(d2, worldview(1)); // p1 base 10, p2 base 5
    const r = dollarsToCloseGap(d2, base, {}, 12, {
      drStepSize: 1,
      chunk: 0.001,
      maxDollars: 1000,
    });
    expect(r.closed).toBe(true);
    expect(r.dollars).toBeGreaterThan(0);
    // Sanity: never exceeds the cap.
    expect(r.dollars).toBeLessThan(1000);
  });
});

describe('evaluateWorldviewRow', () => {
  it('compares the two allocations under one worldview and finds the catch-up dollars', () => {
    const data = { p1: makeProject(10, [1, 1, 1, 1, 1, 1]) }; // flat DR
    const base = computeBase(data, worldview(2)); // base 20, marginal 20/$M
    const params = { drStepSize: 1, step: 1, chunk: 1, maxDollars: 1000 };
    // Allocation 1 funds $3M, Allocation 2 funds $5M of the same project.
    const r = evaluateWorldviewRow(data, { p1: 3 }, { p1: 5 }, base, params);

    expect(r.value1).toBeCloseTo(60, 9); // 20 * 3
    expect(r.value2).toBeCloseTo(100, 9); // 20 * 5
    expect(r.gap).toBeCloseTo(40, 9);
    expect(r.laggingIs1).toBe(true); // Allocation 1 scores lower
    // Marginal 20/$M, so closing a 40 gap needs 2 more dollars on allocation 1.
    expect(r.close.closed).toBe(true);
    expect(r.close.dollars).toBeCloseTo(2, 9);
  });

  it('reports N/A when the lagging allocation cannot catch up within the cap', () => {
    const data = { p1: makeProject(10, [1, 1, 1, 1, 1, 1]) };
    const base = computeBase(data, worldview(1)); // marginal 10/$M
    const params = { drStepSize: 1, step: 1, chunk: 1, maxDollars: 3 };
    const r = evaluateWorldviewRow(data, {}, { p1: 5 }, base, params);
    // Gap is 50; at 10/$M the cap of $3M only adds 30 — unclosable.
    expect(r.gap).toBeCloseTo(50, 9);
    expect(r.close.closed).toBe(false);
  });

  describe('floorNegativeScores', () => {
    // A project with a negative base: a $1M allocation scores -10 (no DR effect
    // at flat 1), so allocations into it drag the worldview's score negative.
    const data = {
      neg: makeProject(-10, [1, 1, 1, 1, 1, 1]),
      pos: makeProject(10, [1, 1, 1, 1, 1, 1]),
    };
    const base = computeBase(data, worldview(1)); // neg base -10, pos base 10
    const params = { drStepSize: 1, step: 1, chunk: 1, maxDollars: 1000 };

    it('clamps a negative score to 0 and measures only the climb to the other', () => {
      // Allocation 1 = $5M into the negative project -> raw -50, clamped 0.
      // Allocation 2 = $3M into the positive project -> +30.
      const r = evaluateWorldviewRow(data, { neg: 5 }, { pos: 3 }, base, {
        ...params,
        floorNegativeScores: true,
      });
      expect(r.value1).toBe(0); // -50 floored
      expect(r.value2).toBeCloseTo(30, 9);
      expect(r.gap).toBeCloseTo(30, 9);
      expect(r.laggingIs1).toBe(true);
      // Allocation 1 must add 30 of value; pos marginal is 10/$M -> $3M.
      expect(r.close.closed).toBe(true);
      expect(r.close.dollars).toBeCloseTo(3, 9);
    });

    it('makes the gap zero when both scores are negative', () => {
      const r = evaluateWorldviewRow(data, { neg: 5 }, { neg: 2 }, base, {
        ...params,
        floorNegativeScores: true,
      });
      expect(r.value1).toBe(0);
      expect(r.value2).toBe(0);
      expect(r.gap).toBe(0);
      expect(r.close.dollars).toBe(0);
    });

    it('without the flag, the negative score stands and widens the gap', () => {
      const r = evaluateWorldviewRow(data, { neg: 5 }, { pos: 3 }, base, params);
      expect(r.value1).toBeCloseTo(-50, 9);
      expect(r.gap).toBeCloseTo(80, 9); // |-50 - 30|
    });
  });
});
