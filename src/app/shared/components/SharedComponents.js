// --- Shared UI Components Library ---
'use client';

import React from 'react';
import './SharedComponents.css';

// Loading Spinner Component
export const LoadingSpinner = ({ size = 'medium', color = 'primary', text = '' }) => {
  const sizeClass = `spinner-${size}`;
  const colorClass = `spinner-${color}`;
  
  return (
    <div className={`loading-spinner ${sizeClass} ${colorClass}`}>
      <div className="spinner"></div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
};

// Button Component
export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  ...props 
}) => {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'btn-full-width',
    disabled && 'btn-disabled',
    loading && 'btn-loading'
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <LoadingSpinner size="small" />}
      <span className={loading ? 'btn-text-loading' : ''}>{children}</span>
    </button>
  );
};

// Input Component
export const Input = ({ 
  label, 
  error, 
  hint, 
  required = false, 
  fullWidth = true,
  icon,
  ...props 
}) => {
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={`input-group ${fullWidth ? 'input-full-width' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {icon && <div className="input-icon">{icon}</div>}
        <input
          id={inputId}
          className={`input ${error ? 'input-error' : ''} ${icon ? 'input-with-icon' : ''}`}
          {...props}
        />
      </div>
      {error && <p className="input-error-text">{error}</p>}
      {hint && !error && <p className="input-hint">{hint}</p>}
    </div>
  );
};

// Card Component
export const Card = ({ 
  children, 
  title, 
  subtitle, 
  headerActions,
  padding = 'normal',
  shadow = 'normal',
  className = '',
  ...props 
}) => {
  const classes = [
    'card',
    `card-padding-${padding}`,
    `card-shadow-${shadow}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {(title || subtitle || headerActions) && (
        <div className="card-header">
          <div className="card-header-content">
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {headerActions && (
            <div className="card-header-actions">{headerActions}</div>
          )}
        </div>
      )}
      <div className="card-content">{children}</div>
    </div>
  );
};

// Modal Component
export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'medium',
  closeOnBackdrop = true,
  showCloseButton = true 
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={`modal-content modal-${size}`}>
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && <h2 className="modal-title">{title}</h2>}
            {showCloseButton && (
              <button className="modal-close" onClick={onClose}>
                ×
              </button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

// Progress Bar Component
export const ProgressBar = ({ 
  progress, 
  max = 100, 
  label, 
  showPercentage = true,
  color = 'primary',
  size = 'medium' 
}) => {
  const percentage = Math.min((progress / max) * 100, 100);
  
  return (
    <div className={`progress-bar-container progress-${size}`}>
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          {showPercentage && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className="progress-bar-track">
        <div 
          className={`progress-bar-fill progress-${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Alert Component
export const Alert = ({ 
  type = 'info', 
  title, 
  children, 
  onClose,
  closable = false 
}) => {
  return (
    <div className={`alert alert-${type}`}>
      <div className="alert-content">
        {title && <h4 className="alert-title">{title}</h4>}
        <div className="alert-message">{children}</div>
      </div>
      {closable && (
        <button className="alert-close" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
};

// Badge Component
export const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'medium',
  ...props 
}) => {
  const classes = [
    'badge',
    `badge-${variant}`,
    `badge-${size}`
  ].join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};

// Avatar Component
export const Avatar = ({ 
  src, 
  alt = '', 
  size = 'medium', 
  fallback,
  ...props 
}) => {
  const classes = [
    'avatar',
    `avatar-${size}`
  ].join(' ');

  return (
    <div className={classes} {...props}>
      {src ? (
        <img src={src} alt={alt} className="avatar-image" />
      ) : (
        <div className="avatar-fallback">
          {fallback || alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
};

// Tabs Component
export const Tabs = ({ children, defaultTab = 0, onTabChange }) => {
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  const handleTabChange = (index) => {
    setActiveTab(index);
    if (onTabChange) onTabChange(index);
  };

  return (
    <div className="tabs-container">
      <div className="tabs-header">
        {React.Children.map(children, (child, index) => (
          <button
            key={index}
            className={`tab-button ${index === activeTab ? 'tab-active' : ''}`}
            onClick={() => handleTabChange(index)}
          >
            {child.props.label}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {React.Children.toArray(children)[activeTab]}
      </div>
    </div>
  );
};

export const TabPanel = ({ children, label }) => {
  return <div className="tab-panel">{children}</div>;
};

// Tooltip Component
export const Tooltip = ({ children, content, position = 'top' }) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div 
      className="tooltip-container"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={`tooltip tooltip-${position}`}>
          {content}
        </div>
      )}
    </div>
  );
};
