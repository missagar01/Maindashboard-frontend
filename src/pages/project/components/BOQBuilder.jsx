import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronRight,
  Layers,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Trash2,
  Warehouse,
  X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  createTask,
  createWorkArea,
  listTasksForStructure,
  listWorkAreas,
} from '../../../api/project/projectApi';
import useProjectOptions from '../hooks/useProjectOptions';

const BOQBuilder = () => {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState('');
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(false);
  const { projects, projectsLoading: projectListLoading, projectsError } = useProjectOptions();
  const [newStructure, setNewStructure] = useState({ name: '', level_type: 'Area' });
  const [addingActivity, setAddingActivity] = useState(null);
  const [newActivity, setNewActivity] = useState({
    activity_name: '',
    planned_quantity: '',
    unit: '',
  });

  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100/90';
  const primaryButtonClass =
    'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_30px_-18px_rgba(249,115,22,0.85)] transition hover:brightness-105 disabled:opacity-50 sm:w-auto';
  const secondaryButtonClass =
    'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:bg-slate-50 sm:w-auto';
  const fieldLabelClass =
    'ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400';

  useEffect(() => {
    if (!selectedProject) {
      setStructures([]);
      setAddingActivity(null);
      return;
    }

    void fetchData(selectedProject);
  }, [selectedProject]);

  const fetchData = async (projectId) => {
    setLoading(true);
    try {
      const structuresData = await listWorkAreas(projectId);
      const structuresWithTasks = await Promise.all(
        (structuresData || []).map(async (structure) => {
          const tasksData = await listTasksForStructure(structure.structure_id);
          return { ...structure, activities: tasksData?.rows || tasksData || [] };
        })
      );
      setStructures(structuresWithTasks);
    } catch (err) {
      console.error('Error fetching BOQ data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStructure = async (event) => {
    event.preventDefault();
    if (!selectedProject || !newStructure.name) {
      return;
    }

    try {
      await createWorkArea({
        project_id: selectedProject,
        name: newStructure.name,
        level_type: newStructure.level_type,
        parent_id: null,
      });
      setNewStructure({ name: '', level_type: 'Area' });
      await fetchData(selectedProject);
    } catch (err) {
      console.error('Error creating structure:', err);
    }
  };

  const handleAddActivity = async (structureId) => {
    if (!newActivity.activity_name || !newActivity.planned_quantity) {
      return;
    }

    try {
      await createTask({
        structure_id: structureId,
        ...newActivity,
      });
      setNewActivity({ activity_name: '', planned_quantity: '', unit: '' });
      setAddingActivity(null);
      await fetchData(selectedProject);
    } catch (err) {
      console.error('Error adding activity:', err);
    }
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:rounded-[1.75rem]">
        <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-fit rounded-[1.1rem] border border-amber-100 bg-white p-3 text-amber-500 shadow-sm sm:rounded-[1.25rem]">
              <Layers size={32} />
            </div>
            <div className="text-slate-900">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600/80">
                Civil Track Workspace
              </p>
              <h2 className="mt-2 text-[1.85rem] font-black tracking-tight sm:text-[2rem]">
                Architecture Architect
              </h2>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500">
                Design structural hierarchies, work areas, and quantified activity paths in one flow.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 pb-4 lg:grid-cols-12 sm:pb-5">
            <div className="space-y-2 lg:col-span-5">
              <label className={fieldLabelClass}>Deployment Target</label>
              <div className="relative group">
                <Warehouse
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-accent"
                  size={18}
                />
                <select
                  className={`${inputClass} pl-12`}
                  value={selectedProject}
                  onChange={(event) => setSelectedProject(event.target.value)}
                  disabled={projectListLoading}
                >
                  <option value="">Select Project Infrastructure...</option>
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.project_name}
                    </option>
                  ))}
                </select>
              </div>
              {!projectListLoading && projects.length === 0 ? (
                <p className="ml-1 text-[10px] font-bold uppercase tracking-[0.18em] text-red-400">
                  {projectsError || 'No project options loaded'}
                </p>
              ) : null}
            </div>

            {canEdit ? (
              <form onSubmit={handleCreateStructure} className="grid gap-3 lg:col-span-7 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <label className={fieldLabelClass}>New Structural Node</label>
                  <input
                    type="text"
                    placeholder="e.g. Block A - First Floor"
                    className={inputClass}
                    value={newStructure.name}
                    onChange={(event) =>
                      setNewStructure({ ...newStructure, name: event.target.value })
                    }
                    disabled={!selectedProject}
                  />
                </div>
                <div className="flex items-end sm:min-w-[180px]">
                  <button
                    type="submit"
                    disabled={!selectedProject || !newStructure.name}
                    className={primaryButtonClass}
                  >
                    <Plus size={18} />
                    Deploy Node
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-7">
                <AlertCircle size={18} className="text-slate-400" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Architecture modification restricted to administrative access
                </p>
              </div>
            )}
          </div>

          {!selectedProject ? (
            <div className="space-y-4 py-6 text-center sm:py-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-slate-50 shadow-sm">
                <Layers size={28} className="text-slate-300" />
              </div>
              <div>
                <h4 className="text-lg font-black tracking-tight text-slate-900">System Idle</h4>
                <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-slate-400">
                  Select a project to load its structural schematic and start building BOQ activity trees.
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="space-y-4 py-10 text-center sm:py-12">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-100 bg-amber-50">
                <Loader2 size={20} className="animate-spin text-amber-500" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Loading structure and activity map...
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {structures.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center sm:rounded-[1.5rem]">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-300">
                    No Structural Nodes Defined
                  </p>
                </div>
              ) : null}

              {structures.map((structure) => (
                <article
                  key={structure.structure_id}
                  className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:rounded-[1.5rem]"
                >
                  <div className="border-b border-slate-100 bg-white px-4 py-4 sm:px-5 sm:py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-accent shadow-sm">
                          <ChevronRight
                            size={22}
                            className={addingActivity === structure.structure_id ? 'rotate-90' : ''}
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                            {structure.name}
                          </h4>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                              {structure.level_type}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                              Structural Node
                            </span>
                          </div>
                        </div>
                      </div>

                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() =>
                            setAddingActivity(
                              addingActivity === structure.structure_id ? null : structure.structure_id
                            )
                          }
                          className={
                            addingActivity === structure.structure_id
                              ? secondaryButtonClass
                              : primaryButtonClass
                          }
                        >
                          {addingActivity === structure.structure_id ? <X size={16} /> : <Plus size={16} />}
                          {addingActivity === structure.structure_id ? 'Cancel' : 'Add Activity'}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    {addingActivity === structure.structure_id ? (
                      <div className="mb-4 rounded-[1.1rem] border border-slate-200 bg-slate-50/60 p-4 sm:mb-5 sm:rounded-[1.25rem]">
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                          <div className="space-y-2 lg:col-span-2">
                            <label className={fieldLabelClass}>Activity Classification</label>
                            <input
                              type="text"
                              className={inputClass}
                              placeholder="e.g. Reinforcement Steel Work"
                              value={newActivity.activity_name}
                              onChange={(event) =>
                                setNewActivity({
                                  ...newActivity,
                                  activity_name: event.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className={fieldLabelClass}>Planned Qty</label>
                            <input
                              type="number"
                              className={inputClass}
                              placeholder="0.00"
                              value={newActivity.planned_quantity}
                              onChange={(event) =>
                                setNewActivity({
                                  ...newActivity,
                                  planned_quantity: event.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className={fieldLabelClass}>Unit</label>
                            <input
                              type="text"
                              className={inputClass}
                              placeholder="MT/m3/etc"
                              value={newActivity.unit}
                              onChange={(event) =>
                                setNewActivity({ ...newActivity, unit: event.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end border-t border-slate-200 pt-3">
                          <button
                            type="button"
                            onClick={() => handleAddActivity(structure.structure_id)}
                            className={primaryButtonClass}
                          >
                            <Save size={16} />
                            Deploy Activity
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {structure.activities?.length > 0 ? (
                      <>
                        <div className="space-y-3 md:hidden">
                          {structure.activities.map((activity) => (
                            <div
                              key={activity.activity_id}
                              className="rounded-[1.1rem] border border-slate-200 bg-white p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                  <div className="rounded-xl bg-slate-50 p-2.5 text-slate-300">
                                    <ListChecks size={16} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                      Quantified Activity
                                    </p>
                                    <p className="mt-1 text-sm font-black leading-6 text-slate-700">
                                      {activity.activity_name}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="rounded-xl p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>

                              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                  Target Volume
                                </p>
                                <p className="mt-1 text-sm font-black text-slate-900">
                                  {activity.planned_quantity}
                                  <span className="ml-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    {activity.unit}
                                  </span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-100 text-left text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <th className="pb-4 pl-2">Quantified Activity</th>
                                <th className="pb-4">Target Volume</th>
                                <th className="pb-4 pr-2 text-right">Control</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {structure.activities.map((activity) => (
                                <tr
                                  key={activity.activity_id}
                                  className="group transition-colors hover:bg-slate-50/50"
                                >
                                  <td className="flex items-center gap-4 py-4 pl-2">
                                    <div className="rounded-lg bg-slate-50 p-2 text-slate-300 transition-colors group-hover:text-accent">
                                      <ListChecks size={16} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">
                                      {activity.activity_name}
                                    </span>
                                  </td>
                                  <td className="py-4 font-mono text-xs font-black uppercase text-slate-900">
                                    {activity.planned_quantity}
                                    <span className="ml-1 text-slate-400">{activity.unit}</span>
                                  </td>
                                  <td className="py-4 pr-2 text-right">
                                    <button
                                      type="button"
                                      className="rounded-xl p-2 text-slate-300 transition-all hover:bg-red-50 hover:text-red-500"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      addingActivity !== structure.structure_id && (
                        <div className="rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50/40 px-4 py-8 text-center sm:rounded-[1.25rem]">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">
                            Awaiting activity deployment
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BOQBuilder;
