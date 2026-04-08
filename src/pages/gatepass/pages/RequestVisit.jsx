import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  Clock,
  UserCheck,
  SwitchCamera,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  XCircle
} from "lucide-react";
import { createVisitRequestApi, fetchVisitorByMobileApi } from "../../../api/gatepass/requestApi";
import { fetchPersonsApi } from "../../../api/gatepass/personApi";

const MAX_VISITOR_PHOTO_DIMENSION = 1280;
const TARGET_VISITOR_PHOTO_SIZE_BYTES = 900 * 1024;
const DEFAULT_JPEG_QUALITY = 0.82;
const MIN_JPEG_QUALITY = 0.55;

const getScaledDimensions = (width, height) => {
  const longestSide = Math.max(width, height);

  if (!longestSide || longestSide <= MAX_VISITOR_PHOTO_DIMENSION) {
    return { width, height };
  }

  const scale = MAX_VISITOR_PHOTO_DIMENSION / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image conversion failed"));
          return;
        }

        resolve(blob);
      },
      type,
      quality
    );
  });

const optimizeCanvasToVisitorFile = async (sourceCanvas, fileName) => {
  const { width, height } = getScaledDimensions(
    sourceCanvas.width,
    sourceCanvas.height
  );
  const optimizedCanvas = document.createElement("canvas");
  optimizedCanvas.width = width;
  optimizedCanvas.height = height;

  const context = optimizedCanvas.getContext("2d");
  if (!context) {
    throw new Error("Image processing is not supported on this browser");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(sourceCanvas, 0, 0, width, height);

  let quality = DEFAULT_JPEG_QUALITY;
  let blob = await canvasToBlob(optimizedCanvas, "image/jpeg", quality);

  while (
    blob.size > TARGET_VISITOR_PHOTO_SIZE_BYTES &&
    quality > MIN_JPEG_QUALITY
  ) {
    quality = Number(Math.max(MIN_JPEG_QUALITY, quality - 0.08).toFixed(2));
    blob = await canvasToBlob(optimizedCanvas, "image/jpeg", quality);
  }

  const safeBaseName = String(fileName || `visitor_${Date.now()}`)
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w-]+/g, "_");

  return new File([blob], `${safeBaseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
};

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Selected image could not be processed"));
    };

    image.src = objectUrl;
  });

const optimizeSelectedImageFile = async (file) => {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image processing is not supported on this browser");
  }

  context.drawImage(image, 0, 0, width, height);
  return optimizeCanvasToVisitorFile(canvas, file.name);
};

const getRequestErrorMessage = (error) => {
  const status = error?.response?.status;
  const responseMessage =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message;

  if (status === 413) {
    return "Photo is too large. Please retake it or use a smaller image.";
  }

  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }

  return "Submission failed";
};

const AssignTask = () => {
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [personToMeetOptions, setPersonToMeetOptions] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [photoSourceLabel, setPhotoSourceLabel] = useState("Captured");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const streamRef = useRef(null);

  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [currentFacingMode, setCurrentFacingMode] = useState("environment");
  const [stream, setStream] = useState(null);
  const canUseLiveCamera =
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const [formData, setFormData] = useState({
    visitorName: "",
    mobileNumber: "",
    email: "",
    visitorAddress: "",
    purposeOfVisit: "",
    personToMeet: "",
    dateOfVisit: "",
    timeOfEntry: "",
  });

  const applySelectedPhoto = (file, source) => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto);
    }

    setPhotoFile(file);
    setCapturedPhoto(URL.createObjectURL(file));
    setPhotoSourceLabel(source);
    setCameraError("");
  };

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    const now = new Date();
    setFormData((prev) => ({
      ...prev,
      dateOfVisit: now.toISOString().split("T")[0],
      timeOfEntry: now.toTimeString().slice(0, 5),
    }));

    fetchPersonToMeetOptions();

    return () => {
      stopStream(streamRef.current);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeCamera = async () => {
      if (!canUseLiveCamera) {
        if (isMounted) {
          setCameraError(
            typeof window !== "undefined" && !window.isSecureContext
              ? "Live camera preview needs HTTPS. Start Camera will use your phone camera."
              : "Live camera preview is unavailable. Use Start Camera or Upload Photo."
          );
        }
        return;
      }

      try {
        if (!navigator.permissions?.query) {
          return;
        }

        const permissionStatus = await navigator.permissions.query({ name: "camera" });
        if (!isMounted) {
          return;
        }

        if (permissionStatus.state === "granted") {
          openCamera("environment");
        } else if (permissionStatus.state === "denied") {
          setCameraError("Camera blocked. Allow camera permission or use Upload Photo.");
        }
      } catch {
        // Permission API is not available on all mobile browsers.
      }
    };

    initializeCamera();

    return () => {
      isMounted = false;
    };
  }, [canUseLiveCamera]);

  const stopStream = (activeStream) => {
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
    }
  };

  const getCameraErrorMessage = (error) => {
    const errorName = error?.name || "";

    if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
      return "Camera permission denied. Allow permission or use Upload Photo.";
    }

    if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
      return "No camera device found";
    }

    if (errorName === "NotReadableError" || errorName === "TrackStartError") {
      return "Camera is already in use";
    }

    return "Camera access failed";
  };

  const triggerNativeCamera = () => {
    setCameraError("");
    cameraInputRef.current?.click();
  };

  const triggerGalleryPicker = () => {
    setCameraError("");
    galleryInputRef.current?.click();
  };

  const fetchPersonToMeetOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const data = await fetchPersonsApi();
      setPersonToMeetOptions(Array.isArray(data) ? data : data?.data || []);
    } catch {
      showToast("Failed to load persons", "error");
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const openCamera = async (facingMode) => {
    if (!canUseLiveCamera) {
      triggerNativeCamera();
      return;
    }

    let nextStream = null;
    setIsOpeningCamera(true);
    setCameraError("");

    try {
      stopStream(stream);

      nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: { ideal: facingMode },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = nextStream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play().catch(() => { });
      }
      setStream(nextStream);
      setCurrentFacingMode(facingMode);
      setIsOpeningCamera(false);
      return;
    } catch (primaryError) {
      try {
        nextStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = nextStream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play().catch(() => { });
        }
        setStream(nextStream);
        setCurrentFacingMode(facingMode);
        setIsOpeningCamera(false);
        return;
      } catch (fallbackError) {
        stopStream(nextStream);
        setStream(null);
        const message = getCameraErrorMessage(fallbackError || primaryError);
        setCameraError(message);
        showToast(message, "error");
        if (
          (fallbackError?.name || primaryError?.name) === "NotAllowedError" ||
          (fallbackError?.name || primaryError?.name) === "PermissionDeniedError"
        ) {
          triggerNativeCamera();
        }
      } finally {
        setIsOpeningCamera(false);
      }
    }

    setIsOpeningCamera(false);
  };

  const switchCamera = async () => {
    if (!stream) {
      openCamera(currentFacingMode);
      return;
    }

    const next = currentFacingMode === "user" ? "environment" : "user";
    await openCamera(next);
  };

  const handlePrimaryCameraAction = () => {
    if (stream) {
      capturePhoto();
      return;
    }

    if (canUseLiveCamera) {
      openCamera(currentFacingMode);
      return;
    }

    triggerNativeCamera();
  };

  const closeCamera = () => {
    stopStream(stream);
    if (videoRef.current) { 
      videoRef.current.srcObject = null;
    }
    setStream(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      showToast("Start camera first or use Upload Photo", "error");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight || !ctx) {
      showToast("Camera preview not ready", "error");
      return;
    }

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          showToast("Photo capture failed", "error");
          return;
        }

        try {
          const file = await optimizeCanvasToVisitorFile(
            canvas,
            `visitor_${Date.now()}.jpg`
          );

          applySelectedPhoto(file, "Captured");
          closeCamera();
          showToast("Photo captured!", "success");
        } catch (error) {
          showToast(
            error?.message || "Photo capture failed",
            "error"
          );
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const handleFileSelect = async (event, source = "Selected") => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file", "error");
      event.target.value = "";
      return;
    }

    try {
      const optimizedFile = await optimizeSelectedImageFile(file);

      closeCamera();
      applySelectedPhoto(optimizedFile, source);
      showToast(
        source === "Captured"
          ? "Photo captured!"
          : "Photo selected from gallery!",
        "success"
      );
    } catch (error) {
      showToast(
        error?.message || "Selected image could not be processed",
        "error"
      );
    } finally {
      event.target.value = "";
    }
  };

  const clearSelectedPhoto = () => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto);
    }
    setCapturedPhoto(null);
    setPhotoFile(null);
    setPhotoSourceLabel("Captured");
    setCameraError("");
  };

  const retakePhoto = () => {
    const shouldReopenCamera = photoSourceLabel === "Captured";
    clearSelectedPhoto();
    if (shouldReopenCamera) {
      if (canUseLiveCamera) {
        openCamera(currentFacingMode);
      } else {
        triggerNativeCamera();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (capturedPhoto) {
        URL.revokeObjectURL(capturedPhoto);
      }
    };
  }, [capturedPhoto]);

  const handleChange = async (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "mobileNumber" && value.length === 10) {
      try {
        const res = await fetchVisitorByMobileApi(value);

        if (res.data?.found) {
          setFormData((prev) => ({
            ...prev,
            visitorName: res.data.data.visitorName || "",
            mobileNumber: res.data.data.mobileNumber || value,
            visitorAddress: res.data.data.visitorAddress || "",
            purposeOfVisit: res.data.data.purposeOfVisit || "",
            personToMeet: res.data.data.personToMeet || "",
          }));

          showToast("Visitor details auto-filled", "success");
        }
      } catch {
        // No previous visitor data found.
      }
    }
  };


  const validateForm = () => {
    const required = [
      "visitorName",
      "mobileNumber",
      "personToMeet",
      "dateOfVisit",
      "timeOfEntry",
    ];

    for (let f of required) {
      if (!formData[f]?.trim()) {
        showToast(`Please fill ${f}`, "error");
        return false;
      }
    }

    if (!/^[6-9]\d{9}$/.test(formData.mobileNumber)) {
      showToast("Enter valid 10-digit mobile number", "error");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await createVisitRequestApi({
        ...formData,
        photoFile,
      });

      showToast("Visitor registered successfully!", "success");
      setTimeout(() => navigate("/gatepass/approvals"), 1000);
    } catch (error) {
      showToast(getRequestErrorMessage(error), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Request Gate Pass</h1>
            <p className="text-gray-600 mt-1">Register a new visitor for entry</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit} noValidate className="divide-y divide-gray-100">
            {/* Form Content */}
            <div className="p-6 space-y-8">
              {/* Section: Visitor Identity */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-orange-600" />
                  </div>
                  <h2 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Visitor Identity</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Visitor Name*</label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                      <input
                        type="text"
                        name="visitorName"
                        value={formData.visitorName}
                        onChange={handleChange}
                        required
                        placeholder="Full Name"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Mobile Number*</label>
                    <div className="relative group">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                      <input
                        type="tel"
                        name="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        placeholder="10-digit number"
                        maxLength="10"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Optional"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Visitor Address</label>
                  <div className="relative group">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      type="text"
                      name="visitorAddress"
                      value={formData.visitorAddress}
                      onChange={handleChange}
                      placeholder="City/Area"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Visit Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <h2 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Visit Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Person to Meet*</label>
                    <div className="relative group">
                      <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <select
                        name="personToMeet"
                        value={formData.personToMeet}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 appearance-none"
                      >
                        <option value="">Select Department/Person</option>
                        {personToMeetOptions.map((person) => (
                          <option key={person.id} value={person.person_to_meet}>
                            {person.person_to_meet}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Purpose of Visit</label>
                    <div className="relative group">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        name="purposeOfVisit"
                        value={formData.purposeOfVisit}
                        onChange={handleChange}
                        placeholder="Reason for meeting"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Date</label>
                    <input
                      type="date"
                      name="dateOfVisit"
                      value={formData.dateOfVisit}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Time</label>
                    <input
                      type="time"
                      name="timeOfEntry"
                      value={formData.timeOfEntry}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Caption */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Camera className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h2 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Security Verification</h2>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  {!capturedPhoto ? (
                    <div className="flex flex-col items-center">
                      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-black shadow-2xl border-4 border-white mb-6 aspect-video">
                        {stream ? (
                          <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-white">
                            <Camera className="h-10 w-10 text-white/70" />
                            <p className="text-sm font-semibold">
                              {cameraError || "Tap Start Camera to enable live photo capture"}
                            </p>
                          </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                        {stream ? (
                          <button
                            type="button"
                            onClick={switchCamera}
                            className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white p-3 rounded-full transition-all"
                          >
                            <SwitchCamera className="h-5 w-5" />
                          </button>
                        ) : null}
                      </div>
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture={currentFacingMode}
                        onChange={(event) => handleFileSelect(event, "Captured")}
                        className="hidden"
                      />
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleFileSelect(event, "Selected")}
                        className="hidden"
                      />
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={handlePrimaryCameraAction}
                          disabled={isOpeningCamera}
                          className="bg-orange-500 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-200 transition-all transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Camera className="h-5 w-5" />
                          {isOpeningCamera
                            ? "Starting..."
                            : stream
                              ? "Take Photo"
                              : canUseLiveCamera
                                ? "Start Camera"
                                : "Open Camera"}
                        </button>
                        <button
                          type="button"
                          onClick={triggerGalleryPicker}
                          className="border border-slate-300 bg-white text-slate-700 px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-slate-50"
                        >
                          <FileText className="h-5 w-5" />
                          Upload From Gallery
                        </button>
                      </div>
                      <p className="mt-3 text-center text-sm text-slate-500">
                        Live camera, phone camera ya gallery, tino same visitor photo field me save honge.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div
                        className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-white shadow-2xl border-4 border-white mb-6 aspect-video cursor-pointer group"
                        onClick={() => setShowImageModal(true)}
                      >
                        <img src={capturedPhoto} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Captured" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:flex items-center justify-center pointer-events-none">
                          <Eye className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute top-4 right-4 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg z-10">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={retakePhoto}
                        className="text-orange-500 hover:text-orange-600 font-bold text-sm underline decoration-2 underline-offset-4"
                      >
                        {photoSourceLabel === "Captured" ? "Retake Photo" : "Change Photo"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="p-6 bg-gray-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-700 hover:bg-orange-500 text-white px-10 py-3 rounded-xl font-bold flex items-center gap-3 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Register
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-gray-800">{photoSourceLabel} Visitor Photo</h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <div className="p-4 flex justify-center">
              <img
                src={capturedPhoto}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-inner"
                alt="Enlarged captured"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 flex justify-center animate-in slide-in-from-bottom-5 fade-in">
          <div className={`max-w-sm px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === "success"
            ? "bg-emerald-500 border-emerald-400"
            : "bg-red-500 border-red-400"
            } text-white`}>
            {toast.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="font-bold text-sm tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default AssignTask;
