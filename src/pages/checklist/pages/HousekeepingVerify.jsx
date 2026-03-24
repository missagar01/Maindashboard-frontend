import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCcw,
  AlertCircle,
  Loader2,
  User,
  FileText,
  Clock,
  Building2,
  ShieldCheck,
  Paperclip,
  CheckCheck,
  Tag
} from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';
import {
  getHousekeepingHistoryTasksAPI,
  getHousekeepingPendingTasksAPI,
  confirmHousekeepingTaskAPI,
} from '@/api/checklist/housekeepingApi.js';
import { toast } from 'react-hot-toast';
import { formatDate, normalizeHousekeepingTask } from '../utils/taskNormalizer';

const limit = 50;

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  return [];
};

const extractTotal = (payload, fallbackLength = 0) => {
  const totalValue =
    payload?.total ??
    payload?.totalCount ??
    payload?.count ??
    payload?.data?.total ??
    payload?.data?.totalCount ??
    payload?.meta?.total ??
    payload?.pagination?.total ??
    fallbackLength;

  const parsed = Number(totalValue);
  return Number.isFinite(parsed) ? parsed : fallbackLength;
};

const normalizeVerifyTask = (task) => {
  const normalizedTask = normalizeHousekeepingTask(task, Boolean(task?.submission_date));
  const taskId = task?.task_id ?? task?.id ?? task?.taskId ?? normalizedTask?.id ?? '';

  return {
    ...task,
    originalData: task,
    task_id: taskId,
    department: task?.department ?? task?.dept ?? task?.doer_department ?? normalizedTask?.department ?? '',
    name: task?.name ?? task?.doer_name ?? task?.assigned_to ?? normalizedTask?.assignedTo ?? '',
    task_description:
      task?.task_description ?? task?.description ?? task?.task ?? task?.title ?? normalizedTask?.title ?? '',
    task_start_date:
      task?.task_start_date ??
      task?.task_date ??
      task?.date ??
      task?.scheduled_date ??
      normalizedTask?.dueDate ??
      '',
    frequency: task?.frequency ?? task?.task_frequency ?? normalizedTask?.frequency ?? '',
    remark: task?.remark ?? task?.remarks ?? normalizedTask?.remarks ?? '',
    hod: task?.hod ?? normalizedTask?.hod ?? '',
    doer_name2: task?.doer_name2 ?? task?.assigned_to_secondary ?? normalizedTask?.assignedToSecondary ?? '',
    attachment:
      task?.attachment ??
      task?.confirmedByHOD ??
      normalizedTask?.originalData?.attachment ??
      normalizedTask?.confirmedByHOD ??
      '',
  };
};

