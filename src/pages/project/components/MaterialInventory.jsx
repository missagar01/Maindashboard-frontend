import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  MinusCircle,
  Package,
  Plus,
  PlusCircle,
  Search,
  TrendingUp,
  Warehouse,
} from 'lucide-react';
import MaterialInwardModal from './MaterialInwardModal';
import MaterialConsumptionModal from './MaterialConsumptionModal';
import MaterialRegisterModal from './MaterialRegisterModal';
import { useAuth } from '../../../context/AuthContext';
import { listMaterialLogs, listMaterials } from '../../../api/project/projectApi';

const formatLogDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const MaterialInventory = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [inwardOpen, setInwardOpen] = useState(false);
  const [consumptionOpen, setConsumptionOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const primaryButtonClass =
    'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_30px_-18px_rgba(249,115,22,0.85)] transition hover:brightness-105 sm:w-auto';
  const secondaryButtonClass =
    'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm transition hover:bg-slate-50 sm:w-auto';
  const dangerButtonClass =
    'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.16em] text-red-600 shadow-sm transition hover:bg-red-500 hover:text-white sm:w-auto';
  const canRegisterMaterial = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [nextMaterials, nextLogs] = await Promise.all([listMaterials(), listMaterialLogs()]);
      setMaterials(Array.isArray(nextMaterials) ? nextMaterials : []);
      setLogs(Array.isArray(nextLogs) ? nextLogs : []);
    } catch (err) {
      console.error('Error fetching material data:', err);
    } finally {
      setLoading(false);
    }
  };

  const lowStockCount = useMemo(
    () =>
      materials.filter(
        (material) => Number(material.current_stock || 0) <= Number(material.min_threshold || 0)
      ).length,
    [materials]
  );

  const filteredMaterials = useMemo(() => {
    const normalizedSearch = materialSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return materials;
    }

    return materials.filter((material) =>
      [material.material_name, material.unit, material.material_id]
        .some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
    );
  }, [materialSearchTerm, materials]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = logSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return logs;
    }

    return logs.filter((log) =>
      [log.material_name, log.type, log.reference, log.remarks]
        .some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
    );
  }, [logSearchTerm, logs]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:rounded-[2rem]">
        <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,237,0.92))] px-4 py-5 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-[1.25rem] border border-amber-100 bg-amber-50 p-3 text-amber-500 shadow-sm sm:rounded-[1.5rem] sm:p-4">
                <Warehouse size={30} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-600/80">
                  Civil Track Workspace
                </p>
                <h2 className="mt-2 text-[1.85rem] font-black tracking-tight text-slate-900 sm:text-3xl">
                  Material Registry
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                  Real-time inventory monitoring, critical stock alerts, and transaction records.
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 xl:w-auto xl:min-w-[340px]">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Materials
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                  {loading ? '...' : materials.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Low Stock
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-red-500">
                  {loading ? '...' : lowStockCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white px-4 py-4 sm:px-8 sm:py-6">
          <div
            className={`grid gap-3 ${
              canRegisterMaterial
                ? 'grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-3'
                : 'grid-cols-1 min-[520px]:grid-cols-2'
            }`}
          >
            {canRegisterMaterial ? (
              <button onClick={() => setRegisterOpen(true)} className={secondaryButtonClass}>
                <Plus size={16} /> Register New ID
              </button>
            ) : null}
            <button onClick={() => setInwardOpen(true)} className={primaryButtonClass}>
              <PlusCircle size={18} /> Material Inward
            </button>
            <button onClick={() => setConsumptionOpen(true)} className={dangerButtonClass}>
              <MinusCircle size={18} /> Log Consumption
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:rounded-[2rem]">
        <div className="border-b border-slate-100 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-amber-500 to-red-500 shadow-lg shadow-amber-500/20" />
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900">Inventory Snapshot</h3>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Track stock position and low-threshold items
                </p>
              </div>
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                type="text"
                placeholder="Search materials..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                value={materialSearchTerm}
                onChange={(event) => setMaterialSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              [1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-[1.5rem] border border-slate-200 bg-slate-50"
                />
              ))
            ) : filteredMaterials.length === 0 ? (
              <div className="col-span-full rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-14 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white">
                  <Package size={30} className="text-slate-300" />
                </div>
                <h4 className="text-xl font-black tracking-tight text-slate-900">
                  {materials.length === 0 ? 'Registry is Empty' : 'No Matching Materials'}
                </h4>
                <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-slate-400">
                  {materials.length === 0
                    ? 'No materials have been defined yet. Register a material and start tracking stock movement.'
                    : 'No materials matched your search. Try a different name, unit, or tracking ID.'}
                </p>
              </div>
            ) : (
              filteredMaterials.map((material) => {
                const isLowStock =
                  Number(material.current_stock || 0) <= Number(material.min_threshold || 0);
                const iconToneClass = isLowStock
                  ? 'border-red-100 bg-red-50 text-red-500'
                  : 'border-emerald-100 bg-emerald-50 text-emerald-600';
                const alertChipClass = isLowStock
                  ? 'border-red-100 bg-red-50 text-red-500'
                  : 'border-emerald-100 bg-emerald-50 text-emerald-600';
                const accentBarClass = isLowStock ? 'bg-red-500' : 'bg-emerald-500';
                const stockValueClass = isLowStock ? 'text-red-500' : 'text-slate-900';

                return (
                  <article
                    key={material.material_id}
                    className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.96))] p-5 shadow-[0_18px_38px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(15,23,42,0.1)]"
                  >
                    <div className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${accentBarClass}`} />
                    <div className="absolute right-0 top-0 p-6 opacity-[0.04] transition-all duration-500 group-hover:scale-110 group-hover:opacity-[0.07]">
                      <Package size={88} />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <div className={`rounded-2xl border p-3 shadow-sm ${iconToneClass}`}>
                          <Package size={24} />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Current Stock
                          </p>
                          <p className={`mt-1 text-3xl font-black tracking-tight ${stockValueClass}`}>
                            {Number(material.current_stock || 0).toLocaleString()}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            {material.unit || 'unit'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <h4 className="truncate text-xl font-black tracking-tight text-slate-900">
                          {material.material_name}
                        </h4>
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                          Tracking ID: MAT-{String(material.material_id).padStart(4, '0')}
                        </p>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Threshold
                          </p>
                          <p className="mt-1 text-sm font-black text-slate-700">
                            {Number(material.min_threshold || 0).toLocaleString()}
                            <span className="ml-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              {material.unit || 'unit'}
                            </span>
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Status
                          </p>
                          <div
                            className={`mt-1 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${alertChipClass}`}
                          >
                            {isLowStock ? (
                              <>
                                <AlertTriangle size={12} />
                                Critical
                              </>
                            ) : (
                              <>
                                <TrendingUp size={12} />
                                Stable
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:rounded-[2rem]">
        <div className="border-b border-slate-100 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-400">
                <Filter size={18} />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900">System Audit Logs</h3>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Inward and consumption transactions across the registry
                </p>
              </div>
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                type="text"
                placeholder="Search logs..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                value={logSearchTerm}
                onChange={(event) => setLogSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {filteredLogs.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white">
                <Search size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-400">
                No transactions detected for the current search.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredLogs.map((log, index) => {
                  const isInward = log.type === 'inward';

                  return (
                    <article
                      key={`${log.type}-${log.id}-${index}`}
                      className="rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.96))] p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Timeline
                          </p>
                          <p className="mt-1 text-sm font-black text-slate-700">
                            {formatLogDate(log.date)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                            isInward
                              ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                              : 'border-red-100 bg-red-50 text-red-500'
                          }`}
                        >
                          {isInward ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                          {log.type}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Resource
                          </p>
                          <p className="mt-1 text-sm font-black text-slate-900">{log.material_name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              Delta
                            </p>
                            <p
                              className={`mt-1 text-sm font-black ${
                                isInward ? 'text-emerald-600' : 'text-red-500'
                              }`}
                            >
                              {isInward ? '+' : '-'}
                              {log.quantity}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              Reference
                            </p>
                            <p className="mt-1 truncate text-sm font-black text-slate-700">
                              {log.reference || 'SYSTEM_GEN'}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Observations
                          </p>
                          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                            {log.remarks || 'No automated remarks'}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-400">
                      <th className="pb-5 pl-2 text-[10px] font-black uppercase tracking-[0.2em]">Timeline</th>
                      <th className="pb-5 text-[10px] font-black uppercase tracking-[0.2em]">Operation</th>
                      <th className="pb-5 text-[10px] font-black uppercase tracking-[0.2em]">Resource</th>
                      <th className="pb-5 text-[10px] font-black uppercase tracking-[0.2em]">Delta</th>
                      <th className="pb-5 text-[10px] font-black uppercase tracking-[0.2em]">Reference</th>
                      <th className="pb-5 text-[10px] font-black uppercase tracking-[0.2em]">Observations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, index) => {
                      const isInward = log.type === 'inward';

                      return (
                        <tr
                          key={`${log.type}-${log.id}-${index}`}
                          className="border-b border-slate-50 transition-colors hover:bg-slate-50/70"
                        >
                          <td className="py-4 pl-2 text-xs font-bold text-slate-500">
                            {formatLogDate(log.date)}
                          </td>
                          <td className="py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                                isInward
                                  ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                                  : 'border-red-100 bg-red-50 text-red-500'
                              }`}
                            >
                              {isInward ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                              {log.type}
                            </span>
                          </td>
                          <td className="py-4 text-sm font-black text-slate-900">{log.material_name}</td>
                          <td className="py-4">
                            <span
                              className={`font-mono text-sm font-black ${
                                isInward ? 'text-emerald-600' : 'text-red-500'
                              }`}
                            >
                              {isInward ? '+' : '-'}
                              {log.quantity}
                            </span>
                          </td>
                          <td className="py-4 text-xs font-bold text-slate-500">
                            {log.reference || 'SYSTEM_GEN'}
                          </td>
                          <td className="py-4 text-xs font-medium text-slate-400">
                            <p className="max-w-[240px] truncate" title={log.remarks}>
                              {log.remarks || 'No automated remarks'}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      <MaterialRegisterModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRefresh={fetchData}
      />
      <MaterialInwardModal
        isOpen={inwardOpen}
        onClose={() => setInwardOpen(false)}
        materials={materials}
        onRefresh={fetchData}
      />
      <MaterialConsumptionModal
        isOpen={consumptionOpen}
        onClose={() => setConsumptionOpen(false)}
        materials={materials}
        onRefresh={fetchData}
      />
    </div>
  );
};

export default MaterialInventory;
