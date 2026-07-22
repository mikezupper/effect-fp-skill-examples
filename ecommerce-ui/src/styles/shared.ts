import { css } from "lit"

// Shared shadow-root baseline: tokens come from :root (custom properties pierce
// shadow boundaries); each component composes this into its static styles.
export const shared = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button {
    font: inherit;
    color: inherit;
    cursor: pointer;
    touch-action: manipulation;
    border: 0;
    background: none;
  }
  :focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 2px;
    border-radius: 4px;
  }
  a {
    color: inherit;
    text-decoration: none;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5ch;
    min-block-size: 44px;
    padding: 0.55em 1.1em;
    border-radius: var(--radius-s);
    background: var(--brand);
    color: var(--on-brand);
    font-weight: 600;
    transition:
      background 0.15s ease-out,
      translate 0.15s ease-out;
  }
  .btn:hover {
    background: var(--brand-hover);
  }
  .btn:active {
    translate: 0 1px;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn--ghost {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
  }
  .btn--ghost:hover {
    background: var(--brand-subtle);
  }
  .muted {
    color: var(--text-muted);
  }
`
