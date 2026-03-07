"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useLocation } from "react-router"
import { CheckCircle2, X, Search, History, ArrowLeft, Edit, Save, Camera, AlertCircle } from "lucide-react"
import api from "../../config/api.js"
import { useAuth } from "../../context/AuthContext"

// Debounce hook for search optimization
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function HotCoilComponent() {
  const location = useLocation()
  const { user } = useAuth()
  const [pendingSMSData, setPendingSMSData] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [historyData, setHistoryData] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")
  const [popupMessage, setPopupMessage] = useState("")
  const [popupType, setPopupType] = useState("")
  const [showPopup, setShowPopup] = useState(false)
  const [prefillSMSCode, setPrefillSMSCode] = useState("")
  const [hasAutoOpened, setHasAutoOpened] = useState(false)

  // State for process form
  const [showProcessForm, setShowProcessForm] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)
  const [processFormData, setProcessFormData] = useState({
    submission_type: "Hot Coil",
    sms_short_code: "",
    size: "",
    // Add other form fields as needed
  })

  // Use centralized API
  const fetchPendingSMS = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/batchcode/sms-register')
      if (response.data?.success) {
        setPendingSMSData(response.data.data || [])
      }
    } catch (err) {
      console.error("Error fetching SMS data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/batchcode/hot-coil')
      if (response.data?.success) {
        setHistoryData(response.data.data || [])
      }
    } catch (err) {
      console.error("Error fetching history:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      setUsername(user.username || user.user_name || "")
      setUserRole(user.role || "user")
    }
    fetchPendingSMS()
  }, [user, fetchPendingSMS])

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm) return pendingSMSData
    return pendingSMSData.filter(item =>
      item.sms_short_code?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      item.size?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
  }, [pendingSMSData, debouncedSearchTerm])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await api.post('/api/batchcode/hot-coil', processFormData)
      if (response.data?.success) {
        setSuccessMessage("Hot Coil data submitted successfully!")
        setShowProcessForm(false)
        setProcessFormData({
          submission_type: "Hot Coil",
          sms_short_code: "",
          size: "",
        })
        fetchPendingSMS()
        fetchHistory()
      } else {
        setError(response.data?.message || "Failed to submit data")
      }
    } catch (err) {
      console.error("Error submitting data:", err)
      setError(err.response?.data?.message || err.message || "Failed to submit data")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-700">
          Hot Coil Management
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            <History className="h-4 w-4" />
            {showHistory ? "Hide History" : "Show History"}
          </button>
        </div>
      </div>

      {/* Search Section */}
      <div className="rounded-lg border border-red-200 shadow-md bg-white">
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200 p-4">
          <h3 className="text-gray-700 font-medium flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Hot Coil Data
          </h3>
        </div>
        <div className="p-4">
          <input
            type="text"
            placeholder="Search by SMS code or size..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-red-100 p-3 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-red-200 shadow-md bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-red-50 to-red-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">SMS Code</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Size</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      No data available
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => (
                    <tr key={index} className="hover:bg-red-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.sms_short_code || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.size || "-"}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => {
                            setSelectedRow(item)
                            setProcessFormData({
                              ...processFormData,
                              sms_short_code: item.sms_short_code || "",
                            })
                            setShowProcessForm(true)
                          }}
                          className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                        >
                          Process
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Process Form */}
      {showProcessForm && (
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-red-200">
              <h2 className="text-xl font-semibold text-gray-900">Process Hot Coil</h2>
              <button
                onClick={() => {
                  setShowProcessForm(false)
                  setSelectedRow(null)
                }}
                className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMS Short Code
                </label>
                <input
                  type="text"
                  value={processFormData.sms_short_code}
                  onChange={(e) => setProcessFormData({ ...processFormData, sms_short_code: e.target.value })}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size
                </label>
                <input
                  type="text"
                  value={processFormData.size}
                  onChange={(e) => setProcessFormData({ ...processFormData, size: e.target.value })}
                  className="w-full rounded-md border border-gray-300 p-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              {/* Add more form fields as needed */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowProcessForm(false)
                    setSelectedRow(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-green-100 border border-green-200 p-4 shadow-lg">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <p>{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}
