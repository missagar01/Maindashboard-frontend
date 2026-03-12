"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import logo from "../assert/Logo.jpeg";

type ToastState = {
  show: boolean;
  message: string;
  type: "success" | "error";
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, isAuthenticated, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: "success",
  });
  const labelClass = "text-[clamp(0.78rem,0.82vw,0.92rem)] font-semibold text-slate-700";
  const fieldIconWrapClass =
    "absolute left-[clamp(0.75rem,0.95vw,0.95rem)] top-1/2 flex h-[clamp(2rem,2.2vw,2.3rem)] w-[clamp(2rem,2.2vw,2.3rem)] -translate-y-1/2 items-center justify-center rounded-full bg-[#fff1ee] text-[#ee1c23]";
  const fieldIconClass = "h-[clamp(0.95rem,1vw,1.1rem)] w-[clamp(0.95rem,1vw,1.1rem)]";
  const baseInputClass =
    "h-[clamp(3rem,5vh,3.45rem)] rounded-[clamp(0.95rem,1.2vw,1.2rem)] border-slate-200 bg-white text-[clamp(0.94rem,0.95vw,1rem)] text-slate-900 placeholder:text-slate-400 shadow-[0_8px_20px_rgba(15,23,42,0.04)] focus-visible:border-[#ee1c23] focus-visible:ring-4 focus-visible:ring-[#ee1c23]/10";
  const inputPaddingLeftClass = "pl-[clamp(3rem,3.8vw,3.45rem)]";
  const inputPaddingRightClass = "pr-[clamp(3rem,3.8vw,3.45rem)]";

  useEffect(() => {
    if (isAuthenticated && !loading && user) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, loading, navigate, user]);

  const showToast = (message: string, type: ToastState["type"]) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    const result = await login(username, password);

    if (result.success) {
      showToast(`Welcome back, ${result.user?.username || username}!`, "success");
      setTimeout(() => navigate("/", { replace: true }), 800);
    } else {
      const errorMsg = result.error || "Invalid username or password";
      setError(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-[linear-gradient(140deg,#fff9f6_0%,#ffffff_46%,#fff5f0_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(238,28,35,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.10),transparent_26%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:clamp(3.75rem,4.8vw,5.5rem)_clamp(3.75rem,4.8vw,5.5rem)]" />

      {toast.show && (
        <div
          className={`fixed left-1/2 z-50 -translate-x-1/2 border bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur ${toast.type === "success"
              ? "border-emerald-200 text-emerald-700"
              : "border-red-200 text-red-700"
            }`}
          style={{
            top: "clamp(1rem,2vw,1.5rem)",
            width: "calc(100% - clamp(1.5rem,6vw,3rem))",
            maxWidth: "clamp(20rem,31vw,28rem)",
            borderRadius: "clamp(1rem,1.4vw,1.5rem)",
            paddingInline: "clamp(0.875rem,1.25vw,1.25rem)",
            paddingBlock: "clamp(0.75rem,1vw,1rem)",
          }}
        >
          <div className="flex items-center gap-[clamp(0.625rem,0.95vw,0.875rem)] text-[clamp(0.875rem,0.92vw,0.975rem)] font-medium">
            <span
              className={`flex h-[clamp(2rem,2.5vw,2.4rem)] w-[clamp(2rem,2.5vw,2.4rem)] shrink-0 items-center justify-center rounded-full ${toast.type === "success" ? "bg-emerald-50" : "bg-red-50"
                }`}
            >
              {toast.type === "success" ? (
                <svg className="h-[clamp(0.95rem,1vw,1.125rem)] w-[clamp(0.95rem,1vw,1.125rem)]" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="h-[clamp(0.95rem,1vw,1.125rem)] w-[clamp(0.95rem,1vw,1.125rem)]" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-3 py-5 sm:min-h-screen sm:px-[clamp(0.875rem,3vw,2rem)] sm:py-[clamp(1.25rem,4vh,2.75rem)]">
        <div className="w-full max-w-[26rem] overflow-hidden rounded-[1.2rem] border border-white/70 bg-white/92 shadow-[0_22px_48px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:max-w-[clamp(21.5rem,28vw,30rem)] sm:rounded-[clamp(1.35rem,1.7vw,1.9rem)] sm:bg-white/90 sm:shadow-[0_34px_80px_rgba(15,23,42,0.14)]">
          <div className="relative overflow-hidden px-3 pb-3 pt-3 sm:px-[clamp(0.875rem,1.4vw,1.2rem)] sm:pb-[clamp(0.9rem,1.5vw,1.25rem)] sm:pt-[clamp(0.875rem,1.4vw,1.15rem)]">
            <div className="absolute inset-x-0 top-0 h-[clamp(0.35rem,0.5vw,0.45rem)] bg-gradient-to-r from-[#ee1c23] via-[#f97316] to-[#fbbf24]" />
            <div className="absolute inset-x-0 top-0 h-[10rem] bg-[radial-gradient(circle_at_top,rgba(238,28,35,0.16),transparent_62%)] sm:h-[clamp(10rem,18vw,12rem)]" />

            <div className="relative rounded-[1rem] border border-[#ffd7ce] bg-[linear-gradient(180deg,#fff5f2_0%,#ffffff_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:rounded-[clamp(1.1rem,1.4vw,1.45rem)] sm:p-[clamp(0.5rem,0.8vw,0.7rem)]">
              <div className="absolute -right-8 -top-8 h-[4.5rem] w-[4.5rem] rounded-full bg-[#ee1c23]/10 blur-[1.25rem] sm:-right-[clamp(2rem,3vw,2.5rem)] sm:-top-[clamp(2rem,3vw,2.5rem)] sm:h-[clamp(4.5rem,6vw,5.75rem)] sm:w-[clamp(4.5rem,6vw,5.75rem)] sm:blur-[clamp(1.2rem,2vw,1.5rem)]" />
              <div className="absolute -bottom-8 left-3 h-16 w-16 rounded-full bg-[#f97316]/10 blur-[1.25rem] sm:-bottom-[clamp(2rem,3.5vw,2.6rem)] sm:left-[clamp(0.75rem,1.5vw,1.15rem)] sm:h-[clamp(4rem,5vw,5rem)] sm:w-[clamp(4rem,5vw,5rem)] sm:blur-[clamp(1.2rem,2vw,1.5rem)]" />

              <div className="relative flex flex-col items-center text-center">
                <div className="w-full overflow-hidden rounded-[0.95rem] border border-white/80 bg-white shadow-[0_18px_32px_rgba(238,28,35,0.1)] sm:rounded-[clamp(0.95rem,1.2vw,1.2rem)]">
                  <img
                    src={logo}
                    alt="Sagar TMT and Pipes"
                    className="block h-auto w-full object-cover"
                    style={{ maxHeight: "clamp(9rem,20vh,10rem)", objectPosition: "center" }}
                  />
                </div>
              </div>
            </div>

            <div className="relative mt-2 rounded-[1rem] border border-slate-200/80 bg-white p-3 shadow-[0_14px_28px_rgba(15,23,42,0.05)] sm:mt-[clamp(0.55rem,0.9vw,0.8rem)] sm:rounded-[clamp(1.1rem,1.4vw,1.45rem)] sm:p-[clamp(0.8rem,1vw,1rem)]">
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-[clamp(0.7rem,0.95vw,0.9rem)]">
                <div className="space-y-1.5 sm:space-y-[clamp(0.35rem,0.55vw,0.5rem)]">
                  <Label htmlFor="username" className={labelClass}>
                    Username
                  </Label>
                  <div className="relative">
                    <span className={fieldIconWrapClass}>
                      <User className={fieldIconClass} />
                    </span>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={loading}
                      className={`${baseInputClass} ${inputPaddingLeftClass}`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-[clamp(0.35rem,0.55vw,0.5rem)]">
                  <Label htmlFor="password" className={labelClass}>
                    Password
                  </Label>
                  <div className="relative">
                    <span className={fieldIconWrapClass}>
                      <Lock className={fieldIconClass} />
                    </span>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className={`${baseInputClass} ${inputPaddingLeftClass} ${inputPaddingRightClass}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-[clamp(0.75rem,0.95vw,0.95rem)] top-1/2 flex h-[clamp(2rem,2.2vw,2.3rem)] w-[clamp(2rem,2.2vw,2.3rem)] -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className={fieldIconClass} /> : <Eye className={fieldIconClass} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-[clamp(0.5rem,0.75vw,0.7rem)] rounded-[clamp(0.9rem,1.1vw,1rem)] border border-red-200 bg-red-50 px-[clamp(0.75rem,0.9vw,0.95rem)] py-[clamp(0.6rem,0.8vw,0.8rem)] text-[clamp(0.84rem,0.9vw,0.92rem)] text-red-700">
                    <svg className="mt-[clamp(0.05rem,0.15vw,0.15rem)] h-[clamp(0.95rem,1vw,1.125rem)] w-[clamp(0.95rem,1vw,1.125rem)] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-[clamp(0.2rem,0.45vw,0.35rem)] h-[clamp(3rem,5vh,3.45rem)] w-full rounded-[clamp(0.95rem,1.2vw,1.2rem)] bg-gradient-to-r from-[#ee1c23] via-[#f43f1f] to-[#f97316] text-[clamp(0.95rem,1vw,1.08rem)] font-semibold text-white shadow-[0_18px_34px_rgba(238,28,35,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:from-[#d9181f] hover:via-[#e63615] hover:to-[#ea580c] hover:shadow-[0_24px_42px_rgba(238,28,35,0.28)]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-[clamp(0.625rem,0.95vw,0.875rem)]">
                      <span className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] animate-spin rounded-full border-[clamp(1.5px,0.15vw,2px)] border-white border-t-transparent" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-[clamp(0.5rem,0.75vw,0.75rem)]">
                      Sign In
                      <ArrowRight className="h-[clamp(0.95rem,1vw,1.125rem)] w-[clamp(0.95rem,1vw,1.125rem)]" />
                    </span>
                  )}
                </Button>
              </form>

              <p className="mt-3 px-1 text-center text-[0.72rem] font-medium tracking-[0.03em] text-slate-400 sm:mt-[clamp(0.8rem,1vw,0.95rem)] sm:px-[clamp(0.2rem,0.5vw,0.4rem)] sm:text-[clamp(0.7rem,0.78vw,0.8rem)] sm:tracking-[clamp(0.03em,0.08vw,0.05em)]">
                Copyright {new Date().getFullYear()} Sagar TMT &amp; Pipes. Secure internal
                portal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
