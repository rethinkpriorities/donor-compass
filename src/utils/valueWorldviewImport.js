import { extractTableShareId, fetchTableShareById } from './tableShareUrl';

/**
 * A worldview is usable in value mode only if it carries the four fields the
 * scoring engine reads (computeBase + the row tooltip). Table-mode worldviews
 * carry exactly these (plus extras like uid/presetId/credence we drop).
 */
function isUsableWorldview(wv) {
  return (
    wv &&
    typeof wv === 'object' &&
    wv.moral_weights &&
    typeof wv.moral_weights === 'object' &&
    Array.isArray(wv.discount_factors) &&
    typeof wv.risk_profile === 'number' &&
    typeof wv.p_extinction === 'number'
  );
}

/**
 * Reduce a table-mode worldview to just what value mode uses. Names are kept
 * verbatim — RP share links intentionally carry several near-identical columns
 * under the same name, and each becomes its own value-mode row.
 */
function normalizeWorldview(wv, index) {
  return {
    id: wv.uid || wv.presetId || `imported-${index}`,
    name: wv.name || `Worldview ${index + 1}`,
    moral_weights: wv.moral_weights,
    discount_factors: wv.discount_factors,
    risk_profile: wv.risk_profile,
    p_extinction: wv.p_extinction,
  };
}

/**
 * Import the worldview set from a Table Mode share link (or bare code) for use
 * as value mode's worldview rows. Resolves the same share API table mode uses.
 *
 * @param {string} input - a share URL, a `#table&s=<id>` hash, or a bare code
 * @returns {Promise<{ worldviews: Array } | { error: string }>}
 */
export async function importWorldviewsFromShare(input) {
  const id = extractTableShareId(input);
  if (!id) {
    return {
      error: "Couldn't find a share code. Paste a Table Mode share link (#table&s=…) or its code.",
    };
  }

  const result = await fetchTableShareById(id);
  if (!result) return { error: 'Failed to load shared configuration' };
  if (result.error) return { error: result.error };

  const raw = Array.isArray(result.worldviews) ? result.worldviews : [];
  const worldviews = raw.filter(isUsableWorldview).map(normalizeWorldview);

  if (!worldviews.length) {
    return { error: 'That share link has no usable worldviews.' };
  }

  return { worldviews };
}
