import React from "react";
import { useAuth } from "../../../context/AuthContext";

const normalizeRole = (role) => String(role || "").trim().toLowerCase() || "user";

const ProjectPageHeader = ({
  icon: Icon,
  title,
  subtitle,
  action = null,
  projectCount,
  projectCountLoading,
}) => {
  const { user, projectProjects, projectProjectsLoading } = useAuth();
  const role = normalizeRole(user?.role || user?.userType);
  const resolvedProjectCount = Number.isFinite(projectCount) ? projectCount : projectProjects.length;
  const resolvedProjectCountLoading =
    typeof projectCountLoading === "boolean" ? projectCountLoading : projectProjectsLoading;

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,237,0.92))] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:border-amber-200/40 sm:bg-gradient-to-br sm:from-amber-400 sm:via-orange-500 sm:to-rose-600 sm:p-6 sm:shadow-[0_24px_60px_rgba(245,158,11,0.18)] lg:rounded-[2rem] lg:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.08),transparent_30%)] sm:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.14),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-40 bg-gradient-to-l from-white/10 to-transparent sm:block sm:w-56 lg:w-72" />

      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="rounded-[1.25rem] border border-amber-200 bg-white p-3 text-amber-500 shadow-lg shadow-amber-100/70 sm:rounded-[1.5rem] sm:border-white/25 sm:bg-white/12 sm:text-white sm:shadow-2xl sm:backdrop-blur-sm sm:p-4">
            <Icon size={28} />
          </div>
          <div className="min-w-0 text-slate-900 sm:text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500/80 sm:text-white/75">
              Civil Track Workspace
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl lg:text-[2.15rem]">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-[15px] sm:text-white/82">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 min-[520px]:grid-cols-2 xl:w-auto xl:min-w-[420px] xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 shadow-lg shadow-slate-200/60 sm:border-white/15 sm:bg-white/12 sm:text-white sm:shadow-lg sm:shadow-black/5 sm:backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-white/60">
              Projects
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight sm:text-[1.7rem]">
              {resolvedProjectCountLoading ? "..." : resolvedProjectCount}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 shadow-lg shadow-slate-200/60 sm:border-white/15 sm:bg-white/12 sm:text-white sm:shadow-lg sm:shadow-black/5 sm:backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-white/60">
              Access Role
            </p>
            <p className="mt-1 text-sm font-black uppercase tracking-[0.18em]">{role}</p>
          </div>
          {action ? (
            <div className="min-[520px]:col-span-2 xl:col-span-1">{action}</div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 shadow-lg shadow-slate-200/60 sm:border-white/15 sm:bg-white/12 sm:text-white sm:shadow-lg sm:shadow-black/5 sm:backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-white/60">
                Status
              </p>
              <p className="mt-1 text-sm font-black uppercase tracking-[0.18em]">Connected</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProjectPageHeader;
