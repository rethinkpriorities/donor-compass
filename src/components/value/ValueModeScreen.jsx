import { useValueState } from '../../hooks/useValueState';
import PreciseNumberInput from '../ui/PreciseNumberInput';
import styles from '../../styles/components/ValueMode.module.css';

const WORLDVIEW_LABELS = ['A', 'B'];

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
 * Value mode (#value): type two dollar allocations, see each scored by two
 * worldviews, the gap between them, and the dollars the lagging worldview would
 * need to catch up.
 */
function ValueModeScreen() {
  const {
    projectList,
    allocations,
    columns,
    worldviews,
    setAllocation,
    addAllocation,
    removeAllocation,
    resetAllocations,
  } = useValueState();

  const canRemove = allocations.length > 1;

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h1 className={styles.title}>Value Mode</h1>
          <div className={styles.headerActions}>
            <button className={styles.resetButton} onClick={addAllocation}>
              + Add allocation
            </button>
            <button className={styles.resetButton} onClick={resetAllocations}>
              Reset allocations
            </button>
          </div>
        </div>
        <p className={styles.intro}>
          Each column is an allocation of dollars (in $millions) across the funds. Below each
          column: the allocation’s value under two worldviews, the gap between them, and how many
          more dollars the lagging worldview would need — allocating optimally by its own lights —
          to close that gap.
        </p>

        <div className={styles.legend}>
          {worldviews.map((wv, i) => (
            <span className={styles.legendItem} key={i}>
              <span className={styles.legendChip}>{WORLDVIEW_LABELS[i]}</span>
              {wv.name}
            </span>
          ))}
        </div>

        <div className={styles.scroll}>
          <table className={styles.grid}>
            <thead>
              <tr>
                <th className={styles.rowLabel}>Fund</th>
                {allocations.map((_, i) => (
                  <th key={i}>
                    <div className={styles.colHead}>
                      <span>
                        Allocation {i + 1} <span className={styles.colUnit}>$M</span>
                      </span>
                      {canRemove && (
                        <button
                          className={styles.removeCol}
                          title="Remove allocation"
                          onClick={() => removeAllocation(i)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </th>
                ))}
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
                </tr>
              ))}

              {/* Output section */}
              <tr className={styles.outputDivider}>
                <td colSpan={allocations.length + 1} />
              </tr>

              <tr className={`${styles.outputRow} ${styles.scoreRow}`}>
                <td className={styles.rowLabel}>
                  <span className={styles.legendChip}>{WORLDVIEW_LABELS[0]}</span> score
                </td>
                {columns.map((c, i) => (
                  <td key={i}>{formatScore(c.valueA)}</td>
                ))}
              </tr>
              <tr className={`${styles.outputRow} ${styles.scoreRow}`}>
                <td className={styles.rowLabel}>
                  <span className={styles.legendChip}>{WORLDVIEW_LABELS[1]}</span> score
                </td>
                {columns.map((c, i) => (
                  <td key={i}>{formatScore(c.valueB)}</td>
                ))}
              </tr>

              <tr className={`${styles.outputRow} ${styles.gapRow}`}>
                <td className={styles.rowLabel}>Gap</td>
                {columns.map((c, i) => (
                  <td key={i}>{formatScore(c.gap)}</td>
                ))}
              </tr>

              <tr className={`${styles.outputRow} ${styles.dollarRow}`}>
                <td className={styles.rowLabel}>$ to close gap</td>
                {columns.map((c, i) => {
                  const lagLabel = WORLDVIEW_LABELS[c.laggingIsA ? 0 : 1];
                  if (c.gap <= 1e-9) {
                    return (
                      <td key={i}>
                        <span className={styles.naValue}>—</span>
                      </td>
                    );
                  }
                  return (
                    <td key={i}>
                      {c.close.closed ? (
                        <span className={styles.dollarValue}>{formatDollars(c.close.dollars)}</span>
                      ) : (
                        <span
                          className={styles.naValue}
                          title={`Unclosable within cap; short by ${formatScore(c.close.shortfall)}`}
                        >
                          N/A
                        </span>
                      )}
                      <span className={styles.lagNote}>{lagLabel} lags</span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ValueModeScreen;
