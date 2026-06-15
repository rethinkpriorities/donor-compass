import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import styles from '../../styles/components/InfoTooltip.module.css';

/**
 * Info icon with styled popover tooltip.
 * Shows on hover (mouse), focus (keyboard), and tap (mobile).
 *
 * The popover is rendered through a portal to document.body so it escapes any
 * local stacking context (e.g. the expanding cluster rows, which use opacity
 * and therefore create their own stacking context). This keeps it visually in
 * front of all page content; its z-index sits just below modals. Because the
 * popover is no longer a DOM descendant of the wrapper, visibility is driven by
 * state rather than the CSS :hover selector.
 */
function InfoTooltip({ content, size = 14, variant = 'info' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const wrapperRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = popoverRef.current?.offsetWidth || 400;
    const viewportWidth = window.innerWidth;
    const padding = 16;

    // Center below the trigger
    let left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
    const top = triggerRect.bottom + 8;

    // Clamp to viewport bounds
    if (left < padding) {
      left = padding;
    } else if (left + popoverWidth > viewportWidth - padding) {
      left = viewportWidth - popoverWidth - padding;
    }

    setPosition({ top, left });
  }, []);

  const show = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    updatePosition();
    setIsVisible(true);
  }, [updatePosition]);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Small delay so the pointer can travel the gap between trigger and popover
  // without the tooltip flickering closed. Cancelled by any show().
  const hideSoon = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setIsVisible(false), 80);
  }, []);

  useEffect(() => () => clearTimeout(hideTimeoutRef.current), []);

  // Close tooltip when clicking/tapping outside (both trigger and popover).
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e) => {
      const inWrapper = wrapperRef.current?.contains(e.target);
      const inPopover = popoverRef.current?.contains(e.target);
      if (!inWrapper && !inPopover) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible, updatePosition]);

  const handleTouchStart = useCallback(
    (e) => {
      // Prevent the tap from bubbling to a parent click handler (e.g. the
      // cluster row that expands to show individual funds) and from emitting
      // a follow-up synthetic click.
      e.preventDefault();
      e.stopPropagation();
      if (isVisible) {
        hide();
      } else {
        show();
      }
    },
    [isVisible, show, hide]
  );

  // Guard against the click that follows a tap bubbling up to a parent handler.
  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  if (!content) return null;

  const isWarning = variant === 'warning';
  const Icon = isWarning ? AlertTriangle : Info;

  return (
    <span ref={wrapperRef} className={styles.wrapper} onMouseEnter={show} onMouseLeave={hideSoon}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${isWarning ? styles.triggerWarning : ''}`}
        onFocus={show}
        onBlur={hide}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        aria-label={isWarning ? 'Warning' : 'More information'}
      >
        <Icon size={size} />
      </button>
      {createPortal(
        <span
          ref={popoverRef}
          className={`${styles.popover} ${isVisible ? styles.popoverVisible : ''}`}
          style={{ top: position.top, left: position.left }}
          onMouseEnter={show}
          onMouseLeave={hideSoon}
        >
          <ReactMarkdown
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </span>,
        document.body
      )}
    </span>
  );
}

export default InfoTooltip;
