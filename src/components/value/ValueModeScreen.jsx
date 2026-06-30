import { useState } from 'react';
import { useValueState } from '../../hooks/useValueState';
import PreciseNumberInput from '../ui/PreciseNumberInput';
import InfoTooltip from '../ui/InfoTooltip';
import LoadWorldviewsModal from './LoadWorldviewsModal';
import styles from '../../styles/components/ValueMode.module.css';

// Build a markdown breakdown of a worldview's exact input values for the
// tooltip. Uses the dataset's labels so recipients/periods read in plain
// English rather than raw keys. Bullet lists (not tables) so it renders under
// the shared InfoTooltip's plain markdown (no remark-gfm).
function worldviewTooltip(worldview, labels) {
  const { moralWeightKeys, discountFactorLabels, riskProfileOptions } = labels;

  const weightRows = moralWeightKeys
    .map((k) => `- ${k.label}: **${worldview.moral_weights[k.key] ?? '—'}**`)
    .join('\n');

  const discountRows = discountFactorLabels
    .map((label, i) => `- ${label}: **${worldview.discount_factors[i] ?? '—'}**`)
    .join('\n');

  const riskLabel = riskProfileOptions[worldview.risk_profile]?.label ?? worldview.risk_profile;

  return [
    `**${worldview.name}**`,
    '',
    '**Moral weights**',
    '',
    weightRows,
    '',
    '**Discount factors**',
    '',
    discountRows,
    '',
    `**Risk profile:** ${riskLabel}`,
    '',
    `**P(extinction):** ${worldview.p_extinction}`,
  ].join('\n');
}

// Large, unitless worldview scores → compact notation (e.g. 1.2M, 3.4B).
const scoreFmt = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

function formatScore(n) {
  if (!isFinite(n)) return '—';
  // Compact notation degrades past a trillion (e.g. "18,629,231.66T"); use
  // scientific notation for astronomical magnitudes, compact for the rest.
  if (Math.abs(n) >= 1e12) return n.toExponential(2);
  return scoreFmt.format(n);
}

