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
      <main className="min-h-screen text-slate-100 flex items-center justify-center relative px-4">
        {/* Dynamic Ambient Background Glows */}
        <div className="absolute inset-0 bg-[#080711] pointer-events-none" />
        <div className="absolute inset-0 bg-mesh pointer-events-none opacity-40 animate-pulse" />
        
        <div className="relative z-10 w-full max-w-md rounded-[32px] border border-red-550/30 bg-gradient-to-br from-[#121024] via-[#0d0c1b]/95 to-[#1a1835] p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-550/20 mb-6">
            <svg className="h-8 w-8 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">Backend Connection Offline</h2>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            The frontend is trying to fetch director summary data from the backend API at{' '}
            <code className="text-cyan-400 font-mono text-xs">{`${apiDisplayBaseUrl}/api/iot/summary`}</code>, but the connection was refused.
          </p>
          
          <div className="mt-6 rounded-2xl bg-red-500/5 border border-red-500/10 p-3 text-left font-mono text-xs text-red-300">
            <span className="font-bold text-red-400 uppercase tracking-wider block mb-1">Error Log:</span>
            {errorMessage}
          </div>
          
          <p className="mt-6 text-xs text-slate-500 uppercase tracking-widest font-semibold animate-pulse">
            Waiting for backend server to start...
          </p>
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
