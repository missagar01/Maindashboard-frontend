import React from "react";
import { Building2, CalendarDays, MapPin, UserRound } from "lucide-react";
import DataTable from "../components/DataTable";
import DirectorStats from "../components/DirectorStats";
import useProjectOptions from "../hooks/useProjectOptions";
import { formatDate } from "../utils/dateUtils";

const projectColumns = [
  {
    key: "project_name",
    label: "Project Name",
    render: (value) => <span className="font-bold text-accent">{value}</span>,
  },
  { key: "location", label: "Location" },
  { key: "client_name", label: "Client" },
  {
    key: "start_date",
    label: "Timeline",
    render: (_, row) => (
      <span className="text-xs">
        {formatDate(row.start_date)} - {formatDate(row.expected_end_date)}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: () => (
      <span className="rounded bg-green-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-500">
        Running
      </span>
    ),
  },
];

const ProjectDashboardPage = () => {
  const { projects, projectsLoading } = useProjectOptions();
  const mobileCardThemes = [
    "from-amber-50 via-white to-orange-50 border-amber-100",
    "from-rose-50 via-white to-orange-50 border-rose-100",
    "from-sky-50 via-white to-indigo-50 border-sky-100",
    "from-emerald-50 via-white to-teal-50 border-emerald-100",
  ];

  return (
    <div className="space-y-6">
      <DirectorStats />

      <section className="space-y-4 md:hidden">
        <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-100 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-amber-500 to-red-500 shadow-lg shadow-amber-500/20" />
              <div>
                <h3 className="text-lg font-black tracking-tight text-slate-900">Project Inventory</h3>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Mobile project overview cards
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4">
            {projectsLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-44 animate-pulse rounded-[1.1rem] border border-slate-200 bg-slate-50"
                />
              ))
            ) : projects.length > 0 ? (
              projects.map((project, index) => (
                <article
                  key={project.project_id}
                  className={`rounded-[1.1rem] border bg-gradient-to-br p-4 shadow-sm ${mobileCardThemes[index % mobileCardThemes.length]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/85 text-amber-500 shadow-sm">
                        <Building2 size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                          Project Name
                        </p>
                        <h4 className="mt-1 truncate text-base font-black tracking-tight text-slate-900">
                          {project.project_name}
                        </h4>
                      </div>
                    </div>
                    <span className="inline-flex rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
                      Running
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <div className="rounded-xl border border-white/90 bg-white/85 px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-amber-50 p-2 text-amber-500">
                          <MapPin size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Location
                          </p>
                          <p className="truncate text-sm font-black text-slate-700">
                            {project.location || "Not specified"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/90 bg-white/85 px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-sky-50 p-2 text-sky-500">
                          <UserRound size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Client
                          </p>
                          <p className="truncate text-sm font-black text-slate-700">
                            {project.client_name || "Not specified"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/90 bg-white/85 px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-rose-50 p-2 text-rose-500">
                          <CalendarDays size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Timeline
                          </p>
                          <p className="text-sm font-black leading-6 text-slate-700">
                            {formatDate(project.start_date)} - {formatDate(project.expected_end_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-400">
                  No projects available right now.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="hidden md:block">
        <DataTable title="Project Inventory" columns={projectColumns} data={projects} />
      </div>
    </div>
  );
};

export default ProjectDashboardPage;
