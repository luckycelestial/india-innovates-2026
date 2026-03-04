import React from 'react';
import './ui.css';

/**
 * Card component
 * @param {'default'|'glass'|'bordered'|'lift'} variant
 */
export function Card({ children, className = '', variant = 'default', style, ...rest }) {
  const cls = [
    'ud-ui-card',
    variant === 'glass'   ? 'ud-ui-card-glass'   : '',
    variant === 'bordered'? 'ud-ui-card-bordered' : '',
    variant === 'lift'    ? 'ud-ui-card-lift'     : '',
    className,
  ].filter(Boolean).join(' ');
  return <div className={cls} style={style} {...rest}>{children}</div>;
}

/**
 * Badge component
 * @param {string} variant - open|resolved|escalated|success|warning|danger|critical|high|medium|low etc.
 */
export function Badge({ children, variant = 'default', className = '', ...rest }) {
  return (
    <span className={`ud-ui-badge ud-badge-${variant} ${className}`} {...rest}>
      {children}
    </span>
  );
}

// Default export for convenience
export default Card;
