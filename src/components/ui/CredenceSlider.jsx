import { Lock } from 'lucide-react';
import { useSliderDrag } from '../../hooks/useSliderDrag';
import { useLockedSlider } from '../../hooks/useLockedSlider';
import InfoTooltip from './InfoTooltip';
import styles from '../../styles/components/Slider.module.css';
import copy from '../../../config/copy.json';

/**
 * Full-size slider for quiz questions with auto-balancing.
 * Used in question screens for distributing credences.
 */
function CredenceSlider({
  label,
  description,
  info,
  value,
  onChange,
  color,
  credences,
  sliderKey,
  lockedKeys = [],
  setLockedKeys,
}) {
  const { isLocked, hasLockedSibling, thumbOffset, canLockMore, featureEnabled } = useLockedSlider({
    sliderKey,
    lockedKeys,
    credences,
  });

  const { isDragging, dragHandlers } = useSliderDrag({
    credences,
    isLocked,
    lockedKeys,
    onChange,
  });

  const handleLockClick = () => {
    if (!featureEnabled) return;
    if (isLocked) {
      // Unlock: remove from array
      setLockedKeys(lockedKeys.filter((k) => k !== sliderKey));
    } else if (canLockMore) {
      // Lock: add to array (only if we can lock more)
      setLockedKeys([...lockedKeys, sliderKey]);
    }
  };

  const sliderBackground = hasLockedSibling
    ? `linear-gradient(to right, ${color} 0%, ${color} ${value}%, rgba(255,255,255,0.15) ${value}%, rgba(255,255,255,0.15) ${thumbOffset}, rgba(255,255,255,0.08) ${thumbOffset}, rgba(255,255,255,0.08) 100%)`
    : `linear-gradient(to right, ${color} 0%, ${color} ${value}%, rgba(255,255,255,0.15) ${value}%, rgba(255,255,255,0.15) 100%)`;

  return (
    <div className={styles.credenceSlider}>
      <div className={styles.header}>
        <div>
          <div className={styles.label}>
            {label}
            <InfoTooltip content={info} />
          </div>
          <div className={styles.description}>{description}</div>
        </div>
        <div className={styles.value} style={{ color }}>
          {Math.round(value)}%
        </div>
      </div>
      <div className={styles.sliderRow}>
        <div className={styles.sliderContainer}>
          <input
            type="range"
            min="0"
            max="100"
            step="any"
            value={value}
            aria-label={label || undefined}
            aria-valuetext={`${Math.round(value)}%`}
            {...dragHandlers}
            data-dragging={isDragging}
            disabled={isLocked}
            style={{
              background: sliderBackground,
              cursor: isLocked ? 'not-allowed' : 'pointer',
            }}
          />
          {hasLockedSibling && <div className={styles.lockLimit} style={{ left: thumbOffset }} />}
        </div>
        {featureEnabled && (
          <button
            className={`${styles.lockButton} ${isLocked ? styles.locked : ''} ${!isLocked && !canLockMore ? styles.lockDisabled : ''}`}
            onClick={handleLockClick}
            aria-label={isLocked ? copy.sliders.unlockTooltip : copy.sliders.lockTooltip}
            aria-pressed={isLocked}
            title={isLocked ? copy.sliders.unlockTooltip : copy.sliders.lockTooltip}
            type="button"
            disabled={!isLocked && !canLockMore}
          >
            <Lock size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export default CredenceSlider;
