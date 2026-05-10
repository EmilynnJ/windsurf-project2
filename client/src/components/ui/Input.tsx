import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from 'react';

/* ─── Text Input ────────────────────────────────────────────── */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  help?: string;
  required?: boolean;
  icon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, help, required, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="form-group">
        {label && (
          <label
            htmlFor={inputId}
            className={`form-label ${required ? 'form-label--required' : ''}`}
          >
            {label}
          </label>
        )}
        {icon ? (
          <div className="form-input-wrapper">
            <span className="form-input-wrapper__icon" aria-hidden="true">
              {icon}
            </span>
            <input
              ref={ref}
              id={inputId}
              className={`form-input ${error ? 'form-input--error' : ''} ${className}`}
              aria-invalid={!!error}
              aria-describedby={
                error ? `${inputId}-error` : help ? `${inputId}-help` : undefined
              }
              {...props}
            />
          </div>
        ) : (
          <input
            ref={ref}
            id={inputId}
            className={`form-input ${error ? 'form-input--error' : ''} ${className}`}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : help ? `${inputId}-help` : undefined
            }
            {...props}
          />
        )}
        {error && (
          <span id={`${inputId}-error`} className="form-error" role="alert">
            ⚠ {error}
          </span>
        )}
        {help && !error && (
          <span id={`${inputId}-help`} className="form-help">
            {help}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/* ─── Textarea ──────────────────────────────────────────────── */

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  help?: string;
  required?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, help, required, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="form-group">
        {label && (
          <label
            htmlFor={inputId}
            className={`form-label ${required ? 'form-label--required' : ''}`}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`form-textarea ${error ? 'form-textarea--error' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : help ? `${inputId}-help` : undefined
          }
          {...props}
        />
        {error && (
          <span id={`${inputId}-error`} className="form-error" role="alert">
            ⚠ {error}
          </span>
        )}
        {help && !error && (
          <span id={`${inputId}-help`} className="form-help">
            {help}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

/* ─── Select ────────────────────────────────────────────────── */

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  help?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, help, required, options, placeholder, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="form-group">
        {label && (
          <label
            htmlFor={inputId}
            className={`form-label ${required ? 'form-label--required' : ''}`}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={`form-select ${error ? 'form-select--error' : ''} ${className}`}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span id={`${inputId}-error`} className="form-error" role="alert">
            ⚠ {error}
          </span>
        )}
        {help && !error && (
          <span id={`${inputId}-help`} className="form-help">
            {help}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Input, Textarea, Select };
export type { InputProps, TextareaProps, SelectProps, SelectOption };
