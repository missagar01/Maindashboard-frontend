import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * TaskSection - Collapsible section component for task drawer
 * 
 * @param {string} title - Section title
 * @param {ReactNode} children - Section content
 * @param {boolean} defaultOpen - Whether section is open by default
 * @param {string} icon - Optional lucide icon component
 */
export default function TaskSection({
    title,
    children,
    defaultOpen = true,
    icon: Icon = null,
    className = ""
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`border-b border-gray-200 last:border-b-0 ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-gray-500" />}
                    <span className="text-sm font-medium text-gray-700">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
            </button>

            {isOpen && (
                <div className="px-4 py-3 bg-white">
                    {children}
                </div>
            )}
        </div>
    );
}

/**
 * Field - Single field display component for drawer sections
 */
export function Field({ label, value, className = "" }) {
    const displayValue = value && value !== '—' ? value : '—';
    const isNA = displayValue === '—';

    return (
        <div className={`py-1 ${className}`}>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {label}
            </dt>
            <dd className={`mt-0.5 text-sm ${isNA ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                {displayValue}
            </dd>
        </div>
    );
}

/**
 * FieldGrid - Grid layout for multiple fields
 */
export function FieldGrid({ children, columns = 2 }) {
    const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
    };

    return (
        <dl className={`grid ${gridCols[columns] || 'grid-cols-2'} gap-x-4 gap-y-2`}>
            {children}
        </dl>
    );
}

/**
 * StatusBadge - Display status with appropriate color
 */
export function StatusBadge({ status }) {
    const getStatusColor = (status) => {
        const statusLower = status?.toLowerCase() || '';
        if (statusLower.includes('complet') || status === 'Yes') {
            return 'bg-green-100 text-green-800';
        }
        if (statusLower.includes('progress')) {
            return 'bg-blue-100 text-blue-800';
        }
        if (statusLower.includes('pending') || statusLower.includes('not done') || status === 'No') {
            return 'bg-yellow-100 text-yellow-800';
        }
        if (statusLower.includes('overdue')) {
            return 'bg-red-100 text-red-800';
        }
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
            {status || '—'}
        </span>
    );
}

/**
 * PriorityBadge - Display priority with appropriate color
 */
export function PriorityBadge({ priority }) {
    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high':
                return 'bg-red-100 text-red-800';
            case 'medium':
                return 'bg-orange-100 text-orange-800';
            case 'low':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-500';
        }
    };

    return (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(priority)}`}>
            {priority || 'N/A'}
        </span>
    );
}

/**
 * SourceBadge - Display source system with appropriate color
 */
export function SourceBadge({ source }) {
    const getSourceColor = (source) => {
        switch (source) {
            case 'checklist':
                return 'bg-purple-100 text-purple-800';
            case 'maintenance':
                return 'bg-blue-100 text-blue-800';
            case 'housekeeping':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getSourceLabel = (source) => {
        switch (source) {
            case 'checklist':
                return 'Checklist';
            case 'maintenance':
                return 'Maintenance';
            case 'housekeeping':
                return 'Housekeeping';
            default:
                return source || 'Unknown';
        }
    };

    return (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSourceColor(source)}`}>
            {getSourceLabel(source)}
        </span>
    );
}
