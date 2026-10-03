import React from 'react';
import { Loader2, Inbox } from 'lucide-react';

const AdminTable = ({ columns, rows, loading = false, emptyTitle = 'Nothing here yet', emptyHint, rowKey = (row) => row.id }) => {
    if (loading) {
        return (
            <div className="admin-table-state">
                <Loader2 size={26} className="animate-spin" />
                <span>Loading records...</span>
            </div>
        );
    }

    if (!rows.length) {
        return (
            <div className="admin-table-state">
                <Inbox size={26} />
                <strong>{emptyTitle}</strong>
                {emptyHint && <span>{emptyHint}</span>}
            </div>
        );
    }

    return (
        <div className="admin-table-wrap">
            <table className="admin-table">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key} style={column.width ? { width: column.width } : undefined}>
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={rowKey(row, index)}>
                            {columns.map((column) => (
                                <td key={column.key} className={column.align === 'right' ? 'is-right' : undefined}>
                                    {column.render ? column.render(row, index) : (row[column.key] ?? '—')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminTable;