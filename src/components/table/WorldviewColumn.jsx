import { useCallback } from 'react';
import { Lock, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLockedSlider } from '../../hooks/useLockedSlider';
import { useDataset } from '../../context/DatasetContext';
import PreciseNumberInput from '../ui/PreciseNumberInput';
import tableConfig from '../../../config/tableMode.json';
import styles from '../../styles/components/TableMode.module.css';

function CredenceInput({
  index,
  credences,
  lockedKeys,
  setLockedKeys,
  onCredenceChange,
  cellProps,
}) {
  const sliderKey = String(index);
  const value = credences[sliderKey] ?? 0;

  const { isLocked, canLockMore, featureEnabled } = useLockedSlider({
    sliderKey,
    lockedKeys,
    credences,
  });

  const handleChange = useCallback(
    (val) => {
      onCredenceChange(sliderKey, val, null, false, lockedKeys);
    },
    [sliderKey, lockedKeys, onCredenceChange]
  );

  const handleLockClick = () => {
    if (isLocked) {
      setLockedKeys(lockedKeys.filter((k) => k !== sliderKey));
    } else if (canLockMore) {
      setLockedKeys([...lockedKeys, sliderKey]);
    }
  };

  return (
    <div className={styles.credenceCell}>
      <PreciseNumberInput
        className={styles.cellInput}
        value={value}
        min="0"
        max="100"
        onChange={handleChange}
        disabled={isLocked}
        {...cellProps}
      />
      <span className={styles.cellSuffix}>%</span>
      {featureEnabled && (
        <button
          className={`${styles.credenceLockButton} ${isLocked ? styles.locked : ''} ${!isLocked && !canLockMore ? styles.lockDisabled : ''}`}
          onClick={handleLockClick}
          type="button"
          tabIndex={-1}
          disabled={!isLocked && !canLockMore}
        >
          <Lock size={10} />
        </button>
      )}
    </div>
  );
}

function WorldviewColumn({
  id,
  worldview,
  index,
  rows,
  columnIndex,
  totalColumns,
  credences,
  lockedKeys,
  setLockedKeys,
  onCredenceChange,
  onUpdate,
  onUpdateDiscount,
  onApplyPreset,
  onRemove,
  canRemove,
}) {
  const { dataset } = useDataset();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const handlePresetChange = (e) => {
    const value = e.target.value;
    onApplyPreset(index, value === 'custom' ? null : value);
  };

  const handleNumericChange = (path, rawValue) => {
    const value = rawValue === '' ? 0 : Number(rawValue);
    if (!isNaN(value)) onUpdate(index, path, value);
  };

  const handleCellKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Tab') return;

      const row = Number(e.target.dataset.cellRow);
      const col = Number(e.target.dataset.cellCol);

      let nextRow = row;
      let nextCol = col;

      if (e.shiftKey) {
        nextCol--;
        if (nextCol < 0) {
          nextCol = totalColumns - 1;
          nextRow--;
        }
      } else {
        nextCol++;
        if (nextCol >= totalColumns) {
          nextCol = 0;
          nextRow++;
        }
      }

      const target = document.querySelector(
        `[data-cell-row="${nextRow}"][data-cell-col="${nextCol}"]`
      );

      if (target) {
        e.preventDefault();
        target.focus();
      }
    },
    [totalColumns]
  );

  // Precompute data row indices (skipping sectionTitle rows)
  const dataRowMap = [];
  let dataIdx = 0;
  for (const row of rows) {
    dataRowMap.push(row.type === 'sectionTitle' ? null : dataIdx++);
  }

  function renderCell(row, rowIndex) {
    if (row.type === 'sectionTitle') {
      return <div className={styles.sectionTitle} />;
    }

    const dataRowIndex = dataRowMap[rowIndex];
    const cellProps = {
      'data-cell-row': dataRowIndex,
      'data-cell-col': columnIndex,
      onKeyDown: handleCellKeyDown,
    };

    const { field } = row;

    if (field === 'credence') {
      return (
        <CredenceInput
          index={index}
          credences={credences}
          lockedKeys={lockedKeys}
          setLockedKeys={setLockedKeys}
          onCredenceChange={onCredenceChange}
          cellProps={cellProps}
        />
      );
    }

    if (field.startsWith('moral_weights.')) {
      const key = field.split('.')[1];
      return (
        <div className={styles.cell}>
          <input
            type="number"
            className={styles.cellInput}
            value={worldview.moral_weights[key] ?? 0}
            min="0"
            step="0.01"
            onChange={(e) => handleNumericChange(field, e.target.value)}
            {...cellProps}
          />
        </div>
      );
    }

    if (field.startsWith('discount_factor.')) {
      const factorIndex = Number(field.split('.')[1]);
      const rawVal = worldview.discount_factors[factorIndex] ?? 0;
      return (
        <div className={styles.cell}>
          <PreciseNumberInput
            className={styles.cellInput}
            value={rawVal * 100}
            min="0"
            max="100"
            onChange={(pct) => onUpdateDiscount(index, factorIndex, pct / 100)}
            {...cellProps}
          />
          <span className={styles.cellSuffix}>%</span>
        </div>
      );
    }

    if (field === 'risk_profile') {
      return (
        <div className={styles.cell}>
          <select
            className={styles.cellSelect}
            value={worldview.risk_profile}
            onChange={(e) => onUpdate(index, 'risk_profile', Number(e.target.value))}
            {...cellProps}
          >
            {dataset.riskProfileOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field === 'p_extinction') {
      const rawVal = worldview.p_extinction ?? 0;
      return (
        <div className={styles.cell}>
          <input
            type="number"
            className={styles.cellInput}
            value={Math.round(rawVal * 100)}
            min="0"
            max="100"
            step="5"
            onChange={(e) => {
              const pct = e.target.value === '' ? 0 : Number(e.target.value);
              if (!isNaN(pct)) onUpdate(index, 'p_extinction', Math.round(pct) / 100);
            }}
            {...cellProps}
          />
          <span className={styles.cellSuffix}>%</span>
        </div>
      );
    }

    return null;
  }

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      className={`${styles.worldviewColumn}${isDragging ? ` ${styles.dragging}` : ''}`}
      ref={setNodeRef}
      style={sortableStyle}
    >
      {/* Header: controls row + preset label */}
      <div className={styles.columnHeader}>
        <div className={styles.columnHeaderControls}>
          <button
            type="button"
            className={styles.dragHandle}
            {...attributes}
            {...listeners}
            tabIndex={-1}
          >
            <GripVertical size={12} />
          </button>
          {canRemove && (
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => onRemove(index)}
              title="Remove worldview"
            >
              ×
            </button>
          )}
        </div>
        <select
          className={styles.presetSelect}
          value={worldview.presetId || 'custom'}
          onChange={handlePresetChange}
        >
          {tableConfig.presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="custom">
            {!worldview.presetId && worldview.name && worldview.name !== 'Custom'
              ? worldview.name
              : 'Custom'}
          </option>
        </select>
      </div>

      {/* Data rows — same order/count as label rows */}
      {rows.map((row, i) => (
        <div key={i}>{renderCell(row, i)}</div>
      ))}
    </div>
  );
}

export default WorldviewColumn;
