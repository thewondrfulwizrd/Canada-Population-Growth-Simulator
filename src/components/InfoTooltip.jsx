import './InfoTooltip.css';

/**
 * Small (?) icon that reveals a tooltip on hover/focus.
 * No external dependencies; CSS-only positioning.
 */
export function InfoTooltip({ text }) {
  return (
    <span className="info-tooltip" tabIndex={0} role="img" aria-label="info">
      <span className="info-tooltip-icon">?</span>
      <span className="info-tooltip-text">{text}</span>
    </span>
  );
}
