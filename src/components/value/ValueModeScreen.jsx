import { useValueState } from '../../hooks/useValueState';
import PreciseNumberInput from '../ui/PreciseNumberInput';
import InfoTooltip from '../ui/InfoTooltip';
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
  // m is in $millions.
  if (m >= 1000) return `$${(m / 1000).toFixed(2)}B`;
  return `$${m.toFixed(m < 10 ? 2 : 1)}M`;
}

/**
 * Value mode (#value): type two dollar allocations, then for each worldview see
 * how it values each allocation, the gap between those two scores, and how many
 * more dollars the lagging allocation would need — allocated optimally by that
 * worldview — to match the other.
 */
function ValueModeScreen() {
  const { projectList, allocations, rows, labels, setAllocation, resetAllocations } =
    useValueState();

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h1 className={styles.title}>Value Mode</h1>
          <button className={styles.resetButton} onClick={resetAllocations}>
            Reset allocations
          </button>
        </div>
        <p className={styles.intro}>
          Enter two allocations of dollars (in $millions) across the funds. For each worldview
          below: its value of each allocation, the gap between them, and how many more dollars the
          lagging allocation would need — allocated optimally by that worldview’s own lights — to
          close the gap.
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
              const lagLabel = r.laggingIs1 ? 'Allocation 1' : 'Allocation 2';
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
                    {r.gap <= 1e-9 ? (
                      <span className={styles.naValue}>—</span>
                    ) : r.close.closed ? (
                      <>
                        <span className={styles.dollarValue}>{formatDollars(r.close.dollars)}</span>
                        <span className={styles.lagNote}>{lagLabel} lags</span>
                      </>
                    ) : (
                      <>
                        <span
                          className={styles.naValue}
                          title={`Unclosable within cap; short by ${formatScore(r.close.shortfall)}`}
                        >
                          N/A
                        </span>
                        <span className={styles.lagNote}>{lagLabel} lags</span>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ValueModeScreen;
