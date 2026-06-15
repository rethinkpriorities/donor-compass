import { useState, useCallback } from 'react';
import { generateTableShareUrl } from '../utils/tableShareUrl';
import { copyToClipboard } from '../utils/clipboard';

/**
 * Hook for Table Mode share URL generation and clipboard copy.
 *
 * @param {Object} options
 * @param {Array} options.worldviews
 * @param {Object} options.credences
 * @param {Array} options.stages
 * @returns {{ copied: boolean, loading: boolean, error: string|null, handleShare: Function }}
 */
export function useTableShareUrl({
  worldviews,
  credences,
  stages,
  aggregationMode,
  fundingCaps,
  drOverrides,
  initialFunding,
  datasetId,
}) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleShare = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const { url } = await generateTableShareUrl({
        worldviews,
        credences,
        stages,
        aggregationMode,
        fundingCaps,
        drOverrides,
        initialFunding,
        datasetId,
      });

      await copyToClipboard(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[Share] Failed to generate share URL:', err);
      setError(err.message || 'Failed to create share link');
      window.setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  }, [
    worldviews,
    credences,
    stages,
    aggregationMode,
    fundingCaps,
    drOverrides,
    initialFunding,
    datasetId,
  ]);

  return { copied, loading, error, handleShare };
}
