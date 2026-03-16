import React, { forwardRef } from 'react';
import './ui.css';

/**
 * @typedef {Object} InputProps
 * @property {string} [label]
 * @property {string} [error]
 * @property {string} [hint]
 * @property {boolean} [isTextarea]
 * @property {string} [className]
 * @property {React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>} [rest]
 */

const Input = forwardRef(
  /** @param {InputProps} props */
  ({ label, error, hint, isTextarea = false, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const Component = isTextarea ? 'textarea' : 'input';

    return (
      <div className={`ud-field-wrapper ${className}`}>
        {label && (
          <label htmlFor={inputId} className="ud-label">
            {label}
            {props.required && <span className="ud-required" aria-hidden="true">*</span>}
          </label>
        )}
        <Component
          id={inputId}
          ref={ref}
          className={`ud-input-base ${isTextarea ? 'ud-textarea' : 'ud-input'} ${error ? 'ud-input-error' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <div id={`${inputId}-error`} className="ud-field-error" role="alert">
            {error}
          </div>
        )}
        {hint && !error && (
          <div id={`${inputId}-hint`} className="ud-field-hint">
            {hint}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
