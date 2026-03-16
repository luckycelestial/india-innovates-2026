import React from 'react';
import './ui.css';

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`ud-ui-card ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {'success' | 'warning' | 'danger' | 'info' | 'neutral' | string} [props.variant='neutral']
 */
export function Badge({ variant = 'neutral', children, className = '', ...props }) {
  // We'll standardise the variants to specific classes
  const variantClass = `ud-badge-${variant.toLowerCase()}`;
  return (
    <span className={`ud-ui-badge ${variantClass} ${className}`} {...props}>
      {children}
    </span>
  );
}
