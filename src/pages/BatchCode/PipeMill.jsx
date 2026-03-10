"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, ArrowLeft, Edit, Save, Camera, AlertCircle } from "lucide-react"
// @ts-ignore - JSX component
import * as batchcodeAPI from "../../api/batchcodeAPI";
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

function PipeMillPage() {
    const { user } = useAuth()
    const [pendingReCoilData, setPendingReCoilData] = useState([])
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
    const [successUniqueCode, setSuccessUniqueCode] = useState("")
    const [showImagePopup, setShowImagePopup] = useState(false)
    const [selectedImage, setSelectedImage] = useState("")

    // State for process form
    const [showProcessForm, setShowProcessForm] = useState(false)
    const [selectedRow, setSelectedRow] = useState(null)
    const [processFormData, setProcessFormData] = useState({
        recoiler_short_code: "",
        mill_number: "",
        section: "",
        item_type: "",
        size: "",
        thickness: "",
        shift: "",
        fitter_name: "",
        fitter_name_other: "",
        quality_supervisor: "",
        mill_incharge: "",
        forman_name: "",
        remarks: "",
        picture: null
    })

    // Debounced search term for better performance
    const debouncedSearchTerm = useDebounce(searchTerm, 300)

    // Auto-hide popup only for warnings (not for success - user must click OK)
    useEffect(() => {
        if (showPopup && popupType === "warning") {
            const timer = setTimeout(() => {
                setShowPopup(false)
                setPopupMessage("")
                setPopupType("")
            }, 2000)

            return () => clearTimeout(timer)
        }
    }, [showPopup, popupType])

    const handleClosePopup = () => {
        setShowPopup(false)
        setPopupMessage("")
        setPopupType("")
        setSuccessUniqueCode("")
    }

    const showPopupMessage = (message, type) => {
        setPopupMessage(message)
        setPopupType(type)
        setShowPopup(true)
    }

    useEffect(() => {
        const role = user?.role || user?.userType || ""
        const authUsername = user?.username || user?.user_name || ""
        setUserRole(role)
        setUsername(authUsername)
    }, [user])

    // Fetch pending ReCoil data (ReCoil records that don't have Pipe Mill entries)
    const fetchPendingReCoilData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            //console.log('ðŸ”„ Fetching pending ReCoil data for Pipe Mill...')

            // Fetch ReCoil data
            const reCoilResponse = await batchcodeAPI.getReCoilHistory()
            let reCoilData = [];

            // Handle different response structures
            if (Array.isArray(reCoilResponse.data)) {
                reCoilData = reCoilResponse.data;
            } else if (reCoilResponse.data && Array.isArray(reCoilResponse.data.data)) {
                reCoilData = reCoilResponse.data.data;
            } else if (reCoilResponse.data && reCoilResponse.data.success && Array.isArray(reCoilResponse.data.data)) {
                reCoilData = reCoilResponse.data.data;
            } else {
                reCoilData = [];
            }

            //console.log('âœ… ReCoil Data fetched:', reCoilData.length, 'records')

            // Fetch existing Pipe Mill entries to filter out already processed ReCoil records
            const pipeMillResponse = await batchcodeAPI.getPipeMillHistory()
            let existingEntries = [];

            // Handle different response structures for Pipe Mill data
            if (Array.isArray(pipeMillResponse.data)) {
                existingEntries = pipeMillResponse.data;
            } else if (pipeMillResponse.data && Array.isArray(pipeMillResponse.data.data)) {
                existingEntries = pipeMillResponse.data.data;
            } else if (pipeMillResponse.data && pipeMillResponse.data.success && Array.isArray(pipeMillResponse.data.data)) {
                existingEntries = pipeMillResponse.data.data;
            }

            //console.log('Pipe Mill Entries fetched:', existingEntries.length, 'records')

            // Get all ReCoil unique_codes that already have Pipe Mill entries
            // Match: ReCoil 'unique_code' = Pipe Mill 'recoiler_short_code'
            const processedUniqueCodes = new Set(
                existingEntries
                    .map(pipeMillEntry => pipeMillEntry.recoiler_short_code)
                    .filter(code => code && code.trim() !== "")
            )

            //console.log('âœ… Processed ReCoil Unique Codes:', Array.from(processedUniqueCodes))

            // Filter ReCoil data to only show records that don't have Pipe Mill entries
            const pendingData = reCoilData.filter(reCoilRecord => {
                const reCoilUniqueCode = reCoilRecord.unique_code

                if (!reCoilUniqueCode) {
                    //console.log('âš ï¸ ReCoil record missing unique_code:', reCoilRecord)
                    return false
                }

                // Check if this ReCoil unique_code exists in Pipe Mill's recoiler_short_code
                const isProcessed = processedUniqueCodes.has(reCoilUniqueCode)

                //console.log(`ðŸ“‹ ReCoil Record: ${reCoilUniqueCode} - Processed: ${isProcessed}`)

                return !isProcessed
            })

            //console.log('âœ… Final pending data:', pendingData.length, 'records')
            setPendingReCoilData(pendingData)
            setLoading(false)

        } catch (error) {
            console.error("âŒ Error fetching pending ReCoil data:", error)
            showPopupMessage("Error fetching pending ReCoil data! / à¤²à¤‚à¤¬à¤¿à¤¤ à¤°à¥€à¤•à¥‰à¤‡à¤² à¤¡à¥‡à¤Ÿà¤¾ à¤ªà¥à¤°à¤¾à¤ªà¥à¤¤ à¤•à¤°à¤¨à¥‡ à¤®à¥‡à¤‚ à¤¤à¥à¤°à¥à¤Ÿà¤¿!", "warning")
            setPendingReCoilData([])
            setLoading(false)
        }
    }, [])

    // Fetch Pipe Mill history data
    const fetchHistoryData = useCallback(async () => {
        try {
            setLoading(true)
            //console.log('ðŸ”„ Fetching Pipe Mill history data...')

            const response = await batchcodeAPI.getPipeMillHistory()
            //console.log('ðŸ“¦ Raw Pipe Mill API response:', response)
            //console.log('ðŸ“Š Response data:', response.data)

            let data = [];

            // Handle different response structures
            if (Array.isArray(response.data)) {
                data = response.data;
            } else if (response.data && Array.isArray(response.data.data)) {
                data = response.data.data;
            } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
                data = response.data.data;
            } else if (response.data && typeof response.data === 'object') {
                // If it's a single object, wrap it in array
                data = [response.data];
            } else {
                data = [];
            }

            //console.log('âœ… Processed Pipe Mill history data:', data)
            setHistoryData(data)
            setLoading(false)
        } catch (error) {
            console.error("âŒ Error fetching Pipe Mill history:", error)
            console.error("ðŸ”§ Error details:", error.response?.data)
            showPopupMessage("Error fetching Pipe Mill history! / à¤ªà¤¾à¤‡à¤ª à¤®à¤¿à¤² à¤‡à¤¤à¤¿à¤¹à¤¾à¤¸ à¤ªà¥à¤°à¤¾à¤ªà¥à¤¤ à¤•à¤°à¤¨à¥‡ à¤®à¥‡à¤‚ à¤¤à¥à¤°à¥à¤Ÿà¤¿!", "warning")
            setHistoryData([])
            setLoading(false)
        }
    }, [])

    // Handle process button click for pending ReCoil records
    const handleProcessClick = useCallback((reCoilRecord) => {
        setSelectedRow(reCoilRecord)

        // Use unique_code from ReCoil record
        const shortCode = reCoilRecord.unique_code

        // Pre-fill form with ReCoil data
        setProcessFormData({
            recoiler_short_code: shortCode,
            mill_number: "",
            section: "",
            item_type: "",
            size: reCoilRecord.size || "",
            thickness: "",
            shift: "",
            fitter_name: "",
            fitter_name_other: "",
            quality_supervisor: "",
            mill_incharge: "",
            forman_name: "",
            remarks: "",
            picture: null
        })
        setShowProcessForm(true)
    }, [])

    // Handle process form input changes
    const handleProcessFormChange = useCallback((field, value) => {
        setProcessFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }, [])

    // Handle picture upload
    const handlePictureUpload = useCallback((e) => {
        const file = e.target.files[0]
        if (file) {
            setProcessFormData(prev => ({
                ...prev,
                picture: file
            }))
        }
    }, [])

    // const API_BASE_URL = 'http://localhost:3005';

    const handleViewImage = useCallback(async (imageUrl) => {
        if (!imageUrl) {
            // console.log('âŒ No image URL provided');
            return;
        }

        let fullImageUrl = imageUrl;

        // Construct full URL
        if (!imageUrl.startsWith('http')) {
            fullImageUrl = imageUrl.startsWith('/')
                ? `http://localhost:3005${imageUrl}`
                : `http://localhost:3005/uploads/pipe-mill-pictures/${imageUrl}`;
        }

        // console.log('ðŸ–¼ï¸ Loading image from:', fullImageUrl);

        try {
            // Show loading state
            setSelectedImage("");
            setShowImagePopup(true);

            // Fetch image and convert to blob URL (bypasses CORS for display)
            const response = await fetch(fullImageUrl, {
                mode: 'cors',
                cache: 'no-cache'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            // console.log('âœ… Image loaded as blob URL:', blobUrl);
            setSelectedImage(blobUrl);

        } catch (error) {
            console.error('âŒ Error loading image:', error);
            showPopupMessage("Failed to load image / à¤šà¤¿à¤¤à¥à¤° à¤²à¥‹à¤¡ à¤•à¤°à¤¨à¥‡ à¤®à¥‡à¤‚ à¤µà¤¿à¤«à¤²", "warning");
            setShowImagePopup(false);
        }
    }, []);

    // Close image popup
    const handleCloseImagePopup = useCallback(() => {
        setShowImagePopup(false)
        setSelectedImage("")
    }, [])

    // Form validation
    const validateForm = () => {
        const requiredFields = [
            'recoiler_short_code', 'mill_number', 'item_type', 'size', 'thickness',
            'shift', 'fitter_name', 'quality_supervisor', 'mill_incharge', 'forman_name'
        ]

        for (let field of requiredFields) {
            if (!processFormData[field]) {
                showPopupMessage(`Please fill all required fields! / à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¸à¤­à¥€ à¤†à¤µà¤¶à¥à¤¯à¤• à¤«à¤¼à¥€à¤²à¥à¤¡à¥à¤¸ à¤­à¤°à¥‡à¤‚!`, "warning")
                return false
            }
        }

        // Handle "Other" fitter name
        if (processFormData.fitter_name === "Other" && !processFormData.fitter_name_other) {
            showPopupMessage("Please specify the fitter name! / à¤•à¥ƒà¤ªà¤¯à¤¾ à¤«à¤¿à¤Ÿà¤° à¤•à¤¾ à¤¨à¤¾à¤® à¤¨à¤¿à¤°à¥à¤¦à¤¿à¤·à¥à¤Ÿ à¤•à¤°à¥‡à¤‚!", "warning")
            return false
        }

        return true
    }

    // Handle process form submission
    const handleProcessSubmit = useCallback(async () => {
        if (!validateForm()) {
            return
        }

        setIsSubmitting(true)
        try {
            // Prepare form data
            const formData = new FormData()

            // Add all form fields
            Object.keys(processFormData).forEach(key => {
                if (key === 'picture') {
                    if (processFormData.picture) {
                        formData.append('picture', processFormData.picture)
                    }
                } else if (key === 'fitter_name_other' && processFormData.fitter_name !== 'Other') {
                    // Skip other field if not needed
                } else {
                    let value = processFormData[key]

                    // Handle "Other" fields
                    if (key === 'fitter_name' && value === 'Other' && processFormData.fitter_name_other) {
                        value = processFormData.fitter_name_other
                    }

                    if (value !== null && value !== undefined) {
                        formData.append(key, value)
                    }
                }
            })

            //console.log('ðŸ” Submitting Pipe Mill data for ReCoil:', processFormData.recoiler_short_code)

            const response = await batchcodeAPI.submitPipeMill(formData)

            if (response.data.success) {
                // Extract unique_code from response - try multiple possible locations
                const uniqueCode = response.data.data?.unique_code
                    || response.data?.data?.unique_code
                    || response.data?.unique_code
                    || processFormData.recoiler_short_code
                    || ""
                setSuccessUniqueCode(uniqueCode)
                showPopupMessage("Pipe Mill data submitted successfully! / à¤ªà¤¾à¤‡à¤ª à¤®à¤¿à¤² à¤¡à¥‡à¤Ÿà¤¾ à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤œà¤®à¤¾ à¤•à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾!", "success")
                setShowProcessForm(false)

                // Refresh BOTH tabs data to ensure consistency
                await Promise.all([
                    fetchHistoryData(),
                    fetchPendingReCoilData()
                ])

                //console.log('âœ… Both tabs refreshed after submission - record moved from Pending to History')
            }
        } catch (error) {
            console.error("Submission error details:", error.response?.data)
            showPopupMessage(
                error.response?.data?.message || "Submission failed. Check console for details. / à¤¸à¤¬à¤®à¤¿à¤¶à¤¨ à¤µà¤¿à¤«à¤²à¥¤ à¤µà¤¿à¤µà¤°à¤£ à¤•à¥‡ à¤²à¤¿à¤ à¤•à¤‚à¤¸à¥‹à¤² à¤œà¤¾à¤‚à¤šà¥‡à¤‚à¥¤",
                "warning"
            )
        } finally {
            setIsSubmitting(false)
        }
    }, [processFormData, fetchHistoryData, fetchPendingReCoilData])

    // Close process form
    const handleCloseProcessForm = useCallback(() => {
        setShowProcessForm(false)
        setSelectedRow(null)
        setProcessFormData({
            recoiler_short_code: "",
            mill_number: "",
            section: "",
            item_type: "",
            size: "",
            thickness: "",
            shift: "",
            fitter_name: "",
            fitter_name_other: "",
            quality_supervisor: "",
            mill_incharge: "",
            forman_name: "",
            remarks: "",
            picture: null
        })
    }, [])

    // Toggle between pending and history views
    const toggleView = useCallback(() => {
        setShowHistory(prev => !prev)
        setSearchTerm("") // Clear search when switching views
    }, [])

    // Fetch appropriate data when view changes
    useEffect(() => {
        if (showHistory) {
            fetchHistoryData()
        } else {
            fetchPendingReCoilData()
        }
    }, [showHistory, fetchHistoryData, fetchPendingReCoilData])

    // Filter data based on search term
    const filteredPendingData = useMemo(() => {
        if (!debouncedSearchTerm) return pendingReCoilData;

        return pendingReCoilData.filter(record => {
            const searchLower = debouncedSearchTerm.toLowerCase()
            return (
                formatIndianDateTime(record.createdAt).toLowerCase().includes(searchLower) ||
                String(record.unique_code || '').toLowerCase().includes(searchLower) ||
                String(record.size || '').toLowerCase().includes(searchLower) ||
                String(record.supervisor || '').toLowerCase().includes(searchLower) ||
                String(record.incharge || '').toLowerCase().includes(searchLower) ||
                String(record.contractor || '').toLowerCase().includes(searchLower) ||
                String(record.welder_name || '').toLowerCase().includes(searchLower) ||
                String(record.machine_number || '').toLowerCase().includes(searchLower)
            )
        })
    }, [pendingReCoilData, debouncedSearchTerm])

    const filteredHistoryData = useMemo(() => {
        if (!debouncedSearchTerm) return historyData;

        return historyData.filter(record => {
            const searchLower = debouncedSearchTerm.toLowerCase()
            return (
                formatIndianDateTime(record.createdAt).toLowerCase().includes(searchLower) ||
                String(record.recoiler_short_code || '').toLowerCase().includes(searchLower) ||
                String(record.mill_number || '').toLowerCase().includes(searchLower) ||
                String(record.section || '').toLowerCase().includes(searchLower) ||
                String(record.item_type || '').toLowerCase().includes(searchLower) ||
                String(record.size || '').toLowerCase().includes(searchLower) ||
                String(record.thickness || '').toLowerCase().includes(searchLower) ||
                String(record.shift || '').toLowerCase().includes(searchLower) ||
                String(record.fitter_name || '').toLowerCase().includes(searchLower) ||
                String(record.quality_supervisor || '').toLowerCase().includes(searchLower) ||
                String(record.mill_incharge || '').toLowerCase().includes(searchLower) ||
                String(record.forman_name || '').toLowerCase().includes(searchLower) ||
                String(record.remarks || '').toLowerCase().includes(searchLower)
            )
        })
    }, [historyData, debouncedSearchTerm])

    const formatIndianDateTime = (dateString) => {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }

            // Format to DD-MM-YYYY HH:MM:SS with proper padding
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const hour = date.getHours().toString().padStart(2, '0');
            const minute = date.getMinutes().toString().padStart(2, '0');
            const second = date.getSeconds().toString().padStart(2, '0');

            return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
        } catch (error) {
            console.error('Error formatting date:', error, 'Input:', dateString);
            return 'Invalid Date';
        }
    }

    return (
        <div>
            <div className="space-y-6">
                {/* Popup Modal */}
                {showPopup && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <div
                            className={`relative mx-4 p-6 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 pointer-events-auto ${popupType === "success"
                                ? 'bg-green-50 border-2 border-green-400'
                                : 'bg-yellow-50 border-2 border-yellow-400'
                                }`}
                        >
                            <div className="flex items-center justify-center mb-4">
                                {popupType === "success" ? (
                                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                                ) : (
                                    <AlertCircle className="h-12 w-12 text-yellow-500" />
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className={`text-lg font-semibold mb-2 ${popupType === "success" ? 'text-green-800' : 'text-yellow-800'
                                    }`}>
                                    {popupType === "success" ? "Success!" : "Warning!"}
                                </h3>
                                <p className={popupType === "success" ? 'text-green-700' : 'text-yellow-700'}>
                                    {popupMessage}
                                </p>
                                {popupType === "success" && successUniqueCode && (
                                    <p className="mt-2 text-green-700 font-semibold">
                                        Unique Code: <span className="font-bold">{successUniqueCode}</span>
                                    </p>
                                )}
                            </div>
                            {/* Progress bar for auto-dismiss - only for warnings */}
                            {popupType === "warning" && (
                                <div className="mt-4 w-full bg-gray-200 rounded-full h-1">
                                    <div
                                        className="h-1 rounded-full bg-yellow-500"
                                        style={{
                                            animation: 'shrink 2s linear forwards'
                                        }}
                                    />
                                </div>
                            )}
                            {/* OK Button */}
                            <div className="mt-4 flex justify-center">
                                <button
                                    onClick={handleClosePopup}
                                    className={`px-6 py-2 rounded-md font-medium transition-colors ${popupType === "success"
                                        ? 'bg-green-500 hover:bg-green-600 text-white'
                                        : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                        }`}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showImagePopup && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto">
                            <div className="bg-red-500 text-white p-4 flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Test Report Image / à¤Ÿà¥‡à¤¸à¥à¤Ÿ à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ à¤šà¤¿à¤¤à¥à¤°</h3>
                                <button
                                    onClick={handleCloseImagePopup}
                                    className="text-white hover:text-gray-200 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="p-4 flex items-center justify-center bg-gray-100 min-h-[400px] max-h-[70vh] overflow-auto">
                                {selectedImage ? (
                                    <img
                                        src={selectedImage}
                                        alt="Test Report"
                                        className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                                        onError={(e) => {
                                            console.error('âŒ Error displaying image:', selectedImage);
                                            // Show error state
                                            e.target.style.display = 'none';
                                        }}
                                        onLoad={() => console.log('âœ… Image displayed successfully')}
                                    />
                                ) : (
                                    <div className="text-center text-gray-500">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mb-4"></div>
                                        <p>Loading image... / à¤šà¤¿à¤¤à¥à¤° à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ...</p>
                                    </div>
                                )}
                            </div>

                            {/* <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end items-center">
                                {/* <span className="text-sm text-gray-600">
                                    Click outside or press ESC to close / à¤¬à¤‚à¤¦ à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤¬à¤¾à¤¹à¤° à¤•à¥à¤²à¤¿à¤• à¤•à¤°à¥‡à¤‚
                                </span>
                                <button
                                    onClick={handleCloseImagePopup}
                                    className=" px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                >
                                    Close
                                </button>
                            </div> */}
                        </div>
                    </div>
                )}


                {/* Header Section */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-red-500 leading-tight">
                            {showHistory ? "Pipe Mill History" : "Pipe Mill Processing"}
                        </h1>
                        <button
                            onClick={toggleView}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium flex-shrink-0"
                        >
                            {showHistory ? (
                                <>
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>Pending</span>
                                </>
                            ) : (
                                <>
                                    <History className="h-4 w-4" />
                                    <span>History</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {showProcessForm && (
                    <div className="mt-6">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200">
                            <div className="bg-red-500 text-white p-4 rounded-t-lg flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Submit Pipe Mill Data</h3>
                                <button onClick={handleCloseProcessForm} className="text-white hover:text-gray-200">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Recoiler Short Code - NON EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Recoiler Short Code / à¤°à¤¿à¤•à¥‹à¤‡à¤²à¤° à¤¶à¥‰à¤°à¥à¤Ÿ à¤•à¥‹à¤¡ <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.recoiler_short_code}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Auto-filled from ReCoil record</p>
                                    </div>

                                    {/* Machine Number - NON EDITABLE (if you have this field) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Machine Number / à¤®à¤¶à¥€à¤¨ à¤¨à¤‚à¤¬à¤° <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedRow?.machine_number || "N/A"}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Auto-filled from ReCoil record</p>
                                    </div>

                                    {/* Mill Number - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mill Number / à¤®à¤¿à¤² à¤¨à¤‚à¤¬à¤° <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.mill_number}
                                            onChange={(e) => handleProcessFormChange("mill_number", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            <option value="">Select Mill Number</option>
                                            <option value="PIPE MILL 01">PIPE MILL 01</option>
                                            <option value="PIPE MILL 02">PIPE MILL 02</option>
                                            <option value="PIPE MILL 03">PIPE MILL 03</option>
                                            <option value="PIPE MILL 04">PIPE MILL 04</option>
                                            <option value="PIPE MILL 05">PIPE MILL 05</option>
                                        </select>
                                    </div>

                                    {/* Section - EDITABLE */}
                                    {/* <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Section / à¤¸à¥‡à¤•à¥à¤¶à¤¨
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.section}
                                            onChange={(e) => handleProcessFormChange("section", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="Enter section"
                                        />
                                    </div> */}

                                    {/* Item Type - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Item Type / à¤†à¤‡à¤Ÿà¤® à¤ªà¥à¤°à¤•à¤¾à¤° <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.item_type}
                                            onChange={(e) => handleProcessFormChange("item_type", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            <option value="">Select Item Type</option>
                                            <option value="Square">Square</option>
                                            <option value="Round">Round</option>
                                            <option value="Rectangle">Rectangle</option>
                                        </select>
                                    </div>

                                    {/* Size - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Size / à¤†à¤•à¤¾à¤° <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.size}
                                            onChange={(e) => handleProcessFormChange("size", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            <option value="">Select Size</option>
                                            <option value='3/4" (25OD)'>3/4" (25OD)</option>
                                            <option value='1 1/2" (48OD)'>1 1/2" (48OD)</option>
                                            <option value='2" (60OD)'>2" (60OD)</option>
                                            <option value='1 1/4" (42OD)'>1 1/4" (42OD)</option>
                                            <option value='1" (32OD)'>1" (32OD)</option>
                                            <option value='3/4" (19X19)'>3/4" (19X19)</option>
                                            <option value='1" (25X25)'>1" (25X25)</option>
                                            <option value='1 1/2" (38X38)'>1 1/2" (38X38)</option>
                                            <option value='2" (47X47)'>2" (47X47)</option>
                                            <option value='2 1/2" (62X62)'>2 1/2" (62X62)</option>
                                            <option value='3" (72X72)'>3" (72X72)</option>
                                            <option value='1 1/2" (25X50)'>1 1/2" (25X50)</option>
                                            <option value='2" (37X56)'>2" (37X56)</option>
                                            <option value='2" (68X25)'>2" (68X25)</option>
                                            <option value='2 1/2" (80X40)'>2 1/2" (80X40)</option>
                                            <option value='3" (96X48)'>3" (96X48)</option>
                                        </select>
                                    </div>

                                    {/* Thickness - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Thickness / à¤®à¥‹à¤Ÿà¤¾à¤ˆ <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.thickness}
                                            onChange={(e) => handleProcessFormChange("thickness", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="e.g., 1.50mm"
                                            required
                                        />
                                    </div>

                                    {/* Shift - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Shift / à¤¶à¤¿à¤«à¥à¤Ÿ <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.shift}
                                            onChange={(e) => handleProcessFormChange("shift", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            <option value="">Select Shift</option>
                                            <option value="Day">Day</option>
                                            <option value="Night">Night</option>
                                        </select>
                                    </div>

                                    {/* Fitter Name - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Fitter Name / à¤«à¤¿à¤Ÿà¤° à¤¨à¤¾à¤® <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.fitter_name}
                                            onChange={(e) => handleProcessFormChange("fitter_name", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            <option value="">Select Fitter Name</option>
                                            <option value="Randhir Kumar">Randhir Kumar</option>
                                            <option value="Mukesh Kumar">Mukesh Kumar</option>
                                            <option value="Sunil Sharma">Sunil Sharma</option>
                                            <option value="Satya Prakash">Satya Prakash</option>
                                            <option value="Shivji Yadav">Shivji Yadav</option>
                                            <option value="Ratan Singh">Ratan Singh</option>
                                            <option value="Radhey Shyam">Radhey Shyam</option>
                                            <option value="Chandan Singh">Chandan Singh</option>
                                            <option value="Dinesh Thakur">Dinesh Thakur</option>
                                            <option value="MD Guddu Ali">MD Guddu Ali</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    {/* Fitter Name Other - EDITABLE */}
                                    {processFormData.fitter_name === "Other" && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Specify Other Fitter Name / à¤…à¤¨à¥à¤¯ à¤«à¤¿à¤Ÿà¤° à¤¨à¤¾à¤® à¤¨à¤¿à¤°à¥à¤¦à¤¿à¤·à¥à¤Ÿ à¤•à¤°à¥‡à¤‚ <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={processFormData.fitter_name_other}
                                                onChange={(e) => handleProcessFormChange("fitter_name_other", e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                                placeholder="Enter fitter name"
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* Quality Supervisor - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Quality Supervisor / à¤—à¥à¤£à¤µà¤¤à¥à¤¤à¤¾ à¤ªà¤°à¥à¤¯à¤µà¥‡à¤•à¥à¤·à¤• <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.quality_supervisor}
                                            onChange={(e) => handleProcessFormChange("quality_supervisor", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            <option value="">Select Quality Supervisor</option>
                                            <option value="Birendra Kumar Singh">Birendra Kumar Singh</option>
                                            <option value="Sandeep Gupta">Sandeep Gupta</option>
                                            <option value="Jitendra Diwakar">Jitendra Diwakar</option>
                                            <option value="Rohan Kumar">Rohan Kumar</option>
                                            <option value="Lallu Kumar">Lallu Kumar</option>
                                            <option value="Dharmendra Kushwaha">Dharmendra Kushwaha</option>
                                            <option value="Ashish Parida">Ashish Parida</option>
                                            <option value="Ajay Gupta">Ajay Gupta</option>
                                            <option value="Lekh Singh Patle">Lekh Singh Patle</option>
                                        </select>
                                    </div>

                                    {/* Mill Incharge - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mill Incharge / à¤®à¤¿à¤² à¤‡à¤‚à¤šà¤¾à¤°à¥à¤œ <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.mill_incharge}
                                            onChange={(e) => handleProcessFormChange("mill_incharge", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            <option value="">Select Mill Incharge</option>
                                            <option value="Ravi Singh">Ravi Singh</option>
                                            <option value="G Mohan Rao">G Mohan Rao</option>
                                        </select>
                                    </div>

                                    {/* Forman Name - EDITABLE */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Forman Name / à¤«à¥‹à¤°à¤®à¥ˆà¤¨ à¤¨à¤¾à¤® <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={processFormData.forman_name}
                                            onChange={(e) => handleProcessFormChange("forman_name", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            required
                                        >
                                            <option value="">Select Forman Name</option>
                                            <option value="Hullash Paswan">Hullash Paswan</option>
                                            <option value="Montu Aanand Ghosh">Montu Aanand Ghosh</option>
                                        </select>
                                    </div>

                                    {/* Picture - EDITABLE */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Picture / à¤¤à¤¸à¥à¤µà¥€à¤°
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePictureUpload}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            />
                                            {processFormData.picture && (
                                                <Camera className="h-5 w-5 text-green-500" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Remarks - EDITABLE */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Remarks / à¤Ÿà¤¿à¤ªà¥à¤ªà¤£à¤¿à¤¯à¤¾à¤
                                        </label>
                                        <textarea
                                            value={processFormData.remarks}
                                            onChange={(e) => handleProcessFormChange("remarks", e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="Enter any remarks / à¤•à¥‹à¤ˆ à¤Ÿà¤¿à¤ªà¥à¤ªà¤£à¥€ à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
                                <button
                                    onClick={handleCloseProcessForm}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                                >
                                    Cancel / à¤°à¤¦à¥à¤¦ à¤•à¤°à¥‡à¤‚
                                </button>
                                <button
                                    onClick={handleProcessSubmit}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {isSubmitting ? "Submitting... / à¤œà¤®à¤¾ à¤•à¤¿à¤¯à¤¾ à¤œà¤¾ à¤°à¤¹à¤¾ à¤¹à¥ˆ..." : "Submit Data / à¤¡à¥‡à¤Ÿà¤¾ à¤œà¤®à¤¾ à¤•à¤°à¥‡à¤‚"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="rounded-lg border border-gray-200 shadow-md bg-white overflow-hidden">
                    <div className="bg-gradient-to-r from-red-500 to-red-400 p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-white text-base sm:text-lg font-semibold">
                                {showHistory ? "Pipe Mill Records" : "Pending for Pipe Mill Processing"}
                            </h2>
                            <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {showHistory ? filteredHistoryData.length : filteredPendingData.length}
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-10">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mb-4"></div>
                            <p className="text-red-600">Loading data...</p>
                        </div>
                    ) : showHistory ? (
                        filteredHistoryData.length > 0 ? (
                            <>
                                {/* Mobile card view */}
                                <div className="md:hidden divide-y divide-gray-100">
                                    {filteredHistoryData.map((record, index) => (
                                        <div key={record.id || record._id || index} className="p-4 space-y-2">
                                            <div className="flex justify-between items-start flex-wrap gap-1">
                                                <span className="text-xs text-gray-500">{formatIndianDateTime(record.created_at || 'N/A')}</span>
                                                <div className="flex gap-1 flex-wrap">
                                                    <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{record.recoiler_short_code || 'N/A'}</span>
                                                    <span className="text-xs font-mono bg-red-50 text-red-700 px-2 py-0.5 rounded">{record.unique_code || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
                                                <span><span className="text-gray-400 text-xs">Mill: </span>{record.mill_number || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Type: </span>{record.item_type || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Size: </span>{record.size || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Thick: </span>{record.thickness || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Shift: </span>{record.shift || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Fitter: </span>{record.fitter_name || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">QA: </span>{record.quality_supervisor || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Forman: </span>{record.forman_name || 'N/A'}</span>
                                            </div>
                                            {record.remarks && <p className="text-xs text-gray-500 italic">{record.remarks}</p>}
                                            {record.picture && (
                                                <button onClick={() => handleViewImage(record.picture)} className="text-blue-600 text-xs flex items-center gap-1">
                                                    <Camera className="h-3 w-3" /> View Picture
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {/* Desktop table view */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recoiler Code</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pipe Mill Code</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mill No.</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Type</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thickness</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fitter</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">QA Supervisor</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mill Incharge</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forman</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Picture</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredHistoryData.map((record, index) => (
                                                <tr key={record.id || record._id || index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatIndianDateTime(record.created_at || 'N/A')}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.recoiler_short_code || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.unique_code || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.mill_number || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.item_type || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.size || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.thickness || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.shift || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.fitter_name || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.quality_supervisor || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.mill_incharge || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.forman_name || 'N/A'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">{record.remarks || 'â€”'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                        {record.picture ? (
                                                            <button onClick={() => handleViewImage(record.picture)} className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                                                <Camera className="h-4 w-4" /> View
                                                            </button>
                                                        ) : <span className="text-gray-400">â€”</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="py-12 text-center text-gray-500">
                                <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                <p className="font-medium">{searchTerm ? "No matching Pipe Mill records found" : "No Pipe Mill records found"}</p>
                                <p className="text-sm mt-1">{searchTerm ? "Try adjusting your search" : "Submit a Pipe Mill entry first"}</p>
                                <div className="flex gap-2 justify-center mt-3">
                                    {searchTerm && <button onClick={() => setSearchTerm("")} className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm">Clear Search</button>}
                                    <button onClick={fetchHistoryData} className="px-4 py-2 bg-green-500 text-white rounded-md text-sm">Refresh</button>
                                </div>
                            </div>
                        )
                    ) : (
                        /* PENDING VIEW */
                        filteredPendingData.length > 0 ? (
                            <>
                                {/* Mobile cards */}
                                <div className="md:hidden divide-y divide-gray-100">
                                    {filteredPendingData.map((record, index) => (
                                        <div key={record.id || record._id || index} className="p-4 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{record.unique_code || 'N/A'}</span>
                                                <button
                                                    onClick={() => handleProcessClick(record)}
                                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1"
                                                >
                                                    <Edit className="h-3 w-3" /> Process
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500">{formatIndianDateTime(record.created_at || 'N/A')}</p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
                                                <span><span className="text-gray-400 text-xs">Size: </span>{record.size || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Machine: </span>{record.machine_number || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Supervisor: </span>{record.supervisor || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Incharge: </span>{record.incharge || 'N/A'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Desktop table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ReCoil Code</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supervisor</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incharge</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine No.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredPendingData.map((record, index) => (
                                                <tr key={record.id || record._id || index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <button onClick={() => handleProcessClick(record)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm flex items-center gap-1">
                                                            <Edit className="h-3 w-3" /> Process
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatIndianDateTime(record.created_at || 'N/A')}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.unique_code || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.size || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.supervisor || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.incharge || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.machine_number || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="py-12 text-center text-gray-500 px-4">
                                <CheckCircle2 className="h-10 w-10 text-green-300 mx-auto mb-3" />
                                <p className="font-medium">{searchTerm ? "No matching pending records" : "No pending ReCoil records"}</p>
                                <p className="text-sm mt-1">{searchTerm ? "Try adjusting your search" : "All ReCoil records have been processed"}</p>
                                <div className="flex gap-2 justify-center mt-3">
                                    {searchTerm && <button onClick={() => setSearchTerm("")} className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm">Clear Search</button>}
                                    <button onClick={fetchPendingReCoilData} className="px-4 py-2 bg-green-500 text-white rounded-md text-sm">Refresh</button>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Add CSS for progress bar animation */}
            <style>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    )
}

export default PipeMillPage