function formatDollars(m) {
  // m is in $millions, and may be signed (negative when allocation 1 lags).
  const sign = m < 0 ? '-' : '';
  const abs = Math.abs(m);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2)}B`;
  return `${sign}$${abs.toFixed(abs < 10 ? 2 : 1)}M`;
}

/**
 * Value mode (#value): type two dollar allocations, then for each worldview see
 * how it values each allocation, the gap between those two scores, and how many
 * more dollars the lagging allocation would need — allocated optimally by that
 * worldview — to match the other.
 */
function ValueModeScreen() {
  const {
    projectList,
    allocations,
    rows,
    totals,
    labels,
    floorNegativeScores,
    setFloorNegativeScores,
    setAllocation,
    resetAllocations,
    worldviewsImported,
    importWorldviews,
    restoreDefaultWorldviews,
  } = useValueState();

  const [showLoadModal, setShowLoadModal] = useState(false);

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h1 className={styles.title}>Value Mode</h1>
          <div className={styles.headerActions}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={floorNegativeScores}
                onChange={(e) => setFloorNegativeScores(e.target.checked)}
              />
              Floor negative scores at 0
              <InfoTooltip
                content={
                  'When on, a negative allocation score is treated as 0 before computing the gap. The catch-up then measures only the climb to the other score. If both scores are negative, the gap is zero.'
                }
                size={13}
              />
            </label>
            <button className={styles.resetButton} onClick={() => setShowLoadModal(true)}>
              Load worldviews from share link
            </button>
            <button className={styles.resetButton} onClick={resetAllocations}>
              Reset allocations
            </button>
          </div>
        </div>

        {worldviewsImported && (
          <div className={styles.importBanner}>
            <span>
              Showing {rows.length} worldview{rows.length === 1 ? '' : 's'} imported from a share
              link.
            </span>
            <button className={styles.bannerLink} onClick={restoreDefaultWorldviews}>
              Restore default worldviews
            </button>
          </div>
        )}
        <p className={styles.intro}>
          Enter two allocations of dollars (in $millions) across the funds. Each worldview below
          scores both allocations. Gap is Allocation 1 − Allocation 2 (negative means Allocation 1
          trails), and “$ to close gap” is the dollars the trailing allocation would need —
          allocated optimally by that worldview’s own lights — to catch up, signed to match. The
          final row totals each column across all worldviews.
        </p>

        <table className={styles.grid}>
          <thead>
            <tr>
              <th className={styles.rowLabel}>Fund</th>
              <th>
                Allocation 1 <span className={styles.colUnit}>$M</span>
              </th>
              <th>
                Allocation 2 <span className={styles.colUnit}>$M</span>
              </th>
              <th className={styles.analysisCol} />
              <th className={styles.analysisCol} />
            </tr>
          </thead>
          <tbody>
            {projectList.map((p) => (
              <tr key={p.id}>
                <td className={styles.rowLabel}>
                  <span className={styles.colorDot} style={{ background: p.color }} />
                  {p.name}
                </td>
                {allocations.map((alloc, colIndex) => (
                  <td key={colIndex}>
                    <PreciseNumberInput
                      className={styles.input}
                      value={alloc[p.id] || 0}
                      min={0}
                      onChange={(v) => setAllocation(colIndex, p.id, v)}
                    />
                  </td>
                ))}
                <td className={styles.analysisCol} />
                <td className={styles.analysisCol} />
              </tr>
            ))}

            {/* Output section: one row per worldview */}
            <tr className={styles.outputDivider}>
              <td colSpan={5} />
            </tr>
            <tr className={styles.outputHeader}>
              <th className={styles.rowLabel}>Worldview</th>
              <th>Allocation 1</th>
              <th>Allocation 2</th>
              <th>Gap</th>
              <th>$ to close gap</th>
            </tr>

            {rows.map((r, i) => {
              // Sign the catch-up dollars to match the signed gap: negative when
              // allocation 1 lags (gap < 0), positive when allocation 2 lags.
              const signedDollars = r.gap < 0 ? -r.close.dollars : r.close.dollars;
              return (
                <tr key={i} className={styles.outputRow}>
                  <td className={styles.rowLabel}>
                    <span className={styles.worldviewName}>
                      {r.name}
                      <InfoTooltip content={worldviewTooltip(r.worldview, labels)} size={13} />
                    </span>
                  </td>
                  <td className={styles.scoreCell}>{formatScore(r.value1)}</td>
                  <td className={styles.scoreCell}>{formatScore(r.value2)}</td>
                  <td className={styles.gapCell}>{formatScore(r.gap)}</td>
                  <td className={styles.dollarCell}>
                    {Math.abs(r.gap) <= 1e-9 ? (
                      <span className={styles.naValue}>—</span>
                    ) : r.close.closed ? (
                      <span className={styles.dollarValue}>{formatDollars(signedDollars)}</span>
                    ) : (
                      <span
                        className={styles.naValue}
                        title={`Unclosable within cap; short by ${formatScore(r.close.shortfall)}`}
                      >
                        N/A
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Totals: scores summed across all worldviews; gap is the
                difference of the two totals (|Σv1 − Σv2|). No catch-up figure. */}
            <tr className={styles.totalsRow}>
              <td className={styles.rowLabel}>Total (all worldviews)</td>
              <td className={styles.scoreCell}>{formatScore(totals.value1)}</td>
              <td className={styles.scoreCell}>{formatScore(totals.value2)}</td>
              <td className={styles.gapCell}>{formatScore(totals.gap)}</td>
              <td className={styles.dollarCell} />
            </tr>
          </tbody>
        </table>
      </div>

      {showLoadModal && (
        <LoadWorldviewsModal
          onClose={() => setShowLoadModal(false)}
          onLoad={(worldviews) => {
            importWorldviews(worldviews);
            setShowLoadModal(false);
          }}
        />
      )}
    </div>
  );
}

export default ValueModeScreen;
