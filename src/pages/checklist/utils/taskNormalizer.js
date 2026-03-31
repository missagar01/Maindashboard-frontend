/**
 * Task Normalizer Utilities
 * Normalizes data from Checklist, Maintenance, and Housekeeping systems
 * into a unified format for the UnifiedTaskTable component.
 */

// =============================================================================
// STATUS MAPPING
// =============================================================================
const STATUS_MAP = {
    // Checklist statuses
    'Yes': 'Completed',
    'No': 'Pending', // Default for unsubmitted (if submission_date is null)
    'Pending': 'Pending',

    // Maintenance statuses
    'completed': 'Completed',
    'in progress': 'In Progress',
    'pending': 'Pending',
    'no': 'Pending', // Lowercase fallback for maintenance/checklist
    'yes': 'Completed', // Lowercase fallback

    // Generic fallback
    'confirmed': 'Confirmed',
};

const getUnifiedStatus = (status, isHistory = false) => {
    if (!status) return 'Pending';

    // Normalize mapping
    const normalized = STATUS_MAP[status] || STATUS_MAP[status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()] || STATUS_MAP[status.toLowerCase()];

    // If we're in history mode and status is 'Pending' or 'No', it's actually 'Not Done' 
    // unless it was explicitly completed.
    if (isHistory && (normalized === 'Pending' || status.toLowerCase() === 'no')) {
        return 'Not Done';
    }

    return normalized || status;
};

// =============================================================================
// PRIORITY NORMALIZATION
// =============================================================================
const PRIORITY_ORDER = {
    'High': 1,
    'Medium': 2,
    'Low': 3,
    'N/A': 4,
};

const normalizePriority = (priority) => {
    if (!priority) return 'N/A';
    const capitalized = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
    return ['High', 'Medium', 'Low'].includes(capitalized) ? capitalized : 'N/A';
};

// =============================================================================
// DATE FORMATTING
// =============================================================================
const parseDate = (dateString) => {
    if (!dateString) return null;
    if (dateString instanceof Date) return dateString;

    const dateStr = dateString.toString().trim();

    // 1. Handle DMY format: DD/MM/YYYY or DD-MM-YYYY (with optional time)
    const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:[\sT]+(\d{1,2})[\:\.](\d{1,2})(?:[\:\.](\d{1,2}))?(?:\.\d+)?)?/);
    if (dmyMatch) {
        return new Date(
            parseInt(dmyMatch[3]),
            parseInt(dmyMatch[2]) - 1,
            parseInt(dmyMatch[1]),
            dmyMatch[4] ? parseInt(dmyMatch[4]) : 0,
            dmyMatch[5] ? parseInt(dmyMatch[5]) : 0,
            dmyMatch[6] ? parseInt(dmyMatch[6]) : 0
        );
    }

    // 2. Handle YMD format: YYYY-MM-DD or YYYY/MM/DD (with optional time)
    const ymdMatch = dateStr.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:[\sT]+(\d{1,2})[\:\.](\d{1,2})(?:[\:\.](\d{1,2}))?(?:\.\d+)?)?/);
    if (ymdMatch) {
        return new Date(
            parseInt(ymdMatch[1]),
            parseInt(ymdMatch[2]) - 1,
            parseInt(ymdMatch[3]),
            ymdMatch[4] ? parseInt(ymdMatch[4]) : 0,
            ymdMatch[5] ? parseInt(ymdMatch[5]) : 0,
            ymdMatch[6] ? parseInt(ymdMatch[6]) : 0
        );
    }

    // 3. Fallback for standard parsing (ISO strings with Z or offsets)
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;

    return null;
};

/**
 * Formats a date string to DD-MM-YYYY format
 * @param {string|Date} dateString 
 * @returns {string}
 */
export const formatDate = (dateString) => {
    if (!dateString || dateString === '—') return '—';

    // Manual parsing for standard YYYY-MM-DD or DD-MM-YYYY strings to avoid timezone shifts
    const dateStr = dateString.toString().trim();
    const ymdMatch = dateStr.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
    if (ymdMatch) {
        return `${ymdMatch[3].padStart(2, '0')}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[1]}`;
    }
    const dmyMatch = dateStr.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})/);
    if (dmyMatch) {
        return `${dmyMatch[1].padStart(2, '0')}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[3]}`;
    }

    try {
        const date = parseDate(dateString);
        if (!date || isNaN(date.getTime())) return '—';

        return new Intl.DateTimeFormat('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Asia/Kolkata'
        }).format(date).replace(/\//g, '-');
    } catch (e) {
        return '—';
    }
};

