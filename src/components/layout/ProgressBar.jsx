/**
 * Progress bar indicator for question screens
 * Shows completion percentage with gradient fill
 */
const ProgressBar = ({ percentage }) => {
  const rounded = Math.round(percentage);
  return (
    <div className="progress-container">
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Quiz progress"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${rounded}% complete`}
      >
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export default ProgressBar;
