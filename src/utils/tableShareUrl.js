import { getOrCreateSessionId } from './session';
import { endpoints } from '../config/api';

/**
 * Parse the hash fragment for Table Mode.
 * Supports: #table, #table&s=<id>
 * @returns {{ isTable: boolean, shareId: string|null }}
 */
export function parseTableHash() {
  const hash = window.location.hash;
  if (!hash.startsWith('#table')) return { isTable: false, shareId: null };

  const rest = hash.slice('#table'.length);
  // #table or #table&s=<id>
  if (!rest) return { isTable: true, shareId: null };
  const match = rest.match(/&s=(.+)/);
  return { isTable: true, shareId: match ? match[1] : null };
}

/**
 * Generate a share URL for Table Mode state.
 * Posts state to /api/share with type: 'table' and returns a URL
 * with #table&s=<id> hash.
 *
 * @param {Object} state
 * @param {Array} state.worldviews
 * @param {Object} state.credences
 * @param {Array} state.stages - Array of { id, method, budget, options }
 * @returns {Promise<{ url: string, id: string }>}
 */
export async function generateTableShareUrl(state) {
  const sessionId = getOrCreateSessionId();

  const payload = {
    type: 'table',
    sessionId,
    worldviews: state.worldviews,
    credences: state.credences,
    stages: state.stages,
    // Always emit aggregationMode so the link is self-describing. Old links
    // without this field decode to 'sequential' in parseTableShareUrl.
    aggregationMode: state.aggregationMode === 'weighted' ? 'weighted' : 'sequential',
    ...(state.fundingCaps &&
      Object.keys(state.fundingCaps).length > 0 && { fundingCaps: state.fundingCaps }),
    ...(state.drOverrides &&
      Object.keys(state.drOverrides).length > 0 && { drOverrides: state.drOverrides }),
    ...(state.initialFunding &&
      Object.keys(state.initialFunding).length > 0 && { initialFunding: state.initialFunding }),
    ...(state.datasetId && { datasetId: state.datasetId }),
  };

  const response = await fetch(endpoints.share, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create share link');
  }

  const { id } = await response.json();
  const baseUrl = window.location.origin + window.location.pathname;
  return {
    url: `${baseUrl}#table&s=${id}`,
    id,
  };
}

/**
 * Pull a Table Mode share id out of arbitrary user input: a full share URL
 * (`https://…/#table&s=<id>`), a bare hash fragment (`#table&s=<id>`), or just
 * the code on its own (`<id>`). Returns the id, or null if none is found.
 *
 * @param {string} input
 * @returns {string|null}
 */
export function extractTableShareId(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // A full URL or hash fragment carries the id after `&s=` (or `?s=`).
  const match = trimmed.match(/[&?]s=([^&\s]+)/);
  if (match) return match[1];

  // Otherwise treat the whole thing as a bare code, but only if it looks like
  // one (no scheme, slashes, or whitespace) — so we don't feed a malformed URL
  // to the API as an id.
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;

  return null;
}

/**
 * Fetch a Table Mode share by id and validate it. Shared by the hash-based
 * loader (`parseTableShareUrl`) and the value-mode worldview importer.
 *
 * @param {string} shareId
 * @returns {Promise<Object|null>} Table state or { error } or null
 */
export async function fetchTableShareById(shareId) {
  if (!shareId) return null;

  try {
    const response = await fetch(`${endpoints.share}?id=${encodeURIComponent(shareId)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'This share link has expired or no longer exists' };
      }
      throw new Error('Failed to fetch share data');
    }

    const data = await response.json();
    if (data.type !== 'table' && data.type !== 'marcus') {
      return { error: 'Invalid share data format' };
    }

    // Support both new (stages) and old (selectedMethod/totalBudget/methodOptions) format
    const result = {
      worldviews: data.worldviews,
      credences: data.credences,
      // Default to 'sequential' for share links generated before the field existed,
      // so they reproduce the exact numbers their authors saw.
      aggregationMode: data.aggregationMode === 'weighted' ? 'weighted' : 'sequential',
    };

    if (data.stages) {
      result.stages = data.stages;
    } else if (data.selectedMethod) {
      // Backward compat: old share URLs without stages
      result.selectedMethod = data.selectedMethod;
      result.totalBudget = data.totalBudget;
      result.methodOptions = data.methodOptions;
    }

    if (data.fundingCaps) result.fundingCaps = data.fundingCaps;
    if (data.drOverrides) result.drOverrides = data.drOverrides;
    if (data.initialFunding) result.initialFunding = data.initialFunding;
    if (data.datasetId) result.datasetId = data.datasetId;

    return result;
  } catch (err) {
    console.error('[Share] Failed to load table share data:', err);
    return { error: 'Failed to load shared configuration' };
  }
}

/**
 * Parse a Table Mode share URL: detect hash, fetch data, validate type.
 * @returns {Promise<Object|null>} Table state or { error } or null
 */
export async function parseTableShareUrl() {
  const { shareId } = parseTableHash();
  return fetchTableShareById(shareId);
}