/**
 * Formats a date string to DD-MM-YYYY, HH:MM:SS AM/PM format
 * @param {string|Date} dateString 
 * @param {boolean} includeSeconds 
 * @returns {string}
 */
export const formatDateTime = (dateString, includeSeconds = false) => {
    if (!dateString || dateString === '—') return '—';

    const dateStr = dateString.toString().trim();

    // 0. If it's an ISO string with timezone indicator (Z), skip manual parsing 
    // and use Intl.DateTimeFormat to correctly handle the UTC -> Local (IST) conversion.
    const isISO = dateStr.includes('Z') || (dateStr.includes('T') && !dateStr.match(/[\sT]\d{2}:\d{2}:\d{2}$/));
    
    // 1. Manual parsing for standard YYYY-MM-DD HH:mm:ss strings to ensure exact DB time
    const ymdMatch = !isISO ? dateStr.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})(?:[\sT]+(\d{1,2})[\:\.](\d{1,2})(?:[\:\.](\d{1,2}))?(?:\.\d+)?)?/) : null;
    if (ymdMatch && ymdMatch[4]) { // Must have time part for this manual format
        const y = ymdMatch[1];
        const m = ymdMatch[2].padStart(2, '0');
        const d = ymdMatch[3].padStart(2, '0');
        const h = parseInt(ymdMatch[4]);
        const min = ymdMatch[5].padStart(2, '0');
        const s = ymdMatch[6] ? ymdMatch[6].padStart(2, '0') : '00';

        const ampm = h >= 12 ? 'pm' : 'am';
        const h12 = (h % 12 || 12).toString().padStart(2, '0');

        let result = `${d}-${m}-${y}, ${h12}:${min}`;
        if (includeSeconds) result += `:${s}`;
        result += ` ${ampm}`;
        return result;
    }

    // 2. Manual parsing for standard DD-MM-YYYY HH:mm:ss strings
    const dmyMatch = !isISO ? dateStr.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})(?:[\sT]+(\d{1,2})[\:\.](\d{1,2})(?:[\:\.](\d{1,2}))?(?:\.\d+)?)?/) : null;
    if (dmyMatch && dmyMatch[4]) {
        const d = dmyMatch[1].padStart(2, '0');
        const m = dmyMatch[2].padStart(2, '0');
        const y = dmyMatch[3];
        const h = parseInt(dmyMatch[4]);
        const min = dmyMatch[5].padStart(2, '0');
        const s = dmyMatch[6] ? dmyMatch[6].padStart(2, '0') : '00';

        const ampm = h >= 12 ? 'pm' : 'am';
        const h12 = (h % 12 || 12).toString().padStart(2, '0');

        let result = `${d}-${m}-${y}, ${h12}:${min}`;
        if (includeSeconds) result += `:${s}`;
        result += ` ${ampm}`;
        return result;
    }

    try {
        const date = parseDate(dateString);
        if (!date || isNaN(date.getTime())) {
            // Last resort: just strip T and Z from the string
            return dateStr.replace('T', ' ').replace('Z', '').replace(/\.\d+/, '');
        }

        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
        };

        if (includeSeconds) {
            options.second = '2-digit';
        }

        return new Intl.DateTimeFormat('en-IN', options).format(date).replace(/\//g, '-');
    } catch (e) {
        return dateStr.replace('T', ' ').replace('Z', '').replace(/\.\d+/, '');
    }
};

// =============================================================================
// CONTEXT BUILDER
// =============================================================================
const buildContext = (department, machineName, location) => {
    const parts = [department, machineName, location].filter(Boolean);
    return parts.length > 0 ? parts.join(' • ') : '—';
};

