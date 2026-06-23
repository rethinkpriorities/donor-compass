/**
 * Validator for config/valueModeWorldviews.json (value mode #value).
 *
 * This file is a mode-specific, non-dev-editable source of truth, so it gets a
 * strict structural + cross-dataset check that fails CI (via
 * scripts/validate-config.js) on a bad edit — e.g. a misspelled moral-weight
 * key that would otherwise silently score as 0.
 *
 * Pure: returns an array of human-readable error strings (empty = valid). Takes
 * the parsed config and the active dataset's dimension metadata so it can verify
 * keys/lengths/ranges line up with the data the worldviews are scored against.
 */

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * @param {Object} config - Parsed valueModeWorldviews.json ({ worldviews: [...] })
 * @param {Object} dims - { moralWeightKeys: [{key}], discountFactorLabels: [...], riskProfileOptions: [...] }
 * @returns {string[]} error messages (empty array when valid)
 */
export function validateValueModeWorldviews(config, dims = {}) {
  const errors = [];

  if (!config || typeof config !== 'object' || !Array.isArray(config.worldviews)) {
    return ['valueModeWorldviews.json: missing or invalid "worldviews" array'];
  }
  if (config.worldviews.length === 0) {
    errors.push('valueModeWorldviews.json: "worldviews" array is empty');
  }

  const moralWeightKeys = (dims.moralWeightKeys || []).map((k) => k.key);
  const moralWeightKeySet = new Set(moralWeightKeys);
  const timePeriodCount = dims.discountFactorLabels?.length;
  const riskProfileCount = dims.riskProfileOptions?.length;

  const seenIds = new Set();

  config.worldviews.forEach((wv, i) => {
    const label = wv && wv.name ? `"${wv.name}"` : wv && wv.id ? `"${wv.id}"` : `#${i}`;
    const at = `valueModeWorldviews.json: worldview ${label}`;

    if (!wv || typeof wv !== 'object') {
      errors.push(`${at}: not an object`);
      return;
    }

    if (!wv.id || typeof wv.id !== 'string') {
      errors.push(`${at}: missing or invalid "id"`);
    } else if (seenIds.has(wv.id)) {
      errors.push(`${at}: duplicate id "${wv.id}"`);
    } else {
      seenIds.add(wv.id);
    }

    if (!wv.name || typeof wv.name !== 'string') {
      errors.push(`${at}: missing or invalid "name"`);
    }

    // Moral weights: every dataset key present, no unknown keys, all finite.
    if (!wv.moral_weights || typeof wv.moral_weights !== 'object') {
      errors.push(`${at}: missing or invalid "moral_weights"`);
    } else {
      for (const key of moralWeightKeySet) {
        if (!(key in wv.moral_weights)) {
          errors.push(`${at}: missing moral_weights key "${key}"`);
        }
      }
      for (const [key, value] of Object.entries(wv.moral_weights)) {
        if (moralWeightKeySet.size > 0 && !moralWeightKeySet.has(key)) {
          errors.push(`${at}: unknown moral_weights key "${key}" (not in dataset moralWeightKeys)`);
        }
        if (!isFiniteNumber(value)) {
          errors.push(`${at}: moral_weights."${key}" is not a finite number`);
        }
      }
    }

    // Discount factors: array of the right length, all finite numbers.
    if (!Array.isArray(wv.discount_factors)) {
      errors.push(`${at}: missing or invalid "discount_factors" array`);
    } else {
      if (timePeriodCount && wv.discount_factors.length !== timePeriodCount) {
        errors.push(
          `${at}: discount_factors has ${wv.discount_factors.length} entries, expected ${timePeriodCount}`
        );
      }
      wv.discount_factors.forEach((v, idx) => {
        if (!isFiniteNumber(v)) {
          errors.push(`${at}: discount_factors[${idx}] is not a finite number`);
        }
      });
    }

    // Risk profile: integer index into the dataset's risk profiles.
    if (!Number.isInteger(wv.risk_profile)) {
      errors.push(`${at}: "risk_profile" must be an integer`);
    } else if (riskProfileCount && (wv.risk_profile < 0 || wv.risk_profile >= riskProfileCount)) {
      errors.push(
        `${at}: risk_profile ${wv.risk_profile} out of range (0-${riskProfileCount - 1})`
      );
    }

    // P(extinction): probability in [0, 1].
    if (!isFiniteNumber(wv.p_extinction)) {
      errors.push(`${at}: "p_extinction" is not a finite number`);
    } else if (wv.p_extinction < 0 || wv.p_extinction > 1) {
      errors.push(`${at}: p_extinction ${wv.p_extinction} out of range (0-1)`);
    }
  });

  return errors;
}

export default validateValueModeWorldviews;
