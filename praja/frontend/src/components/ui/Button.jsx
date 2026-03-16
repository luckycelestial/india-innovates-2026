import React from 'react';
import './ui.css';

/**
 * @typedef {Object} ButtonProps
 * @property {'primary' | 'secondary' | 'danger' | 'ghost'} [variant='primary']
 * @property {'sm' | 'md' | 'lg'} [size='md']
 * @property {boolean} [isLoading=false]
 * @property {boolean} [fullWidth=false]
 * @property {React.ReactNode} children
 * @property {string} [className]
 * @property {React.ButtonHTMLAttributes<HTMLButtonElement>} [rest]
 */

/**
 * @param {ButtonProps} props
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}) {
  const baseClass = 'ud-btn';
  const variantClass = `ud-btn-${variant}`;
  const sizeClass = `ud-btn-${size}`;
  const widthClass = fullWidth ? 'ud-btn-full' : '';
  const loadingClass = isLoading ? 'ud-btn-loading' : '';

  return (
    <button
      className={[baseClass, variantClass, sizeClass, widthClass, loadingClass, className].filter(Boolean).join(' ')}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="ud-spinner mx-auto" aria-hidden="true" />
      ) : (
        children
      )}
    </button>
  );
}
