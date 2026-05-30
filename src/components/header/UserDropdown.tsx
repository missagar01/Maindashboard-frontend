import { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, Settings, Fingerprint, Loader2, Camera } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { startRegistration } from "@simplewebauthn/browser";
import api from "../../config/api.js";
import { createPortal } from "react-dom";

interface UserDropdownProps {
  variant?: "avatar" | "settings" | "mobile-drawer";
}

export default function UserDropdown({ variant = "avatar" }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegisteringFace, setIsRegisteringFace] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceStatus, setFaceStatus] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user, logout } = useAuth();

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 2000);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const handleRegisterPasskey = async () => {
    setIsRegistering(true);
    try {
      const resp = await api.get("/api/auth/webauthn/register-options");
      if (!resp.data.success) {
        throw new Error(resp.data.message || "Failed to get registration options");
      }

      const { options } = resp.data;

      let attestation;
      try {
        attestation = await startRegistration(options);
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          return; // User cancelled
        }
        throw err;
      }

      const verifyResp = await api.post("/api/auth/webauthn/register-verify", attestation);

      if (verifyResp.data.success) {
        showToast("Passkey registered successfully!", "success");
      } else {
        throw new Error(verifyResp.data.message || "Passkey registration failed");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.response?.data?.message || err.message || "Passkey registration failed", "error");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegisterFace = async () => {
    setIsOpen(false);
    setShowFaceModal(true);
    setIsRegisteringFace(true);
    setFaceStatus("Accessing webcam...");

    let activeStream: MediaStream | null = null;

    try {
      // 1. Get webcam access
      activeStream = await navigator.mediaDevices.getUserMedia({
        video: true
      });
      setStream(activeStream);

      // Small timeout to allow element to render and bind srcObject
      setTimeout(() => {
        if (videoRef.current && activeStream) {
          videoRef.current.srcObject = activeStream;
        }
      }, 100);

      // 2. Load face-api.js from CDN
      setFaceStatus("Initializing Face AI...");
      const { loadFaceApi, loadModels } = await import("../../utils/faceApi.js");
      const faceapi = await loadFaceApi();
      await loadModels(faceapi);

      setFaceStatus("Detecting face... Look at camera");

      // 3. Scan face descriptor (retry up to 30 times)
      let descriptor: number[] | null = null;
      for (let i = 0; i < 30; i++) {
        // Wait 300ms between attempts
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (!activeStream || activeStream.getTracks().every(t => t.readyState === 'ended')) {
          break; // Stop if stream closed
        }

        if (videoRef.current && videoRef.current.readyState >= 2) {
          const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            descriptor = Array.from(detection.descriptor);
            break;
          }
        }
        setFaceStatus(`Scanning... Keep steady (${i + 1}/30)`);
      }

      if (!descriptor) {
        throw new Error("Face not detected. Please verify your camera feed and retry.");
      }

      setFaceStatus("Encrypting & saving face profile...");

      // 4. Save descriptor in user_passkeys
      const resp = await api.post("/api/auth/webauthn/register-face", { descriptor });
      if (resp.data.success) {
        setFaceStatus("Face registered successfully!");
        showToast("Face registered successfully!", "success");
      } else {
        throw new Error(resp.data.message || "Failed to save face");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Face registration failed", "error");
    } finally {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      setStream(null);
      setShowFaceModal(false);
      setIsRegisteringFace(false);
      setFaceStatus("");
    }
  };

  const closeFaceModal = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setShowFaceModal(false);
    setIsRegisteringFace(false);
    setFaceStatus("");
  };

  return (
    <div className={variant === "mobile-drawer" ? "w-full" : "relative z-[1070]"} ref={dropdownRef}>
      {variant === "mobile-drawer" ? (
        <button
          type="button"
          onClick={handleRegisterFace}
          disabled={isRegisteringFace || isRegistering}
          className="flex w-full items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-[13px] font-semibold text-emerald-600 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
        >
          {isRegisteringFace ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-4 w-4" />}
          {isRegisteringFace ? "Processing..." : "Register Face Lock"}
        </button>
      ) : variant === "settings" ? (
        <button
          onClick={() => setIsOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#374151] text-white shadow-sm transition hover:bg-[#1f2937]"
          aria-label="Open user menu"
        >
          <Settings className="h-5 w-5" />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen((open) => !open)}
          className="flex items-center text-gray-700 dark:text-gray-400"
        >
          <span className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
            {user?.username ? (
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                {user.username.charAt(0).toUpperCase()}
              </span>
            ) : (
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">U</span>
            )}
          </span>
          <span className="mr-1 block font-medium text-theme-sm">
            {user?.username || user?.user_name || "User"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {variant !== "mobile-drawer" && isOpen && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[1080] w-56 rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-700 shadow-[0_20px_45px_rgba(15,23,42,0.16)] dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
          <p className="font-semibold">{user?.username || user?.user_name || "User"}</p>
          <p className="mb-3 text-xs text-gray-500">
            {user?.email_id || user?.role || "No email"}
          </p>
          <div className="space-y-2">
            <button
              onClick={handleRegisterFace}
              disabled={isRegisteringFace || isRegistering}
              className="flex w-full items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-600 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
            >
              {isRegisteringFace ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {isRegisteringFace ? "Processing..." : "Register Face Lock"}
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      )}

      {showFaceModal && createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[1.8rem] border border-white/20 bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="text-center text-lg font-bold text-slate-800 dark:text-white">
              Register Face Lock
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
        </div>,
        document.body
      )}
      {toast.show && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none p-4">
          <div
            className={`flex flex-col items-center justify-center text-center max-w-sm rounded-[1.8rem] border bg-white/95 px-8 py-6 shadow-[0_24px_50px_rgba(15,23,42,0.22)] backdrop-blur transition-all duration-300 transform scale-100 ${toast.type === "success"
              ? "border-emerald-100 text-emerald-800 shadow-emerald-100/10"
              : "border-red-100 text-red-800 shadow-red-100/10"
              }`}
          >
            <div className={`mb-3.5 flex h-12 w-12 items-center justify-center rounded-full ${toast.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              }`}>
              {toast.type === "success" ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <p className="text-[15px] font-black tracking-tight leading-snug">{toast.message}</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
