import React from 'react';
import { Search, RefreshCw, RotateCcw } from 'lucide-react';

const AdminToolbar = ({ search, onSearch, searchPlaceholder = 'Search...', filters = [], actions, onReset, onRefresh, updatedAt }) => (
    <div className="admin-toolbar">
        <div className="admin-search">
            <Search size={16} />
            <input
                type="text"
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
            />
        </div>

        {filters.map((filter) => (
            <select
                key={filter.key}
                className="admin-select"
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
                aria-label={filter.label}
            >
                {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
        ))}

        <div className="admin-toolbar-right">
            {updatedAt && (
                <span className="admin-updated">
                    Updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
            {actions}
            {onReset && (
                <button className="admin-icon-btn" onClick={onReset} title="Reset filters">
                    <RotateCcw size={15} />
                </button>
            )}
            {onRefresh && (
                <button className="admin-icon-btn" onClick={onRefresh} title="Refresh data">
                    <RefreshCw size={15} />
                </button>
            )}
        </div>
    </div>
);

export default AdminToolbar;