// =============================================================================
// CHECKLIST TASK NORMALIZER
// =============================================================================
export const normalizeChecklistTask = (task, isHistory = false) => {
    if (!task) return null;

    // Determine final status
    // If it's from history source (isHistory=true), force it to 'Completed' (unless it was explicitly 'No'/'Not Done')
    let rawStatus = task.status || 'Pending';
    let unifiedStatus = getUnifiedStatus(rawStatus, isHistory);

    if (isHistory || task.submission_date) {
        // If it was explicitly 'No', we might want to keep that distinction in history
        if (rawStatus.toLowerCase() === 'no' || rawStatus.toLowerCase() === 'not done') {
            unifiedStatus = 'Not Done';
        } else {
            unifiedStatus = 'Completed';
            rawStatus = 'Completed';
        }
    } else {
        // Not history AND no submission date -> always Pending
        unifiedStatus = 'Pending';
    }

    return {
        id: task.task_id,
        sourceSystem: 'checklist',
        sourceLabel: 'Checklist',
        title: task.task_description || '—',
        context: buildContext(task.department, null, null),
        department: task.department || '—',
        machineName: '—',
        location: '—',
        assignedTo: task.name || task.assigned_to || '—',
        assignedToSecondary: task.doer_name2 || '—',
        dueDate: task.taskStartDate || task.task_start_date,
        dueDateFormatted: formatDateTime(task.taskStartDate || task.task_start_date, true),
        status: unifiedStatus,
        originalStatus: rawStatus,
        priority: normalizePriority(task.priority),

        // Schedule & Rules
        frequency: task.frequency || '—',
        reminderEnabled: task.reminder_enabled || false,
        plannedDate: task.planned_date || '—',
        taskStartDate: task.task_start_date || '—',
        submissionDate: task.submission_date || '—',
        delay: task.delay || '—',

        // Maintenance-specific (N/A for checklist)
        soundStatus: '—',
        temperature: '—',
        adminDone: task.admin_done || '—',

        // Approvals
        confirmedByHOD: task.attachment === 'confirmed' ? 'Confirmed' : (task.attachment || '—'),
        verificationStatus: '—',

        // Attachments
        image: task.image || null,
        imageUrl: task.image_url || task.image || null,
        requireAttachment: task.require_attachment || 'No',

        // Remarks
        remarks: task.remark || task.remarks || '—',
        userStatusChecklist: task.user_status_checklist || task.userStatusChecklist || '—',

        // Timestamps
        createdAt: task.created_at || '—',
        updatedAt: task.updated_at || '—',

        // Original data for drawer view
        originalData: task,
    };
};

// =============================================================================
// MAINTENANCE TASK NORMALIZER
// =============================================================================
export const normalizeMaintenanceTask = (task, isHistory = false) => {
    if (!task) return null;

    return {
        id: task.task_id,
        taskNo: task.task_no || task.task_id,  // Use task_no for display, fallback to task_id
        sourceSystem: 'maintenance',
        sourceLabel: 'Maintenance',
        title: task.task_description || '—',
        context: buildContext(null, task.machine_name, task.location),
        department: task.department || task.doer_department || '—',
        machineName: task.machine_name || '—',
        location: task.location || '—',
        serialNo: task.serial_no || '—',
        assignedTo: task.doer_name || task.assigned_to || '—',
        doerName: task.doer_name || '—',
        assignedToSecondary: task.doer_name2 || '—',
        dueDate: task.scheduled_date || task.taskStartDate || task.task_start_date,
        dueDateFormatted: formatDate(task.scheduled_date || task.taskStartDate || task.task_start_date),
        status: getUnifiedStatus(task.status, isHistory || !!(task.completed_date || task.actual_date)),
        originalStatus: task.status || 'Pending',
        priority: normalizePriority(task.priority),
        taskType: task.task_type || '—',

        // Schedule & Rules
        frequency: task.frequency || '—',
        reminderEnabled: false,
        plannedDate: task.planned_date || task.scheduled_date || '—',
        taskStartDate: task.task_start_date || '—',
        scheduledDate: task.scheduled_date || '—',
        submissionDate: task.completed_date || task.actual_date || task.submission_date || '—',
        completedDate: task.completed_date || '—',
        delay: '—',

        // Maintenance-specific
        soundStatus: task.sound_status || '—',
        temperature: task.temperature_status || task.temperature || '—',
        adminDone: task.admin_done || '—',

        // Approvals
        confirmedByHOD: '—',
        verificationStatus: '—',

        // Attachments
        image: task.image || null,
        imageUrl: task.image_url || task.image || null,
        requireAttachment: 'No',

        // Remarks
        remarks: task.remarks || task.remark || '—',

        // Timestamps
        createdAt: task.created_at || '—',
        updatedAt: task.updated_at || '—',

        // Original data for submission
        originalData: task,
    };
};

