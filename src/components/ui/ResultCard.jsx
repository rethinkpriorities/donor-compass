import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import CauseBar from './CauseBar';
import MethodIcon from './MethodIcon';
import styles from '../../styles/components/Results.module.css';
import copy from '../../../config/copy.json';

/**
 * Displays a single calculation result card with cause bars.
 * Used by both ResultsScreen and IntermissionScreen.
 *
 * When `clusterMembers` is provided in simpleMode, each entry whose key
 * appears in the map renders as a collapsible cluster: a chevron + the
 * cluster's CauseBar, with member CauseBars revealed when expanded.
 */
function ResultCard({
  methodKey,
  results,
  evs = null,
  originalResults = null,
  causeEntries,
  hasChanged = false,
  simpleMode = false,
  budget = null,
  clusterMembers = null,
  memberAllocations = null,
}) {
  const method = copy.results.methods[methodKey];

  const footerContent = evs
    ? `${method.footerLabel} ${causeEntries.map(([key, cause]) => `${cause.name.slice(0, 2)} ${evs[key].toFixed(0)}`).join(' · ')}`
    : method.footerText;

  const expandable = simpleMode && clusterMembers && memberAllocations;

  return (
    <div className={`${styles.resultCard} ${simpleMode ? styles.compactCard : ''}`}>
      {!simpleMode && (
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>
            <MethodIcon name={method.icon} size={18} />
          </div>
          <div>
            <h3 className={styles.cardTitle}>{method.title}</h3>
            <p className={styles.cardSubtitle}>{method.subtitle}</p>
          </div>
        </div>
      )}
      {causeEntries.map(([causeKey, cause]) => {
        const members = expandable ? clusterMembers[causeKey] : null;
        if (members && members.length > 0) {
          return (
            <ClusterRow
              key={causeKey}
              causeKey={causeKey}
              cause={cause}
              percentage={results[causeKey]}
              budget={budget}
              members={members}
              memberAllocations={memberAllocations}
            />
          );
        }
        return (
          <CauseBar
            key={causeKey}
            name={cause.name}
            info={cause.info}
            percentage={results[causeKey]}
            originalPercentage={originalResults?.[causeKey]}
            color={cause.color}
            hasChanged={!simpleMode && hasChanged}
            simpleMode={simpleMode}
            budget={budget}
          />
        );
      })}
      {!simpleMode && <div className={styles.cardFooter}>{footerContent}</div>}
    </div>
  );
}

function ClusterRow({ causeKey, cause, percentage, budget, members, memberAllocations }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={styles.clusterRow}>
      <div
        className={styles.clusterRowHeader}
        onClick={() => setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`cluster-members-${causeKey}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((ex) => !ex);
          }
        }}
      >
        <ChevronRight
          size={14}
          className={`${styles.clusterRowChevron} ${expanded ? styles.clusterRowChevronOpen : ''}`}
        />
        <div className={styles.clusterRowBar}>
          <CauseBar
            name={cause.name}
            info={cause.info}
            percentage={percentage}
            color={cause.color}
            simpleMode={true}
            budget={budget}
          />
        </div>
      </div>
      <div
        id={`cluster-members-${causeKey}`}
        className={`${styles.clusterRowMembers} ${expanded ? styles.clusterRowMembersOpen : ''}`}
        aria-hidden={!expanded}
      >
        <div className={styles.clusterRowMembersInner}>
          {members.map(([memberKey, member]) => (
            <CauseBar
              key={memberKey}
              name={member.name}
              percentage={memberAllocations[memberKey] || 0}
              color={member.color}
              simpleMode={true}
              budget={budget}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ResultCard;
