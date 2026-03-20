import React from 'react';

interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  error,
  hint,
  icon,
  iconPosition = 'left',
  size = 'md',
  disabled = false,
  required = false,
  name,
  id,
  className = '',
}) => {
  const inputId = id || name || `input-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <div className={`input-group input-group--${size} ${error ? 'input-group--error' : ''} ${className}`}>
      {label && (
        <label className="input-label" htmlFor={inputId}>
          {label}
          {required && <span className="input-required" aria-hidden="true">*</span>}
        </label>
      )}
      <div className={`input-wrapper ${icon ? `input-wrapper--icon-${iconPosition}` : ''}`}>
        {icon && iconPosition === 'left' && (
          <span className="input-icon input-icon--left">{icon}</span>
        )}
        <input
          id={inputId}
          name={name}
          type={type}
          className="input-field"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        />
        {icon && iconPosition === 'right' && (
          <span className="input-icon input-icon--right">{icon}</span>
        )}
      </div>
      {error && (
        <p className="input-error" id={`${inputId}-error`} role="alert">{error}</p>
      )}
      {hint && !error && (
        <p className="input-hint" id={`${inputId}-hint`}>{hint}</p>
      )}
    </div>
  );
};

export default Input;