// =============================================================================
// HOUSEKEEPING TASK NORMALIZER
// =============================================================================
export const normalizeHousekeepingTask = (task, isHistory = false) => {
    if (!task) return null;

    return {
        id: task.task_id,
        sourceSystem: 'housekeeping',
        sourceLabel: 'Housekeeping',
        title: task.task_description || '—',
        context: buildContext(task.department, null, null),
        department: task.department || '—',
        machineName: '—',
        location: '—',
        assignedTo: task.name || task.assigned_to || '—',
        assignedToSecondary: task.doer_name2 || '—',
        dueDate: task.taskStartDate || task.task_start_date || task.task_date || task.date || task.scheduled_date,
        // dueDateFormatted: formatDate(task.task_start_date || task.task_date || task.date || task.scheduled_date),
        // status: getUnifiedStatus(task.status, isHistory || !!task.submission_date),
        status: (task.attachment === 'confirmed' || task.confirmedByHOD === 'Confirmed' || task.confirmedByHOD === 'confirmed')
            ? 'Confirmed'
            : (!isHistory && !task.submission_date) ? 'Pending' : getUnifiedStatus(task.status, isHistory || !!task.submission_date),
        originalStatus: task.status || 'Pending',
        priority: normalizePriority(task.priority),
        hod: task.hod || '—',

        // Schedule & Rules
        frequency: task.frequency || '—',
        reminderEnabled: false,
        plannedDate: '—',
        taskStartDate: task.taskStartDate || task.task_start_date,
        submissionDate: task.submission_date || '—',
        delay: '—',

        // Maintenance-specific (N/A for housekeeping)
        soundStatus: '—',
        temperature: '—',
        adminDone: task.admin_done || '—',

        // Approvals
        confirmedByHOD: task.attachment === 'confirmed' ? 'Confirmed' : (task.attachment || '—'),
        verificationStatus: '—',

        // Attachments
        image: task.image || null,
        imageUrl: task.image_url || task.image || null,
        requireAttachment: 'No',

        // Remarks
        remarks: task.remark || task.remarks || '—',

        // Timestamps
        createdAt: task.created_at || '—',
        updatedAt: task.updated_at || '—',

        // Original data for drawer view
        originalData: task,
    };
};

// =============================================================================
// UNIFIED NORMALIZER
// =============================================================================
export const normalizeAllTasks = (checklistTasks = [], maintenanceTasks = [], housekeepingTasks = [], isHistory = false) => {
    // Normalize Checklist tasks
    const normalizedChecklist = checklistTasks
        .map(task => normalizeChecklistTask(task, isHistory))
        .filter(task => task !== null);

    // Normalize Maintenance tasks
    const normalizedMaintenance = maintenanceTasks
        .map(task => normalizeMaintenanceTask(task, isHistory))
        .filter(task => task !== null);

    // Normalize Housekeeping tasks
    const normalizedHousekeeping = housekeepingTasks
        .map(task => normalizeHousekeepingTask(task, isHistory))
        .filter(task => task !== null);

    // Combine all
    return [
        ...normalizedChecklist,
        ...normalizedMaintenance,
        ...normalizedHousekeeping
    ];
};

// =============================================================================
// SORTING UTILITIES
// =============================================================================
export const sortByDate = (tasks, ascending = true) => {
    return [...tasks].sort((a, b) => {
        const dateA = new Date(a.dueDate || 0);
        const dateB = new Date(b.dueDate || 0);
        return ascending ? dateA - dateB : dateB - dateA;
    });
};

export const sortBySubmissionDateDesc = (tasks) => {
    return [...tasks].sort((a, b) => {
        const dateA = new Date(a.submissionDate || 0);
        const dateB = new Date(b.submissionDate || 0);
        return dateB - dateA; // Descending
    });
};

