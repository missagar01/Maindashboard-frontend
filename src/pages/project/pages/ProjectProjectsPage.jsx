import React, { useMemo, useState } from "react";
import { Building2, CalendarDays, MapPin, Plus, Search, UserRound } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import DataTable from "../components/DataTable";
import ProjectModal from "../components/ProjectModal";
import ProjectPageHeader from "../components/ProjectPageHeader";
import useProjectOptions from "../hooks/useProjectOptions";
import { formatDate } from "../utils/dateUtils";
import { isAdminUser } from "../../../utils/accessControl";

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

const ProjectProjectsPage = () => {
  const { user, refreshProjectProjects } = useAuth();
  const { projects, projectsLoading } = useProjectOptions();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [mobileSearchTerm, setMobileSearchTerm] = useState("");
  const normalizedRole = String(user?.role || user?.userType || "").trim().toLowerCase();
  const canCreateProjects = isAdminUser(user) || normalizedRole === "manager";

  const action = useMemo(() => {
    if (!canCreateProjects) {
      return null;
    }

    return (
      <button
        type="button"
        onClick={() => setIsProjectModalOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-amber-200 transition hover:brightness-105 sm:border sm:border-white/10 sm:bg-white sm:bg-none sm:text-slate-900 sm:shadow-lg sm:shadow-white/20 sm:hover:bg-white/95"
      >
        <Plus size={16} />
        <span>Create</span>
      </button>
    );
  }, [canCreateProjects]);

  const filteredMobileProjects = useMemo(() => {
    const normalizedSearch = mobileSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return projects;
    }

    return projects.filter((project) =>
      [project.project_name, project.location, project.client_name]
        .some((value) => String(value || "").toLowerCase().includes(normalizedSearch))
    );
  }, [mobileSearchTerm, projects]);

  const mobileCardThemes = [
    "from-amber-50 via-white to-orange-50 border-amber-100",
    "from-rose-50 via-white to-orange-50 border-rose-100",
    "from-sky-50 via-white to-indigo-50 border-sky-100",
    "from-emerald-50 via-white to-teal-50 border-emerald-100",
  ];

  return (
    <div className="space-y-6">
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onProjectCreated={refreshProjectProjects}
      />

      <ProjectPageHeader
        icon={Building2}
        title="Project Register"
        subtitle="Manage the active project list without leaving the main portal access model."
        action={action}
        projectCount={projects.length}
        projectCountLoading={projectsLoading}
      />

      <section className="space-y-4 md:hidden">
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-amber-500 to-red-500 shadow-lg shadow-amber-500/20" />
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900">Manage Projects</h3>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  Mobile project inventory cards
                </p>
              </div>
            </div>

            <div className="relative mt-4">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                size={16}
              />
              <input
                type="text"
                placeholder="Search projects..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                value={mobileSearchTerm}
                onChange={(event) => setMobileSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4 p-4">
            {projectsLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-44 animate-pulse rounded-[1.5rem] border border-slate-200 bg-slate-50"
                />
              ))
            ) : filteredMobileProjects.length > 0 ? (
              filteredMobileProjects.map((project, index) => (
                <article
                  key={project.project_id}
                  className={`overflow-hidden rounded-[1.5rem] border bg-gradient-to-br p-4 shadow-lg shadow-slate-200/50 ${
                    mobileCardThemes[index % mobileCardThemes.length]
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Project
                      </p>
                      <h4 className="mt-1 truncate text-lg font-black tracking-tight text-slate-900">
                        {project.project_name}
                      </h4>
                    </div>
                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-green-600">
                      Running
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-amber-50 p-2 text-amber-500">
                          <MapPin size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Location
                          </p>
                          <p className="truncate text-sm font-bold text-slate-700">
                            {project.location || "Not specified"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-sky-50 p-2 text-sky-500">
                          <UserRound size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Client
                          </p>
                          <p className="truncate text-sm font-bold text-slate-700">
                            {project.client_name || "Not specified"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-rose-50 p-2 text-rose-500">
                          <CalendarDays size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Timeline
                          </p>
                          <p className="text-sm font-bold text-slate-700">
                            {formatDate(project.start_date)} - {formatDate(project.expected_end_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-400">
                  No projects found matching your search.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="hidden md:block">
        <DataTable title="Manage Projects" columns={projectColumns} data={projects} />
      </div>
    </div>
  );
};

export default ProjectProjectsPage;