const HousekeepingVerify = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchTasks = async (pageNum) => {
    setLoading(true);
    try {
      // 1. Calculate today's date formats for robust matching
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      const todayYMD = `${year}-${month}-${day}`;      // 2026-03-24
      const todayDMY = `${day}-${month}-${year}`;      // 24-03-2026
      const todayDMY2 = `${day}/${month}/${year}`;     // 24/03/2026
      const todayYMD2 = `${year}/${month}/${day}`;     // 2026/03/24

      // 2. Fetch from BOTH History and Pending to be absolutely sure we don't miss records
      // History: Usually contains submitted tasks
      // Pending: Usually contains unsubmitted tasks (but sometimes status varies)
      const [historyResponse, pendingResponse] = await Promise.all([
        getHousekeepingHistoryTasksAPI(pageNum, { unconfirmed: 'true', limit }),
        getHousekeepingPendingTasksAPI(pageNum, { limit })
      ]);

      const allRawItems = [
        ...extractItems(historyResponse?.data),
        ...extractItems(pendingResponse?.data)
      ];

      // 3. Normalize and filter
      const filteredItems = allRawItems
        .map(normalizeVerifyTask)
        .filter((task, index, self) => {
          // De-duplicate by task_id if it exists in both responses
          return task.task_id && self.findIndex(t => t.task_id === task.task_id) === index;
        })
        .filter((task) => {
          // --- USER CONDITIONS ---
          // 1. task_start_date should be today's date
          // 2. submission_date should be not null
          // 3. attachment column should be null

          // Robust Date Matching
          const rawDateStr = String(task.task_start_date || '').trim();
          const isToday = rawDateStr.includes(todayYMD) ||
            rawDateStr.includes(todayDMY) ||
            rawDateStr.includes(todayDMY2) ||
            rawDateStr.includes(todayYMD2);

          // Robust Submission Check (Not Null)
          const subDate = task.submission_date;
          const hasSubmission = subDate !== null &&
            subDate !== undefined &&
            subDate !== '' &&
            subDate !== 'null' &&
            subDate !== 'NULL' &&
            subDate !== '—';

          // Robust Attachment Check (Null/Unconfirmed)
          const attach = task.attachment;
          const isAttachmentNull = attach === null ||
            attach === undefined ||
            attach === '' ||
            attach === 'null' ||
            attach === 'NULL' ||
            attach === '—' ||
            String(attach).toLowerCase() === 'none';

          return isToday && hasSubmission && isAttachmentNull;
        });

      const nextTotal = filteredItems.length;

      setTasks(filteredItems);
      setTotal(nextTotal);
      setHasMore(pageNum * limit < nextTotal);
    } catch (error) {
      console.error('Error fetching verification tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(page);
    setSelectedIds(new Set());
  }, [page]);

  const handleRefresh = () => {
    if (page === 1) {
      fetchTasks(1);
    } else {
      setPage(1);
    }
    setSelectedIds(new Set());
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredTasks.map((task) => task.task_id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (taskId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkVerify = async () => {
    if (selectedIds.size === 0) return;

    setIsVerifying(true);
    const idsToVerify = Array.from(selectedIds);
    let successCount = 0;

    const toastId = toast.loading(`Verifying ${idsToVerify.length} tasks...`);

    try {
      const promises = idsToVerify.map(async (taskId) => {
        try {
          // attachment set to 'confirmed'
          await confirmHousekeepingTaskAPI(taskId, "", null, "", "", "", "confirmed");
          successCount++;
        } catch (err) {
          console.error(`Failed to verify task ${taskId}:`, err);
        }
      });

      await Promise.all(promises);

      toast.success(`Successfully verified ${successCount} tasks`, { id: toastId });

      // Update local state by removing verified tasks
      setTasks((prev) => prev.filter((task) => !selectedIds.has(task.task_id)));
      setTotal((prev) => Math.max(0, prev - successCount));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Bulk verification error:', error);
      toast.error('Verification process encountered errors', { id: toastId });
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks;
    const lowerSearch = searchTerm.toLowerCase();
    return tasks.filter((task) =>
      task.task_id?.toString().includes(lowerSearch) ||
      (task.department || '').toLowerCase().includes(lowerSearch) ||
      (task.task_description || '').toLowerCase().includes(lowerSearch) ||
      (task.name || '').toLowerCase().includes(lowerSearch) ||
      (task.doer_name2 || '').toLowerCase().includes(lowerSearch)
    );
  }, [tasks, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  return (
    <AdminLayout>
      <div className="p-2 md:p-4 max-w-full mx-auto space-y-3">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-[#c41e3a] rounded-full"></div>
              Housekeeping Verification
            </h1>
            {/* <p className="text-gray-400 text-[10px] mt-0.5 uppercase tracking-widest font-bold">Unconfirmed Submissions</p> */}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Controls Bar */}
          <div className="px-4 py-3 border-b border-gray-100 bg-white flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c41e3a]/10 focus:border-[#c41e3a] outline-none transition-all text-xs"
                />
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading || isVerifying}
                className="p-1.5 text-gray-400 hover:text-[#c41e3a] transition-all"
                title="Refresh"
              >
                <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* Select All Section */}
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 grow md:grow-0">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectedIds.size > 0 && selectedIds.size === filteredTasks.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-[#c41e3a] focus:ring-[#c41e3a] cursor-pointer"
                />
                <label htmlFor="select-all" className="text-[10px] font-black text-gray-600 cursor-pointer select-none uppercase tracking-tighter">
                  Select All
                </label>
              </div>

              {/* Verify Button - Placed after select all */}
              <button
                onClick={handleBulkVerify}
                disabled={selectedIds.size === 0 || isVerifying}
                className={`flex items-center justify-center gap-2 px-5 py-1.5 bg-[#c41e3a] text-white rounded-lg hover:bg-[#a61931] transition-all shadow-sm hover:shadow-md disabled:opacity-40 disabled:scale-95 text-xs font-black uppercase tracking-widest`}
              >
                {isVerifying ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCheck size={14} />
                )}
                Verify {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest text-center">Sel</th>
                  <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">Task ID</th>
                  <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">Department</th>
                  <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">Doer</th>
                  <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">Description</th>
                  <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">Start Date</th>
                  <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">Freq</th>
                  <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">Remarks</th>
                  <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">HOD</th>
                  <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">Doer 2</th>
                  <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">Attach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.map((task, index) => (
                  <tr
                    key={task.task_id}
                    className={`hover:bg-red-50/10 transition-colors group cursor-pointer ${selectedIds.has(task.task_id) ? 'bg-red-50/20' : ''}`}
                    onClick={() => toggleSelect(task.task_id)}
                  >
                    <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(task.task_id)}
                        onChange={() => toggleSelect(task.task_id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-[#c41e3a] focus:ring-[#c41e3a] cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 font-bold text-gray-900 border-r border-gray-50/50 text-[11px]">#{task.task_id}</td>
                    <td className="px-4 py-4 text-gray-700 font-bold text-[11px]">{task.department || '—'}</td>
                    <td className="px-4 py-4 text-gray-600 font-medium text-[11px]">{task.name || '—'}</td>
                    <td className="px-4 py-4 text-gray-700 max-w-[250px] break-words text-[11px] leading-relaxed">{task.task_description || '—'}</td>
                    <td className="px-4 py-4 text-gray-600 font-black whitespace-nowrap text-[11px]">
                      {formatDate(task.task_start_date)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-[9px] font-black uppercase tracking-tighter">
                        {task.frequency || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 italic max-w-[150px] truncate text-[10px]">
                      {task.remark || (task.originalData?.remark) || '—'}
                    </td>
                    <td className="px-4 py-4 text-gray-600 text-[11px]">{task.hod || '—'}</td>
                    <td className="px-4 py-4 text-gray-600 text-[11px]">{task.doer_name2 || '—'}</td>
                    <td className="px-4 py-4 text-[10px] font-black text-red-500 uppercase tracking-widest">{task.attachment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-50 bg-gray-50/30">
            {filteredTasks.map((task, index) => (
              <div
                key={task.task_id}
                className={`p-3 space-y-3 relative bg-white transition-all ${selectedIds.has(task.task_id) ? 'ring-1 ring-inset ring-red-100 bg-red-50/10' : ''}`}
                onClick={() => toggleSelect(task.task_id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-2.5 items-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(task.task_id)}
                      onChange={(e) => { e.stopPropagation(); toggleSelect(task.task_id); }}
                      className="w-4 h-4 rounded border-gray-300 text-[#c41e3a] focus:ring-[#c41e3a]"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Building2 size={12} className="text-red-400" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">{task.department}</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-gray-900 text-white rounded text-[8px] font-black uppercase tracking-widest">
                    {task.frequency}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-2 bg-gray-50/50 rounded-lg border border-gray-100">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <User size={8} /> Doer
                    </label>
                    <p className="text-[10px] font-bold text-gray-700 truncate">{task.name || '—'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-end">
                      <Clock size={8} /> Start Date
                    </label>
                    <p className="text-[10px] font-black text-red-600">{formatDate(task.task_start_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <ShieldCheck size={8} /> HOD
                    </label>
                    <p className="text-[10px] font-bold text-gray-700 truncate">{task.hod || '—'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 justify-end">
                      <User size={8} /> Doer 2
                    </label>
                    <p className="text-[10px] font-bold text-gray-700 truncate">{task.doer_name2 || '—'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 border-l-2 border-red-500 pl-3 py-1">
                  <FileText size={12} className="text-gray-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-600 font-medium leading-relaxed">{task.task_description}</p>
                    {task.remark && (
                      <p className="text-[9px] text-gray-400 italic mt-1 flex items-center gap-1">
                        <Tag size={8} /> {task.remark}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <Paperclip size={10} className="text-gray-300" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Attachment:</span>
                    <span className={`text-[9px] font-black uppercase ${task.attachment ? 'text-green-600' : 'text-red-400'}`}>
                      {task.attachment || 'NONE'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-10 bg-white">
              <div className="flex items-center gap-3 px-6 py-2 bg-gray-50 rounded-full border border-gray-100 shadow-sm transition-all hover:scale-105">
                <Loader2 size={16} className="animate-spin text-[#c41e3a]" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                  Fetching Records...
                </span>
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="px-4 py-3 bg-white border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
              Showing {rangeStart} to {rangeEnd} of {total} records
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 disabled:opacity-40 transition-all"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {(() => {
                  const pages = [];
                  for (let p = 1; p <= totalPages; p++) {
                    if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                      pages.push(
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${page === p
                            ? 'bg-[#c41e3a] text-white shadow-sm'
                            : 'hover:bg-gray-100 text-gray-600'
                            }`}
                        >
                          {p}
                        </button>
                      );
                    } else if (p === page - 2 || p === page + 2) {
                      pages.push(<span key={p} className="text-gray-400">...</span>);
                    }
                  }
                  return pages;
                })()}
              </div>

              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 disabled:opacity-40 transition-all"
              >
                Next
              </button>
            </div>
          </div>

          {!loading && filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 bg-gray-50/30">
              <AlertCircle size={48} className="text-gray-100 mb-4" />
              <p className="text-gray-400 font-black text-base uppercase tracking-tighter">No records found</p>
            </div>
          )}

          {/* Dynamic Footer Status */}
          <div className="px-4 py-2.5 bg-white border-t border-gray-100 flex justify-between items-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
            <div className="flex items-center gap-2.5">
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 pr-4">
                Selected: {selectedIds.size}
              </span>
              <span className="text-[10px] font-black text-[#c41e3a] uppercase tracking-widest bg-red-50 px-2.5 py-1 rounded-md border border-red-100">
                PAGE {page} OF {totalPages}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default HousekeepingVerify;
