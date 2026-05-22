import { startTransition, useEffect, useState } from 'react';
import {
  fetchLive,
  fetchSummary,
  type DashboardLiveResponse,
  type DashboardSummaryResponse,
} from '../../../api/iot/iotApi';
import { TextileMESDashboard } from '../components/TextileMESDashboard';

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [live, setLive] = useState<DashboardLiveResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const apiDisplayBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || window.location.origin;

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const [summaryResponse, liveResponse] = await Promise.all([fetchSummary(), fetchLive()]);

        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setSummary(summaryResponse);
          setLive(liveResponse);
          setErrorMessage(null);
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Failed to load dashboard');
        setSummary(null);
        setLive(null);
      }
    };

    hydrate();
    const refreshInterval = window.setInterval(hydrate, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
    };
  }, []);

  if (errorMessage) {
    return (
      <main className="min-h-screen text-slate-800 pb-12 bg-[#f8fafc]">
        <div className="relative z-10 mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 mt-8">
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 text-center shadow-md">
            {/* Ambient subtle glows */}
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

            {/* Glowing Icon Container */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 mb-5 relative">
              <span className="absolute inset-0 rounded-2xl bg-amber-500/20 animate-ping opacity-30" />
              <svg className="h-6 w-6 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Typography */}
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">Backend Connection Offline</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              We are unable to establish a connection with the IoT backend server. The dashboard will automatically reconnect once the server becomes available.
            </p>

            {/* Collapsible Diagnostics Panel */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                <span>{showDiagnostics ? 'Hide Diagnostics' : 'Show Diagnostics'}</span>
                <svg
                  className={`h-3 w-3 transform transition-transform duration-200 ${showDiagnostics ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDiagnostics && (
                <div className="mt-4 rounded-xl bg-slate-50 p-3 sm:p-4 text-left font-mono text-xs text-slate-700 overflow-x-auto shadow-inner border border-slate-200">
                  <span className="font-bold text-rose-600 uppercase tracking-wider block mb-1">Error Diagnostics:</span>
                  <div className="whitespace-pre-wrap">{errorMessage}</div>
                  <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-200 pt-2">
                    Target Endpoint: {`${apiDisplayBaseUrl}/api/iot/summary`}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span>Reconnecting every 30 seconds...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-800 pb-12 bg-[#f8fafc]">
      <div className="relative z-10 mx-auto max-w-full px-0 sm:px-4 lg:px-8 mt-6">
        <TextileMESDashboard summary={summary} live={live} isLiveMode />
      </div>
    </main>
  );
}
