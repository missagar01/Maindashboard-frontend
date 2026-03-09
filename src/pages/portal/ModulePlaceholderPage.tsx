import { Link } from "react-router";

interface ModulePlaceholderPageProps {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaPath?: string;
}

const ModulePlaceholderPage: React.FC<ModulePlaceholderPageProps> = ({
  title,
  description,
  ctaLabel = "Go To Portal Home",
  ctaPath = "/",
}) => {
  return (
    <div className="min-h-[calc(100vh-140px)] rounded-[2rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(238,28,35,0.10),_transparent_32%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] sm:p-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <div className="flex flex-col gap-4">
          <span className="inline-flex w-fit rounded-full border border-red-100 bg-red-50 px-4 py-1 text-xs font-bold tracking-[0.24em] text-red-700">
            INTEGRATED PORTAL
          </span>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {description}
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Status</p>
            <p className="mt-3 text-2xl font-black text-slate-900">Portal Ready</p>
            <p className="mt-2 text-sm text-slate-600">
              Header, auth, and module navigation are already running in the main app shell.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Current Phase</p>
            <p className="mt-3 text-2xl font-black text-slate-900">Frontend Merge</p>
            <p className="mt-2 text-sm text-slate-600">
              This module route is reserved inside the unified website and can now be expanded safely.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Navigation</p>
            <p className="mt-3 text-2xl font-black text-slate-900">Sidebar Active</p>
            <p className="mt-2 text-sm text-slate-600">
              The module-specific sidebar is already live from the shared header navigation.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to={ctaPath}
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-[#ee1c23] to-[#ff6a00] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:scale-[1.01]"
          >
            {ctaLabel}
          </Link>
          <Link
            to="/"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Back To Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ModulePlaceholderPage;
