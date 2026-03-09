"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import logo from "../assert/Logo.jpeg";
import { getDefaultAllowedPath } from "../utils/accessControl";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, isAuthenticated, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  useEffect(() => {
    if (isAuthenticated && !loading && user) {
      navigate(getDefaultAllowedPath(user), { replace: true });
    }
  }, [isAuthenticated, loading, navigate, user]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 4000);
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
      setTimeout(() => navigate(getDefaultAllowedPath(result.user), { replace: true }), 800);
    } else {
      const errorMsg = result.error || "Invalid username or password";
      setError(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f0f2f5]">

      {/* ── Animated background ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Warm gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] via-[#2d0a0a] to-[#0f172a]" />
        {/* Glowing orbs */}
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-[#ee1c23] opacity-10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 h-[600px] w-[600px] rounded-full bg-[#ff6a00] opacity-10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-[#ee1c23] opacity-5 blur-[100px]" />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* ── Toast ── */}
      {toast.show && (
        <div
          className={`fixed top-5 left-1/2 z-50 -translate-x-1/2 min-w-[300px] max-w-sm rounded-xl px-5 py-3.5 shadow-2xl border backdrop-blur-md transition-all duration-300 ${toast.type === "success"
            ? "bg-emerald-900/80 text-emerald-200 border-emerald-700"
            : "bg-red-950/80 text-red-200 border-red-700"
            }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            {toast.type === "success" ? (
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {toast.message}
          </div>
        </div>
      )}

      {/* ── Login card ── */}
      <div className="relative z-10 w-full max-w-[420px] mx-4">

        {/* Glass card */}
        <div
          className="rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)] border border-white/10"
          style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)" }}
        >

          {/* ── Company logo — full width ── */}
          <div className="relative w-full bg-white">
            <img
              src={logo}
              alt="Sagar TMT and Pipes"
              className="block w-full h-auto object-cover"
              style={{ maxHeight: "180px", objectPosition: "center" }}
            />
            {/* Gradient fade at bottom of logo */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[rgba(15,10,10,0.15)] to-transparent" />
          </div>

          {/* ── Red accent divider ── */}
          <div className="h-1 w-full bg-gradient-to-r from-[#ee1c23] via-[#ff4500] to-[#ff6a00]" />

          {/* ── Form section ── */}
          <div className="px-8 pt-8 pb-8">



            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-[12px] font-bold uppercase tracking-[0.12em] text-white/50">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
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
                    className="pl-10 h-11 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#ee1c23] focus:ring-1 focus:ring-[#ee1c23]/50 focus-visible:ring-[#ee1c23]/50 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[12px] font-bold uppercase tracking-[0.12em] text-white/50">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
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
                    className="pl-10 pr-10 h-11 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#ee1c23] focus:ring-1 focus:ring-[#ee1c23]/50 focus-visible:ring-[#ee1c23]/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-700/50 bg-red-950/40 px-4 py-3 text-[13px] text-red-300">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="mt-2 w-full h-12 rounded-xl bg-gradient-to-r from-[#ee1c23] to-[#ff6a00] text-base font-bold text-white shadow-[0_8px_24px_rgba(238,28,35,0.35)] hover:shadow-[0_12px_32px_rgba(238,28,35,0.5)] hover:from-[#d9181f] hover:to-[#e55f00] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in…
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

          </div>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center text-[11px] text-white/20 font-medium tracking-wide">
          © {new Date().getFullYear()} Sagar TMT &amp; Pipes · Secure Portal
        </p>
      </div>
    </div>
  );
};

export default Login;
