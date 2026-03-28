import React, { useState } from 'react';
import { Search, ChevronUp, ChevronDown, Filter } from 'lucide-react';

const DataTable = ({ columns, data, title, onRowClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = React.useMemo(() => {
        let sortableData = [...data];
        if (searchTerm) {
            sortableData = sortableData.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }
        if (sortConfig.key !== null) {
            sortableData.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableData;
    }, [data, searchTerm, sortConfig]);

    return (
        <div className="industrial-card !p-0 overflow-hidden group">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 md:p-8 gap-4 bg-slate-50/30 border-b border-slate-50">
                {title && (
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-gradient-to-b from-amber-500 to-red-600 rounded-full shadow-lg shadow-amber-500/20"></div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
                    </div>
                )}
                <div className="relative w-full md:w-72 group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-accent transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Filter Infrastructure Resource..."
                        className="w-full bg-white border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all text-slate-900 placeholder:text-slate-300 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                                    onClick={() => handleSort(column.key)}
                                >
                                    <div className="flex items-center gap-2">
                                        {column.label}
                                        {sortConfig.key === column.key ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                        ) : null}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedData.length > 0 ? (
                            sortedData.map((row, index) => (
                                <tr
                                    key={index}
                                    className={`hover:bg-accent/[0.02] transition-colors animate-in fade-in slide-in-from-right-4 duration-500 ${onRowClick ? 'cursor-pointer' : ''}`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    onClick={() => onRowClick && onRowClick(row)}
                                >
                                    {columns.map((column) => (
                                        <td key={column.key} className="px-8 py-5 text-sm text-slate-700 font-bold border-r border-slate-50 last:border-0">
                                            {column.render ? column.render(row[column.key], row) : row[column.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                                    No data found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;
