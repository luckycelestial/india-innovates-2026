import React from 'react';
import './ui.css';

/**
 * Input / Textarea component
 * @param {boolean} isTextarea
 * @param {string} label
 * @param {string} hint
 * @param {string} error
 * @param {boolean} required
 */
export default function Input({
  label,
  id,
  hint,
  error,
  isTextarea = false,
  className = '',
  required,
  ...props
}) {
  const inputCls = [
    'ud-input-base',
    isTextarea ? 'ud-textarea' : 'ud-input',
    error ? 'ud-input-error' : '',
  ].filter(Boolean).join(' ');

  const El = isTextarea ? 'textarea' : 'input';

  return (
    <div className={`ud-field-wrapper ${className}`}>
      {label && (
        <label htmlFor={id} className="ud-label">
          {label}
          {required && <span className="ud-required" aria-hidden="true">*</span>}
        </label>
      )}
      <El
        id={id}
        className={inputCls}
        required={required}
        aria-describedby={hint ? `${id}-hint` : undefined}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {error && <span id={`${id}-error`} className="ud-field-error" role="alert">{error}</span>}
      {!error && hint && <span id={`${id}-hint`} className="ud-field-hint">{hint}</span>}
    </div>
  );
}
