import { useState, useCallback, useMemo } from "react";
import {
    X,
    FileText,
    Calendar,
    Wrench,
    CheckCircle,
    Paperclip,
    MessageSquare,
    History
} from "lucide-react";
import TaskSection, {
    Field,
    FieldGrid,
    StatusBadge,
    PriorityBadge,
    SourceBadge
} from "./TaskSection";
import { formatDateTime } from "../../utils/taskNormalizer";

/**
 * TaskDrawer - Right-side drawer showing all task details
 * 
 * @param {object} task - Normalized task object
 * @param {boolean} isOpen - Whether drawer is open
 * @param {function} onClose - Close handler
 * @param {function} onUpdate - Update handler for task modifications
 * @param {string} userRole - Current user role (admin/user)
 */
export default function TaskDrawer({
    task,
    isOpen,
    onClose,
    onUpdate,
    userRole = "admin"
}) {
    const [remarks, setRemarks] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset state when task changes
    useMemo(() => {
        if (task) {
            setRemarks(task.remarks !== '—' ? task.remarks : "");
            setSelectedStatus(task.originalStatus || "");
        }
    }, [task?.id]);


    const handleSubmit = useCallback(async () => {
        if (!task || !onUpdate) return;

        setIsSubmitting(true);
        try {
            await onUpdate({
                taskId: task.id,
                sourceSystem: task.sourceSystem,
                status: selectedStatus,
                remarks,
                originalData: task.originalData,
            });
            onClose();
        } catch (error) {
            console.error("Error updating task:", error);
        } finally {
            setIsSubmitting(false);
        }
    }, [task, selectedStatus, remarks, onUpdate, onClose]);


    // Image Preview Modal State
    const [previewImage, setPreviewImage] = useState(null);

    // Format interval object to string (e.g. { hours: 1, minutes: 30 } -> "1h 30m")
    const formatInterval = (interval) => {
        if (!interval) return '—';
        if (typeof interval === 'string') return interval;
        if (typeof interval === 'object') {
            const parts = [];
            if (interval.years) parts.push(`${interval.years}y`);
            if (interval.months) parts.push(`${interval.months}mo`);
            if (interval.days) parts.push(`${interval.days}d`);
            if (interval.hours) parts.push(`${interval.hours}h`);
            if (interval.minutes) parts.push(`${interval.minutes}m`);
            if (interval.seconds) parts.push(`${interval.seconds}s`);
            return parts.join(' ') || '0s';
        }
        return '—';
    };

    if (!isOpen || !task) return null;

    const existingImageUrl = task.imageUrl || task.image;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col overflow-hidden transform transition-transform duration-300 ease-in-out">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center gap-3">
                        <SourceBadge source={task.sourceSystem} />
                        <h2 className="text-lg font-semibold text-gray-800 truncate">
                            Task Details
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                        aria-label="Close drawer"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Section 1: Task Overview */}
                    <TaskSection title="Task Overview" icon={FileText} defaultOpen={true}>
                        <FieldGrid columns={2}>
                            <Field label="Task ID" value={task.id} />
                            <Field label="Source System" value={task.sourceLabel} />
                        </FieldGrid>

                        <div className="mt-3">
                            <Field label="Task Description" value={task.title} />
                        </div>

                        <FieldGrid columns={2} className="mt-3">
                            <Field label="Department" value={task.department} />
                            <Field label="Machine / Location" value={task.machineName !== '—' ? task.machineName : task.location} />
                        </FieldGrid>

                        <FieldGrid columns={2} className="mt-3">
                            <Field label="Assigned To (Primary)" value={task.assignedTo} />
                            <Field label="Assigned To (Secondary)" value={task.assignedToSecondary} />
                        </FieldGrid>

                        <div className="mt-3">
                            <Field label="Created Date" value={formatDateTime(task.createdAt)} />
                        </div>
                    </TaskSection>

                    {/* Section 2: Schedule & Rules */}
                    <TaskSection title="Schedule & Rules" icon={Calendar} defaultOpen={true}>
                        <FieldGrid columns={2}>
                            <Field label="Frequency" value={task.frequency} />
                            <Field label="Reminder Enabled" value={task.reminderEnabled ? 'Yes' : 'No'} />
                        </FieldGrid>

                        <FieldGrid columns={2} className="mt-3">
                            <Field label="Planned Date" value={task.plannedDate} />
                            <Field label="Task Start Date" value={formatDateTime(task.taskStartDate)} />
                        </FieldGrid>

                        <FieldGrid columns={2} className="mt-3">
                            <Field label="Submission Date" value={formatDateTime(task.submissionDate)} />
                            <Field label="Delay" value={formatInterval(task.delay)} />
                        </FieldGrid>
                    </TaskSection>

                    {/* Section 3: Maintenance Data */}
                    <TaskSection title="Maintenance Data" icon={Wrench} defaultOpen={false}>
                        <FieldGrid columns={2}>
                            <div className="py-1">
                                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Current Status
                                </dt>
                                <dd className="mt-0.5">
                                    <StatusBadge status={task.status} />
                                </dd>
                            </div>
                            <div className="py-1">
                                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Priority
                                </dt>
                                <dd className="mt-0.5">
                                    <PriorityBadge priority={task.priority} />
                                </dd>
                            </div>
                        </FieldGrid>

                        <FieldGrid columns={2} className="mt-3">
                            <Field label="Sound Status" value={task.soundStatus} />
                            <Field label="Temperature" value={task.temperature} />
                        </FieldGrid>

                        <FieldGrid columns={2} className="mt-3">
                            <Field label="Admin Done" value={task.adminDone} />
                            <Field label="Task Type" value={task.taskType || '—'} />
                        </FieldGrid>
                    </TaskSection>

                    {/* Section 4: Approvals & Verification */}
                    <TaskSection title="Approvals & Verification" icon={CheckCircle} defaultOpen={false}>
                        <FieldGrid columns={2}>
                            <Field label="Confirmed by HOD" value={task.confirmedByHOD} />
                            <Field label="Verification Status" value={task.verificationStatus} />
                        </FieldGrid>
                    </TaskSection>

                    <TaskSection title="Attachments" icon={Paperclip} defaultOpen={false}>
                        <div className="space-y-3">
                            <Field label="Attachment Required" value={task.requireAttachment} />

                            {/* Existing Image */}
                            {existingImageUrl && (
                                <div>
                                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                        Existing Attachment
                                    </dt>
                                    <div
                                        className="relative group cursor-pointer"
                                        onClick={() => setPreviewImage(existingImageUrl)}
                                    >
                                        <img
                                            src={existingImageUrl}
                                            alt="Task attachment"
                                            className="h-32 w-auto object-cover rounded-md border border-gray-200 transition-opacity hover:opacity-90"
                                            crossOrigin="anonymous"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-md">
                                            <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Click to View</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TaskSection>

                    {/* Section 6: Remarks & Actions */}
                    <TaskSection title="Remarks & Actions" icon={MessageSquare} defaultOpen={true}>
                        <div className="space-y-3">
                            <div>
                                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                    Current Remarks
                                </dt>
                                <dd className={`text-sm ${task.remarks === '—' ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                                    {task.remarks}
                                </dd>
                            </div>

                            {userRole === "admin" && (
                                <>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">
                                            Update Status
                                        </label>
                                        <select
                                            value={selectedStatus}
                                            onChange={(e) => setSelectedStatus(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Status</option>
                                            <option value="Yes">Yes / Completed</option>
                                            <option value="No">No / Not Done</option>
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">
                                            Add Remarks
                                        </label>
                                        <textarea
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            placeholder="Enter remarks..."
                                            rows={3}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </TaskSection>

                    {/* Section 7: History & Logs */}
                    <TaskSection title="History & Logs" icon={History} defaultOpen={false}>
                        <div className="space-y-2">
                            <FieldGrid columns={2}>
                                <Field label="Created At" value={formatDateTime(task.createdAt)} />
                                <Field label="Updated At" value={formatDateTime(task.updatedAt)} />
                            </FieldGrid>

                            <div className="mt-3 text-xs text-gray-500 italic">
                                Detailed status change timeline coming soon.
                            </div>
                        </div>
                    </TaskSection>
                </div>

                {/* Footer Actions */}
                {userRole === "admin" && (
                    <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !selectedStatus}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                )}
            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors z-50"
                        >
                            <X className="h-8 w-8" />
                        </button>
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                        />
                    </div>
                </div>
            )}
        </>
    );
}