// Sort housekeeping tasks: confirmed first, then by date
export const sortHousekeepingTasks = (tasks) => {
    return [...tasks].sort((a, b) => {
        // Only apply special sorting for housekeeping tasks
        if (a.sourceSystem !== 'housekeeping' || b.sourceSystem !== 'housekeeping') {
            const dateA = new Date(a.dueDate || 0);
            const dateB = new Date(b.dueDate || 0);
            return dateA - dateB;
        }

        // Check if tasks are confirmed (attachment === 'confirmed' or confirmedByHOD === 'Confirmed')
        const aConfirmed = a.originalData?.attachment === 'confirmed' || a.confirmedByHOD === 'Confirmed';
        const bConfirmed = b.originalData?.attachment === 'confirmed' || b.confirmedByHOD === 'Confirmed';

        // Confirmed tasks first
        if (aConfirmed && !bConfirmed) return -1;
        if (!aConfirmed && bConfirmed) return 1;

        // If both confirmed or both not confirmed, sort by date
        const dateA = new Date(a.dueDate || 0);
        const dateB = new Date(b.dueDate || 0);
        return dateA - dateB;
    });
};

export const sortByPriority = (tasks) => {
    return [...tasks].sort((a, b) => {
        return (PRIORITY_ORDER[a.priority] || 4) - (PRIORITY_ORDER[b.priority] || 4);
    });
};

// =============================================================================
// FILTER UTILITIES
// =============================================================================
export const filterTasks = (tasks, filters, userRole = null) => {
    const {
        sourceSystem,
        status,
        priority,
        assignedTo,
        department,
        searchTerm,
        startDate,
        endDate,
    } = filters;

    return tasks.filter(task => {
        // Source system filter - strict comparison
        if (sourceSystem && sourceSystem.trim() !== '') {
            if (!task.sourceSystem || task.sourceSystem !== sourceSystem) {
                return false;
            }

        }

        // Status filter
        if (status) {
            // Special case: 'Completed' filter shows both 'Completed' and 'Not Done' (History view)
            if (status === 'Completed') {
                const hasValidSubmission = task.submissionDate && task.submissionDate !== '—' && task.submissionDate !== '';

                // Housekeeping strictly requires submissionDate for Completed tab
                if (task.sourceSystem === 'housekeeping' && !hasValidSubmission) {
                    return false;
                }

                if (!hasValidSubmission &&
                    task.status !== 'Completed' && task.status !== 'Not Done' &&
                    task.originalStatus !== 'Completed' && task.originalStatus !== 'Yes' &&
                    task.originalStatus !== 'No'
                ) {
                    return false;
                }
            } else if (status === 'Pending') {
                // Broad Fix: Show ALL tasks that have NOT been submitted yet in the Pending view
                const isSubmitted = task.submissionDate && task.submissionDate !== '—' && task.submissionDate !== '';

                // If it's submitted, it definitely shouldn't be in Pending
                if (isSubmitted) {
                    return false;
                }

                // If it's housekeeping and not submitted, we show it in pending
                return true;
            } else if (task.status !== status && task.originalStatus !== status) {
                return false;
            }
        }

        // Priority filter
        if (priority && task.priority !== priority) return false;

        // Assigned to filter
        if (assignedTo && assignedTo.trim() !== '') {
            const filterVal = assignedTo.trim().toLowerCase();
            const taskVal = (task.assignedTo || '').trim().toLowerCase();
            if (taskVal !== filterVal) return false;
        }

        // Department filter
        if (department && department.trim() !== '') {
            const filterVal = department.trim().toLowerCase();
            const taskVal = (task.department || '').trim().toLowerCase();
            if (taskVal !== filterVal) return false;
        }

        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const matchesSearch =
                task.title.toLowerCase().includes(search) ||
                task.id?.toString().toLowerCase().includes(search) ||
                task.assignedTo.toLowerCase().includes(search) ||
                task.context.toLowerCase().includes(search) ||
                task.department.toLowerCase().includes(search) ||
                task.machineName.toLowerCase().includes(search);
            if (!matchesSearch) return false;
        }

        // Date range filter
        if (startDate || endDate) {
            const taskDate = new Date(task.dueDate);
            if (isNaN(taskDate.getTime())) return false;

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (taskDate < start) return false;
            }

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (taskDate > end) return false;
            }
        }

        return true;
    });
};

// =============================================================================
// PRESET FILTER FACTORIES
// =============================================================================
export const getMyTasksFilter = (username) => ({
    assignedTo: username,
});

export const getTodayFilter = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return {
        startDate: todayStr,
        endDate: todayStr,
    };
};

export const getOverdueFilter = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
        endDate: new Date(today.getTime() - 86400000).toISOString().split('T')[0],
    };
};

export const getHighPriorityFilter = () => ({
    priority: 'High',
});

export const getSourceFilter = (source) => ({
    sourceSystem: source,
});
