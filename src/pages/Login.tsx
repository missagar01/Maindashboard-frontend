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
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(140deg,#fff9f6_0%,#ffffff_46%,#fff5f0_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(238,28,35,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.10),transparent_26%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:80px_80px]" />

      {toast.show && (
        <div
          className={`fixed left-1/2 top-5 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border bg-white/95 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur ${
            toast.type === "success"
              ? "border-emerald-200 text-emerald-700"
              : "border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                toast.type === "success" ? "bg-emerald-50" : "bg-red-50"
              }`}
            >
              {toast.type === "success" ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
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

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[500px] overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_40px_100px_rgba(15,23,42,0.16)] backdrop-blur-sm">
          <div className="relative overflow-hidden px-6 pb-6 pt-6 sm:px-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#ee1c23] via-[#f97316] to-[#fbbf24]" />
            <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(238,28,35,0.16),transparent_62%)]" />

            <div className="relative rounded-[28px] border border-[#ffd7ce] bg-[linear-gradient(180deg,#fff5f2_0%,#ffffff_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-5">
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#ee1c23]/10 blur-2xl" />
              <div className="absolute -bottom-12 left-8 h-24 w-24 rounded-full bg-[#f97316]/10 blur-2xl" />

              <div className="relative flex flex-col items-center text-center">
                <div className="w-full overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_22px_45px_rgba(238,28,35,0.12)]">
                  <img
                    src={logo}
                    alt="Sagar TMT and Pipes"
                    className="block h-auto w-full object-cover"
                    style={{ maxHeight: "190px", objectPosition: "center" }}
                  />
                </div>
              </div>
            </div>

            <div className="relative mt-6 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="username" className="text-[13px] font-semibold text-slate-700">
                    Username
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#fff1ee] text-[#ee1c23]">
                      <User className="h-4 w-4" />
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
                      className="h-14 rounded-2xl border-slate-200 bg-white pl-14 text-[15px] text-slate-900 placeholder:text-slate-400 shadow-[0_8px_20px_rgba(15,23,42,0.04)] focus-visible:border-[#ee1c23] focus-visible:ring-4 focus-visible:ring-[#ee1c23]/10"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="password" className="text-[13px] font-semibold text-slate-700">
                    Password
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#fff1ee] text-[#ee1c23]">
                      <Lock className="h-4 w-4" />
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
                      className="h-14 rounded-2xl border-slate-200 bg-white pl-14 pr-14 text-[15px] text-slate-900 placeholder:text-slate-400 shadow-[0_8px_20px_rgba(15,23,42,0.04)] focus-visible:border-[#ee1c23] focus-visible:ring-4 focus-visible:ring-[#ee1c23]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
                  className="mt-2 h-14 w-full rounded-2xl bg-gradient-to-r from-[#ee1c23] via-[#f43f1f] to-[#f97316] text-base font-semibold text-white shadow-[0_18px_34px_rgba(238,28,35,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:from-[#d9181f] hover:via-[#e63615] hover:to-[#ea580c] hover:shadow-[0_24px_42px_rgba(238,28,35,0.28)]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2.5">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs font-medium tracking-wide text-slate-400">
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
