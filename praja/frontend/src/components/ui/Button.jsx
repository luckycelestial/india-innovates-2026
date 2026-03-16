import React from 'react';
import './ui.css';

/**
 * Button component
 * @param {'primary'|'secondary'|'danger'|'ghost'} variant
 * @param {'xs'|'sm'|'md'|'lg'} size
 * @param {boolean} isLoading
 * @param {boolean} fullWidth
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className = '',
  type = 'button',
  disabled,
  ...rest
}) {
  const cls = [
    'ud-btn',
    `ud-btn-${variant}`,
    `ud-btn-${size}`,
    fullWidth ? 'ud-btn-full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={cls}
      disabled={isLoading || disabled}
      {...rest}
    >
      {isLoading ? (
        <>
          <span className="ud-spinner" aria-hidden="true" />
          <span>{typeof children === 'string' ? children : 'Loading…'}</span>
        </>
      ) : children}
    </button>
  );
}
