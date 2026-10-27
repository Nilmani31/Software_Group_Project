import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search, CheckSquare, Square } from 'lucide-react';

/**
 * ModernDropdown - A sleek, high-end dropdown component supporting
 * single select and multi-select with search, tags, and animated popup.
 *
 * Props:
 * - options: Array of strings ['A', 'B'] OR array of objects [{ value, label, subtitle?, badge? }]
 * - value: string | number | array of values (if multiple=true)
 * - onChange: (newValue) => void
 * - placeholder: string (default "Select an option")
 * - multiple: boolean (default false)
 * - searchable: boolean (default true when options.length > 5)
 * - clearable: boolean (default true)
 * - disabled: boolean (default false)
 * - className: string (extra wrapper class)
 * - style: object (wrapper style overrides)
 * - minWidth: string (default "160px")
 * - fullWidth: boolean (default false)
 */
export default function ModernDropdown({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  multiple = false,
  searchable = undefined,
  clearable = true,
  disabled = false,
  className = "",
  style = {},
  minWidth = "120px",
  fullWidth = false,
  id
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options to [{ value, label, subtitle, badge }]
  const normalizedOptions = React.useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: opt, label: String(opt) };
      }
      if (opt && typeof opt === 'object') {
        return {
          value: opt.value !== undefined ? opt.value : (opt._id || opt.id || opt.name),
          label: opt.label || opt.name || opt.branchName || String(opt.value || ''),
          subtitle: opt.subtitle,
          badge: opt.badge
        };
      }
      return { value: '', label: '' };
    });
  }, [options]);

  // Determine if search should be enabled
  const shouldShowSearch = searchable !== undefined 
    ? searchable 
    : normalizedOptions.length > 5;

  // Filter options based on search term
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase();
    return normalizedOptions.filter(opt => 
      String(opt.label).toLowerCase().includes(term) ||
      (opt.subtitle && String(opt.subtitle).toLowerCase().includes(term))
    );
  }, [normalizedOptions, searchTerm]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && shouldShowSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, shouldShowSearch]);

  // Check if an option is selected
  const isSelected = (optValue) => {
    if (multiple) {
      if (Array.isArray(value)) {
        return value.some(v => String(v) === String(optValue));
      }
      return false;
    }
    return String(value) === String(optValue);
  };

  // Handle option selection
  const handleSelect = (optValue, e) => {
    e?.stopPropagation();
    if (disabled) return;

    if (multiple) {
      const currentValues = Array.isArray(value) ? [...value] : [];
      const existsIndex = currentValues.findIndex(v => String(v) === String(optValue));
      let newValues;
      if (existsIndex >= 0) {
        newValues = currentValues.filter((_, idx) => idx !== existsIndex);
      } else {
        newValues = [...currentValues, optValue];
      }
      onChange && onChange(newValues);
    } else {
      onChange && onChange(optValue);
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  // Clear selection
  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (multiple) {
      onChange && onChange([]);
    } else {
      onChange && onChange("");
    }
    setSearchTerm("");
  };

  // Select all (multiple mode only)
  const handleSelectAll = (e) => {
    e.stopPropagation();
    if (!multiple || disabled) return;
    const allValues = normalizedOptions.map(o => o.value);
    onChange && onChange(allValues);
  };

  // Deselect all (multiple mode only)
  const handleDeselectAll = (e) => {
    e.stopPropagation();
    if (!multiple || disabled) return;
    onChange && onChange([]);
  };

  // Render label for current selection
  const renderTriggerContent = () => {
    if (multiple) {
      const selectedList = Array.isArray(value) 
        ? normalizedOptions.filter(o => value.some(v => String(v) === String(o.value)))
        : [];

      if (selectedList.length === 0) {
        return <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 500, lineHeight: 1 }}>{placeholder}</span>;
      }

      if (selectedList.length <= 2) {
        return (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
            {selectedList.map(item => (
              <span
                key={item.value}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: '1px solid #dbeafe',
                  lineHeight: '1.2'
                }}
              >
                {item.label}
                <button
                  type="button"
                  onClick={(e) => handleSelect(item.value, e)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#60a5fa'
                  }}
                  title="Remove"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              padding: '1px 5px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              border: '1px solid #dbeafe'
            }}
          >
            {selectedList[0].label}
          </span>
          <span
            style={{
              background: '#f1f5f9',
              color: '#475569',
              padding: '1px 5px',
              borderRadius: '999px',
              fontSize: '10px',
              fontWeight: 700
            }}
          >
            +{selectedList.length - 1} more
          </span>
        </div>
      );
    }

    // Single Select
    const selectedOption = normalizedOptions.find(o => String(o.value) === String(value));
    if (!selectedOption || selectedOption.value === "" || selectedOption.value === null) {
      return <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 500, lineHeight: 1 }}>{placeholder}</span>;
    }

    return (
      <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
        {selectedOption.label}
      </span>
    );
  };

  // Determine if clear button should show
  const hasValue = multiple 
    ? (Array.isArray(value) && value.length > 0)
    : (value !== "" && value !== null && value !== undefined && value !== "all");

  return (
    <div
      ref={dropdownRef}
      className={`modern-dropdown-wrapper ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: fullWidth ? '100%' : 'auto',
        minWidth: fullWidth ? '100%' : minWidth,
        userSelect: 'none',
        ...style
      }}
      id={id}
    >
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            !disabled && setIsOpen(!isOpen);
          }
          if (e.key === 'Escape') setIsOpen(false);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '32px',
          minHeight: '32px',
          padding: '0 8px 0 10px',
          background: disabled ? '#f8fafc' : '#ffffff',
          border: `1px solid ${isOpen ? '#2563eb' : '#cbd5e1'}`,
          borderRadius: '6px',
          boxShadow: isOpen 
            ? '0 0 0 2.5px rgba(37, 99, 235, 0.14)' 
            : '0 1px 2px rgba(0, 0, 0, 0.04)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          gap: '6px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left', overflow: 'hidden' }}>
          {renderTriggerContent()}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
          {clearable && hasValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '1px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#94a3b8',
                borderRadius: '3px',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              title="Clear selection"
            >
              <X size={12} />
            </button>
          )}

          <ChevronDown
            size={14}
            style={{
              color: isOpen ? '#2563eb' : '#64748b',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.15s ease',
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>

      {/* Floating Dropdown Card (The Modern UI Details Showing Part) */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: fullWidth ? '100%' : 'max-content',
            minWidth: '100%',
            maxWidth: '320px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.12), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
            zIndex: 9999,
            padding: '4px',
            boxSizing: 'border-box',
            animation: 'modernDropdownPop 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Quick Search Header */}
          {shouldShowSearch && (
            <div style={{ position: 'relative', marginBottom: '4px', padding: '1px' }}>
              <Search
                size={12}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none'
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                style={{
                  width: '100%',
                  height: '28px',
                  padding: '0 6px 0 25px',
                  borderRadius: '5px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: '11.5px',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.background = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.background = '#f8fafc';
                }}
              />
            </div>
          )}

          {/* Multi-Select Header Controls */}
          {multiple && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '3px 6px 5px 6px',
                borderBottom: '1px solid #f1f5f9',
                marginBottom: '3px',
                fontSize: '10.5px',
                color: '#64748b'
              }}
            >
              <span>
                <strong>{Array.isArray(value) ? value.length : 0}</strong> of {normalizedOptions.length} selected
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    cursor: 'pointer',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: 0
                  }}
                >
                  Select All
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '10.5px',
                    padding: 0
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Options List */}
          <div
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              paddingRight: '1px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px 8px', textAlign: 'center', color: '#94a3b8', fontSize: '11.5px' }}>
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const selected = isSelected(opt.value);
                return (
                  <div
                    key={String(opt.value)}
                    role="option"
                    aria-selected={selected}
                    onClick={(e) => handleSelect(opt.value, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 8px',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: selected ? 600 : 500,
                      color: selected ? '#1d4ed8' : '#1e293b',
                      background: selected ? '#eff6ff' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease, color 0.12s ease',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      {multiple && (
                        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: selected ? '#2563eb' : '#cbd5e1' }}>
                          {selected ? <CheckSquare size={14} /> : <Square size={14} />}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {opt.label}
                        </span>
                        {opt.subtitle && (
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 400 }}>
                            {opt.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {opt.badge && (
                        <span
                          style={{
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: 600,
                            background: '#f1f5f9',
                            color: '#475569'
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {!multiple && selected && (
                        <Check size={13} style={{ color: '#2563eb' }} />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
