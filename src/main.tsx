import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";

const globalWindow = globalThis as typeof globalThis & {
  __PRODUCTION_CONSOLE_MUTED__?: boolean;
};

if (import.meta.env.PROD && !globalWindow.__PRODUCTION_CONSOLE_MUTED__) {
  const noop = () => {};
  const methods = ["log", "info", "warn", "error", "debug", "trace"] as const;
  const browserConsole = window.console as unknown as Record<string, (...args: unknown[]) => void>;

  methods.forEach((method) => {
    browserConsole[method] = noop;
  });

  globalWindow.__PRODUCTION_CONSOLE_MUTED__ = true;
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}


createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
