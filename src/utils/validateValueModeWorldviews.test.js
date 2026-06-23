import { describe, it, expect } from 'vitest';
import { validateValueModeWorldviews } from './validateValueModeWorldviews';
import valueModeWorldviews from '../../config/valueModeWorldviews.json';

// Dataset dimensions the worldviews are scored against.
const DIMS = {
  moralWeightKeys: [
    { key: 'human_life_years' },
    { key: 'human_ylds' },
    { key: 'human_income_doublings' },
    { key: 'chickens_birds' },
    { key: 'fish' },
    { key: 'shrimp' },
    { key: 'non_shrimp_invertebrates' },
    { key: 'mammals' },
  ],
  discountFactorLabels: ['a', 'b', 'c', 'd', 'e', 'f'], // 6 periods
  riskProfileOptions: Array.from({ length: 9 }, (_, i) => ({ value: i, label: `r${i}` })),
};

function validWorldview(overrides = {}) {
  return {
    id: 'wv',
    name: 'Test Worldview',
    moral_weights: {
      human_life_years: 1,
      human_ylds: 1,
      human_income_doublings: 0.3,
      chickens_birds: 0.4,
      fish: 0.24,
      shrimp: 0.08,
      non_shrimp_invertebrates: 0.07,
      mammals: 0.44,
    },
    discount_factors: [1, 0.9, 0.8, 0.6, 0.4, 0.01],
    risk_profile: 0,
    p_extinction: 0,
    ...overrides,
  };
}

describe('validateValueModeWorldviews', () => {
  it('passes for the real committed config', () => {
    expect(validateValueModeWorldviews(valueModeWorldviews, DIMS)).toEqual([]);
  });

  it('passes for a hand-built valid worldview', () => {
    expect(validateValueModeWorldviews({ worldviews: [validWorldview()] }, DIMS)).toEqual([]);
  });

  it('rejects a missing worldviews array', () => {
    expect(validateValueModeWorldviews({}, DIMS).length).toBeGreaterThan(0);
    expect(validateValueModeWorldviews(null, DIMS).length).toBeGreaterThan(0);
  });

  it('flags an unknown moral_weights key (e.g. a typo)', () => {
    const wv = validWorldview();
    wv.moral_weights.chikens_birds = 0.4; // typo
    const errors = validateValueModeWorldviews({ worldviews: [wv] }, DIMS);
    expect(errors.some((e) => e.includes('unknown moral_weights key "chikens_birds"'))).toBe(true);
  });

  it('flags a missing moral_weights key', () => {
    const wv = validWorldview();
    delete wv.moral_weights.shrimp;
    const errors = validateValueModeWorldviews({ worldviews: [wv] }, DIMS);
    expect(errors.some((e) => e.includes('missing moral_weights key "shrimp"'))).toBe(true);
  });

  it('flags wrong-length discount_factors', () => {
    const wv = validWorldview({ discount_factors: [1, 0.9, 0.8] });
    const errors = validateValueModeWorldviews({ worldviews: [wv] }, DIMS);
    expect(errors.some((e) => e.includes('discount_factors has 3 entries, expected 6'))).toBe(true);
  });

  it('flags out-of-range risk_profile', () => {
    const wv = validWorldview({ risk_profile: 99 });
    const errors = validateValueModeWorldviews({ worldviews: [wv] }, DIMS);
    expect(errors.some((e) => e.includes('risk_profile 99 out of range'))).toBe(true);
  });

  it('flags out-of-range p_extinction', () => {
    const wv = validWorldview({ p_extinction: 1.5 });
    const errors = validateValueModeWorldviews({ worldviews: [wv] }, DIMS);
    expect(errors.some((e) => e.includes('p_extinction 1.5 out of range'))).toBe(true);
  });

  it('flags duplicate ids', () => {
    const errors = validateValueModeWorldviews(
      { worldviews: [validWorldview({ id: 'dup' }), validWorldview({ id: 'dup' })] },
      DIMS
    );
    expect(errors.some((e) => e.includes('duplicate id "dup"'))).toBe(true);
  });

  it('flags a non-number moral weight', () => {
    const wv = validWorldview();
    wv.moral_weights.fish = 'high';
    const errors = validateValueModeWorldviews({ worldviews: [wv] }, DIMS);
    expect(errors.some((e) => e.includes('moral_weights."fish" is not a finite number'))).toBe(
      true
    );
  });
});
