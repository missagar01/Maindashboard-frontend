"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"

const LoginPage = () => {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState({})
  const [toast, setToast] = useState({ show: false, message: "", type: "" })

  const showToast = (message, type) => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" })
    }, 3000)
  }

  const handleRequestVisit = async () => {
    setIsLoading((prev) => ({ ...prev, requestVisit: true }))
    try {
      await new Promise((r) => setTimeout(r, 500))
      navigate("/gatepass/request-visit")
      showToast("Redirecting to Request Visit...", "success")
    } catch {
      showToast("Navigation failed. Please try again.", "error")
    } finally {
      setIsLoading((prev) => ({ ...prev, requestVisit: false }))
    }
  }

  const handleCloseGatePass = async () => {
    setIsLoading((prev) => ({ ...prev, closeGatePass: true }))
    try {
      await new Promise((r) => setTimeout(r, 500))
      navigate("/gatepass/close-pass")
      showToast("Redirecting to Close Gate Pass...", "success")
    } catch {
      showToast("Navigation failed. Please try again.", "error")
    } finally {
      setIsLoading((prev) => ({ ...prev, closeGatePass: false }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md mx-auto">

        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50 rounded-xl sm:rounded-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-white px-4 py-2 text-center border-b border-gray-200/100">
            <div className="flex items-center justify-center">
              <img
                src="/logo.jpg"
                alt="Logo"
                className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] object-contain"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Visitor Request Form
              </h3>
              <p className="text-gray-500 text-xs">
                नोट- ये फॉर्म गेट स्टाफ या विजिटर के द्वारा भरा जाएगा
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">

              {/* Request Visit */}
              <button
                onClick={handleRequestVisit}
                disabled={isLoading.requestVisit}
                className="w-full flex items-center p-3 sm:p-4 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/60 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 hover:from-emerald-100/80 hover:to-teal-100/80 hover:border-emerald-300/60 hover:shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/90 rounded-md sm:rounded-lg mr-3 group-hover:bg-emerald-600/90 transition-colors flex-shrink-0">
                  <i className="fas fa-user-plus text-white text-sm sm:text-base"></i>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="text-sm sm:text-base font-medium text-gray-800">
                    {isLoading.requestVisit ? "Processing..." : "Request Visit"}
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    विज़िट का अनुरोध
                  </p>
                </div>
                {isLoading.requestVisit && (
                  <div className="ml-2">
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-emerald-500 border-t-transparent"></div>
                  </div>
                )}
              </button>

              {/* Close Gate Pass */}
              <button
                onClick={handleCloseGatePass}
                disabled={isLoading.closeGatePass}
                className="w-full flex items-center p-3 sm:p-4 bg-gradient-to-r from-amber-50/80 to-orange-50/80 border border-amber-200/60 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 hover:from-amber-100/80 hover:to-orange-100/80 hover:border-amber-300/60 hover:shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-amber-500/90 rounded-md sm:rounded-lg mr-3 group-hover:bg-amber-600/90 transition-colors flex-shrink-0">
                  <i className="fas fa-door-closed text-white text-sm sm:text-base"></i>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="text-sm sm:text-base font-medium text-gray-800">
                    {isLoading.closeGatePass ? "Processing..." : "Close Gate Pass"}
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">
                    गेट पास बंद करें
                  </p>
                </div>
                {isLoading.closeGatePass && (
                  <div className="ml-2">
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-amber-500 border-t-transparent"></div>
                  </div>
                )}
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast.show && (
        <div className="fixed top-3 right-3 left-3 mx-auto max-w-md z-50">
          <div
            className={`px-6 py-4 rounded-xl shadow-lg ${toast.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
              }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginPage
