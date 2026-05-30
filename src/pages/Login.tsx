"use client";

import React, { useEffect, useState, useRef } from "react";
import { ArrowRight, Eye, EyeOff, Lock, User, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import logo from "../assert/Logo.jpeg";
import { startAuthentication } from "@simplewebauthn/browser";
import api from "../config/api.js";
import { preloadFaceBiometrics } from "../utils/faceApi.js";

type ToastState = {
  show: boolean;
  message: string;
  type: "success" | "error";
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, isAuthenticated, user, setAuthData } = useAuth();
  const [username, setUsername] = useState(
    () => localStorage.getItem("user-name") || localStorage.getItem("username") || ""
  );
  const [password, setPassword] = useState(
    () => localStorage.getItem("user-pass") || localStorage.getItem("user_pass") || ""
  );
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: "success",
  });

  const [activeTab, setActiveTab] = useState<"face" | "credentials">("face");

  const [isLoggingInFace, setIsLoggingInFace] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceStatus, setFaceStatus] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const labelClass = "text-[clamp(0.74rem,0.78vw,0.84rem)] font-semibold text-slate-700";
  const fieldIconWrapClass =
    "absolute left-[clamp(0.6rem,0.75vw,0.8rem)] top-1/2 flex h-[clamp(1.75rem,1.9vw,2.05rem)] w-[clamp(1.75rem,1.9vw,2.05rem)] -translate-y-1/2 items-center justify-center rounded-full bg-[#fff1ee] text-[#ee1c23]";
  const fieldIconClass = "h-[clamp(0.85rem,0.9vw,1rem)] w-[clamp(0.85rem,0.9vw,1rem)]";
  const baseInputClass =
    "h-[clamp(2.5rem,4.2vh,2.8rem)] rounded-[clamp(0.65rem,0.8vw,0.8rem)] border-slate-200 bg-white text-[clamp(0.86rem,0.88vw,0.94rem)] text-slate-900 placeholder:text-slate-400 shadow-[0_4px_12px_rgba(15,23,42,0.03)] focus-visible:border-[#ee1c23] focus-visible:ring-4 focus-visible:ring-[#ee1c23]/10";
  const inputPaddingLeftClass = "pl-[clamp(2.7rem,3.2vw,3rem)]";
  const inputPaddingRightClass = "pr-[clamp(2.7rem,3.2vw,3rem)]";

  useEffect(() => {
    if (isAuthenticated && !loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, navigate, user]);

  useEffect(() => {
    if (loading || isAuthenticated || autoLoginAttempted) {
      return;
    }

    const storedUsername = localStorage.getItem("user-name") || localStorage.getItem("username") || "";
    const storedPassword = localStorage.getItem("user-pass") || localStorage.getItem("user_pass") || "";

    if (!storedUsername || !storedPassword) {
      setAutoLoginAttempted(true);
      return;
    }

    setAutoLoginAttempted(true);
    void (async () => {
      const result = await login(storedUsername, storedPassword);
      if (!result.success && result.error) {
        setError(result.error);
      }
    })();
  }, [autoLoginAttempted, isAuthenticated, loading, login]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.isSecureContext) {
      return;
    }

    void preloadFaceBiometrics().catch(() => undefined);
  }, []);

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
      setTimeout(() => navigate("/dashboard", { replace: true }), 800);
    } else {
      const errorMsg = result.error || "Invalid username or password";
      setError(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  const handlePasskeyLogin = async () => {
    setError("");
    try {
      const resp = await api.post("/api/auth/webauthn/login-options", { username: username.trim() });
      if (!resp.data.success) {
        throw new Error(resp.data.message || "Failed to get passkey options");
      }

      const { options, sessionId } = resp.data;

      let assertion;
      try {
        assertion = await startAuthentication(options);
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          return; // User cancelled
        }
        throw err;
      }

      const verifyResp = await api.post("/api/auth/webauthn/login-verify", {
        body: assertion,
        sessionId,
      });

      if (verifyResp.data.success) {
        const { user: userData, token } = verifyResp.data.data;
        if (setAuthData) {
          setAuthData(userData, token);
        }
        showToast(`Welcome back, ${userData?.username || username}!`, "success");
        setTimeout(() => navigate("/dashboard", { replace: true }), 800);
      } else {
        throw new Error(verifyResp.data.message || "Passkey login failed");
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.response?.data?.message || err.message || "Passkey authentication failed";
      setError(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  const handleFaceLogin = async () => {
    setError("");
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      const errorMsg = "Face login ke liye username ya employee ID enter karna zaroori hai.";
      setError(errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    const hasNavigator = typeof navigator !== "undefined";
    const hasSecureWindow = typeof window !== "undefined";
    const isSecureOrigin = !hasSecureWindow || window.isSecureContext;
    const supportsCameraApi = hasNavigator && Boolean(navigator.mediaDevices?.getUserMedia);

    if (!hasNavigator || !supportsCameraApi) {
      const errorMsg = !isSecureOrigin
        ? "Face login needs a secure HTTPS site or localhost. Mobile browser me HTTP/LAN IP par camera API available nahi hoti."
        : "This browser does not support camera access for face login.";
      setError(errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    setShowFaceModal(true);
    setIsLoggingInFace(true);
    setFaceStatus("Accessing webcam...");

    let activeStream: MediaStream | null = null;

    try {
      // 1. Get webcam stream
      activeStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      setStream(activeStream);

      const videoElement = videoRef.current;
      if (!videoElement) {
        throw new Error("Camera preview could not be initialized.");
      }

      videoElement.srcObject = activeStream;
      await new Promise((resolve) => setTimeout(resolve, 180));
      await videoElement.play().catch(() => undefined);

      // 2. Load face biometrics engine
      setFaceStatus("Initializing Face AI...");
      const faceapi = await preloadFaceBiometrics();

      setFaceStatus("Detecting face... Look at camera");
      const detectionOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 160,
        scoreThreshold: 0.45,
      });
      const maxAttempts = 8;
      const retryDelayMs = 120;

      // 3. Scan face descriptor
      let descriptor: number[] | null = null;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

        if (!activeStream || activeStream.getTracks().every(t => t.readyState === 'ended')) {
          break; // Stop if stream closed
        }

        if (videoElement.readyState >= 2) {
          const detection = await faceapi
            .detectSingleFace(videoElement, detectionOptions)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            descriptor = Array.from(detection.descriptor);
            break;
          }
        }
        setFaceStatus(`Scanning... Keep steady (${i + 1}/${maxAttempts})`);
      }

      if (!descriptor) {
        throw new Error("Face not detected. Please verify your camera feed and retry.");
      }

      setFaceStatus("Verifying face profile...");

      // 4. Send descriptor to backend to match & login
      const resp = await api.post("/api/auth/webauthn/login-face", {
        username: trimmedUsername,
        descriptor,
      });

      if (resp.data.success) {
        setFaceStatus("Face matched!");
        const { user: userData, token } = resp.data.data;
        if (setAuthData) {
          setAuthData(userData, token);
        }
        showToast(`Welcome back, ${userData?.username || trimmedUsername}!`, "success");
        setTimeout(() => navigate("/dashboard", { replace: true }), 800);
      } else {
        throw new Error(resp.data.message || "Face verification failed");
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = err?.response?.data?.message || err.message || "Face login failed";

      if (
        err.message?.includes("secure HTTPS site or localhost") ||
        err.message?.includes("camera API available")
      ) {
        errorMsg = err.message;
      } else
      if (err.name === "NotReadableError" || String(err).includes("NotReadableError") || String(err).includes("Device in use")) {
        errorMsg = "Camera is already in use by another application or browser tab. Please close other apps using the camera and try again.";
      } else if (err.name === "NotAllowedError" || String(err).includes("NotAllowedError") || String(err).includes("Permission denied")) {
        errorMsg = "Camera access was denied. Please allow camera permissions in your browser settings and try again.";
      } else if (err.name === "NotFoundError" || String(err).includes("NotFoundError") || String(err).includes("Requested device not found")) {
        errorMsg = "No webcam device was found. Please ensure a camera is connected and try again.";
      }

      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      setStream(null);
      setShowFaceModal(false);
      setIsLoggingInFace(false);
      setFaceStatus("");
    }
  };

  const closeFaceModal = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setShowFaceModal(false);
    setIsLoggingInFace(false);
    setFaceStatus("");
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

      <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-3 py-4 sm:min-h-screen sm:px-[clamp(0.875rem,3vw,2rem)] sm:py-[clamp(1rem,3vh,2rem)]">
        <div className="w-full max-w-[23.5rem] overflow-hidden rounded-[1.1rem] border border-white/70 bg-white/92 shadow-[0_18px_40px_rgba(15,23,42,0.1)] backdrop-blur-sm sm:max-w-[clamp(19rem,24vw,25rem)] sm:rounded-[clamp(1.1rem,1.4vw,1.5rem)] sm:bg-white/90 sm:shadow-[0_28px_64px_rgba(15,23,42,0.12)]">
          <div className="relative overflow-hidden px-3.5 pb-3.5 pt-3.5 sm:px-[clamp(0.8rem,1.2vw,1rem)] sm:pb-[clamp(0.8rem,1.2vw,1rem)] sm:pt-[clamp(0.8rem,1.2vw,1rem)]">
            <div className="absolute inset-x-0 top-0 h-[clamp(0.3rem,0.4vw,0.35rem)] bg-gradient-to-r from-[#ee1c23] via-[#f97316] to-[#fbbf24]" />
            <div className="absolute inset-x-0 top-0 h-[8rem] bg-[radial-gradient(circle_at_top,rgba(238,28,35,0.16),transparent_62%)] sm:h-[clamp(7.5rem,12vw,9rem)]" />

            <div className="relative rounded-[0.9rem] border border-[#ffd7ce] bg-[linear-gradient(180deg,#fff5f2_0%,#ffffff_100%)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:rounded-[clamp(0.9rem,1.2vw,1.25rem)] sm:p-[clamp(0.45rem,0.6vw,0.55rem)]">
              <div className="absolute -right-8 -top-8 h-14 w-14 rounded-full bg-[#ee1c23]/10 blur-[1.25rem] sm:-right-[clamp(1.8rem,2.5vw,2.2rem)] sm:-top-[clamp(1.8rem,2.5vw,2.2rem)] sm:h-[clamp(4rem,5vw,4.75rem)] sm:w-[clamp(4rem,5vw,4.75rem)] sm:blur-[clamp(1rem,1.6vw,1.3rem)]" />
              <div className="absolute -bottom-8 left-3 h-14 w-14 rounded-full bg-[#f97316]/10 blur-[1.25rem] sm:-bottom-[clamp(1.8rem,2.8vw,2.2rem)] sm:left-[clamp(0.6rem,1.2vw,0.9rem)] sm:h-[clamp(3.5rem,4.2vw,4.2rem)] sm:w-[clamp(3.5rem,4.2vw,4.2rem)] sm:blur-[clamp(1rem,1.6vw,1.3rem)]" />

              <div className="relative flex flex-col items-center text-center">
                <div className="w-full overflow-hidden rounded-[0.8rem] border border-white/80 bg-white shadow-[0_12px_24px_rgba(238,28,35,0.08)] sm:rounded-[clamp(0.8rem,1vw,1rem)]">
                  <div className="aspect-[267/116] w-full p-[clamp(0.2rem,0.35vw,0.3rem)]">
                    <img
                      src={logo}
                      alt="Sagar TMT and Pipes"
                      className="block h-full w-full object-contain object-center"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-1.5 rounded-[0.9rem] border border-slate-200/80 bg-white p-2.5 shadow-[0_10px_20px_rgba(15,23,42,0.04)] sm:mt-2 sm:rounded-[clamp(0.9rem,1.2vw,1.25rem)] sm:p-[clamp(0.7rem,0.9vw,0.9rem)]">
              {/* Premium Tab Switcher */}
              <div className="relative mb-3 flex rounded-lg border border-slate-100 bg-slate-50/85 p-0.5 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setActiveTab("face");
                  }}
                  className={`flex-1 rounded-[0.55rem] py-1.5 text-[11px] font-bold transition-all duration-200 ${
                    activeTab === "face"
                      ? "bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    <Camera className="h-3 w-3" />
                    Face Lock
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setActiveTab("credentials");
                  }}
                  className={`flex-1 rounded-[0.55rem] py-1.5 text-[11px] font-bold transition-all duration-200 ${
                    activeTab === "credentials"
                      ? "bg-gradient-to-br from-[#ee1c23] to-[#f43f1f] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    <User className="h-3 w-3" />
                    ID & Password
                  </span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-[clamp(0.55rem,0.75vw,0.75rem)]">
                {activeTab === "credentials" ? (
                  <>
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
                          className="absolute right-[clamp(0.6rem,0.7vw,0.75rem)] top-1/2 flex h-[clamp(1.65rem,1.8vw,1.9rem)] w-[clamp(1.65rem,1.8vw,1.9rem)] -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
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
                      className="mt-[clamp(0.15rem,0.3vw,0.25rem)] h-[clamp(2.5rem,4.2vh,2.75rem)] w-full rounded-[clamp(0.65rem,0.8vw,0.8rem)] bg-gradient-to-r from-[#ee1c23] via-[#f43f1f] to-[#f97316] text-[clamp(0.88rem,0.92vw,0.98rem)] font-semibold text-white shadow-[0_12px_24px_rgba(238,28,35,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:from-[#d9181f] hover:via-[#e63615] hover:to-[#ea580c] hover:shadow-[0_16px_32px_rgba(238,28,35,0.22)]"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Signing in...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          Sign In
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5 sm:space-y-[clamp(0.35rem,0.55vw,0.5rem)]">
                      <Label htmlFor="face-username" className={labelClass}>
                        Username / Employee ID
                      </Label>
                      <div className="relative">
                        <span className={fieldIconWrapClass}>
                          <User className={fieldIconClass} />
                        </span>
                        <Input
                          id="face-username"
                          name="face-username"
                          type="text"
                          autoComplete="username"
                          placeholder="Enter your username or employee ID"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          disabled={loading || isLoggingInFace}
                          className={`${baseInputClass} ${inputPaddingLeftClass}`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center py-4 text-center select-none animate-[fadeIn_0.3s_ease-out]">
                      <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 shadow-[0_6px_18px_rgba(16,185,129,0.1)]">
                        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-10" />
                        <Camera className="h-7 w-7 animate-pulse" />
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
                      type="button"
                      onClick={handleFaceLogin}
                      disabled={loading || isLoggingInFace}
                      className="h-[clamp(2.55rem,4.2vh,2.8rem)] w-full rounded-[clamp(0.65rem,0.8vw,0.8rem)] bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 text-[clamp(0.88rem,0.92vw,0.98rem)] font-bold text-white shadow-[0_12px_24px_rgba(16,185,129,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-700 hover:to-emerald-600 hover:shadow-[0_16px_32px_rgba(16,185,129,0.22)]"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        {isLoggingInFace ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                        Scan & Login with Face Lock
                      </span>
                    </Button>
                  </>
                )}
              </form>

              <p className="mt-2.5 px-1 text-center text-[0.66rem] font-medium tracking-[0.03em] text-slate-400 sm:mt-3 sm:px-[clamp(0.2rem,0.5vw,0.4rem)] sm:text-[clamp(0.65rem,0.72vw,0.75rem)] sm:tracking-[clamp(0.03em,0.08vw,0.05em)]">
                Copyright {new Date().getFullYear()} Sagar TMT &amp; Pipes. Secure internal
                portal.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showFaceModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[1.8rem] border border-white/20 bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="text-center text-lg font-bold text-slate-800 dark:text-white">
              Scanning Face Lock
            </h3>
            <p className="mt-1 text-center text-xs text-slate-400 dark:text-slate-500">
              Hold steady and look directly into the camera.
            </p>

            <div className="relative mx-auto mt-6 flex h-48 w-48 items-center justify-center overflow-hidden rounded-full border-4 border-emerald-500 shadow-xl bg-slate-900">
              <div className="absolute inset-0 z-10 animate-[spin_4s_linear_infinite] rounded-full border-t-4 border-r-4 border-emerald-400 border-b-transparent border-l-transparent opacity-60" />
              <div className="absolute left-0 right-0 z-10 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-[bounce_3s_infinite]" />

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover scale-x-[-1]"
              />
            </div>

            <p className="mt-4 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
              {faceStatus || "Initializing camera..."}
            </p>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={closeFaceModal}
                className="rounded-xl bg-slate-100 px-5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
