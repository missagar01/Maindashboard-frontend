"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, X, Search, History, ArrowLeft, Edit, Save, AlertCircle } from "lucide-react"
// @ts-ignore - JSX component
import * as batchcodeAPI from "../../api/batchcodeAPI";

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

function ReCoilPage() {
    const [pendingHotCoilData, setPendingHotCoilData] = useState([])
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

    // State for process form
    const [showProcessForm, setShowProcessForm] = useState(false)
    const [selectedRow, setSelectedRow] = useState(null)
    const [processFormData, setProcessFormData] = useState({
        unique_code: "",
        size: "",
        supervisor: "",
        supervisor_other: "",
        incharge: "",
        incharge_other: "",
        contractor: "",
        welder_name: "",
        welder_name_other: "",
        machine_number: ""
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
        const role = sessionStorage.getItem("role")
        const user = sessionStorage.getItem("username")
        setUserRole(role || "")
        setUsername(user || "")
    }, [])

    // Fetch pending Hot Coil data (Hot Coil records that don't have ReCoil entries)
    const fetchPendingHotCoilData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            ////console.log('🔄 Fetching pending Hot Coil data for ReCoil...')

            // Fetch Hot Coil data
            const hotCoilResponse = await batchcodeAPI.getHotCoilHistory()
            let hotCoilData = [];

            // Handle different response structures
            if (Array.isArray(hotCoilResponse.data)) {
                hotCoilData = hotCoilResponse.data;
            } else if (hotCoilResponse.data && Array.isArray(hotCoilResponse.data.data)) {
                hotCoilData = hotCoilResponse.data.data;
            } else if (hotCoilResponse.data && hotCoilResponse.data.success && Array.isArray(hotCoilResponse.data.data)) {
                hotCoilData = hotCoilResponse.data.data;
            } else {
                hotCoilData = [];
            }

            //console.log('✅ Hot Coil Data fetched:', hotCoilData.length, 'records')

            // Fetch existing ReCoil entries to filter out already processed Hot Coil records
            const reCoilResponse = await batchcodeAPI.getReCoilHistory()
            let existingEntries = [];

            // Handle different response structures for ReCoil data
            if (Array.isArray(reCoilResponse.data)) {
                existingEntries = reCoilResponse.data;
            } else if (reCoilResponse.data && Array.isArray(reCoilResponse.data.data)) {
                existingEntries = reCoilResponse.data.data;
            } else if (reCoilResponse.data && reCoilResponse.data.success && Array.isArray(reCoilResponse.data.data)) {
                existingEntries = reCoilResponse.data.data;
            }

            //console.log('ReCoil Entries fetched:', existingEntries.length, 'records')

            // Get all Hot Coil short codes that already have ReCoil entries
            const processedShortCodes = new Set(
                existingEntries
                    .map(reCoilEntry => reCoilEntry.hot_coiler_short_code)
                    .filter(code => code) // Remove null/undefined
            )

            //console.log('✅ Processed Hot Coil Short Codes:', Array.from(processedShortCodes))

            // Filter Hot Coil data to only show records that don't have ReCoil entries
            const pendingData = hotCoilData.filter(hotCoilRecord => {
                const hotCoilShortCode = hotCoilRecord.unique_code

                // Check if this Hot Coil short code exists in ReCoil entries
                const isProcessed = processedShortCodes.has(hotCoilShortCode)

                //console.log(`📋 Hot Coil Record: ${hotCoilShortCode} - Processed: ${isProcessed}`)

                return !isProcessed
            })

            //console.log('✅ Final pending data:', pendingData.length, 'records')
            setPendingHotCoilData(pendingData)
            setLoading(false)

        } catch (error) {
            console.error("❌ Error fetching pending Hot Coil data:", error)
            showPopupMessage("Error fetching pending Hot Coil data! / लंबित हॉट कॉइल डेटा प्राप्त करने में त्रुटि!", "warning")
            setPendingHotCoilData([])
            setLoading(false)
        }
    }, [])

    // Fetch ReCoil history data
    const fetchHistoryData = useCallback(async () => {
        try {
            setLoading(true)
            //console.log('🔄 Fetching ReCoil history data...')

            const response = await batchcodeAPI.getReCoilHistory()
            //console.log('📦 Raw ReCoil API response:', response)
            //console.log('📊 Response data:', response.data)

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

            //console.log('✅ Processed ReCoil history data:', data)
            setHistoryData(data)
            setLoading(false)
        } catch (error) {
            console.error("❌ Error fetching ReCoil history:", error)
            console.error("🔧 Error details:", error.response?.data)
            showPopupMessage("Error fetching ReCoil history! / रीकॉइल इतिहास प्राप्त करने में त्रुटि!", "warning")
            setHistoryData([]) // Set empty array on error
            setLoading(false)
        }
    }, [])

    // Handle process button click for pending Hot Coil records
    const handleProcessClick = useCallback((hotCoilRecord) => {
        setSelectedRow(hotCoilRecord)

        // Generate short code for Hot Coil record
        const shortCode = hotCoilRecord.unique_code

        // Pre-fill form with Hot Coil data
        setProcessFormData({
            unique_code: shortCode,
            size: hotCoilRecord.size || "",
            supervisor: "",
            supervisor_other: "",
            incharge: "",
            incharge_other: "",
            contractor: "",
            welder_name: "",
            welder_name_other: "",
            machine_number: ""
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

    // Form validation
    const validateForm = () => {
        const requiredFields = [
            'unique_code', 'size', 'supervisor', 'incharge',
            'contractor', 'welder_name', 'machine_number'
        ]

        for (let field of requiredFields) {
            if (!processFormData[field]) {
                showPopupMessage(`Please fill all required fields! / कृपया सभी आवश्यक फ़ील्ड्स भरें!`, "warning")
                return false
            }
        }

        // Handle "Other" fields
        if (processFormData.supervisor === "Other" && !processFormData.supervisor_other) {
            showPopupMessage("Please specify the supervisor name! / कृपया पर्यवेक्षक का नाम निर्दिष्ट करें!", "warning")
            return false
        }
        if (processFormData.incharge === "Other" && !processFormData.incharge_other) {
            showPopupMessage("Please specify the incharge name! / कृपया इंचार्ज का नाम निर्दिष्ट करें!", "warning")
            return false
        }
        if (processFormData.welder_name === "Other" && !processFormData.welder_name_other) {
            showPopupMessage("Please specify the welder name! / कृपया वेल्डर का नाम निर्दिष्ट करें!", "warning")
            return false
        }

        return true
    }

    const handleProcessSubmit = useCallback(async () => {
        if (!validateForm()) {
            return
        }

        setIsSubmitting(true)
        try {
            // Prepare submission data according to backend validation schema
            // Backend expects: sample_timestamp (auto-generated), hot_coiler_short_code, size, supervisor, incharge, contractor, machine_number, welder_name
            const submissionData = {
                hot_coiler_short_code: processFormData.unique_code, // Backend expects hot_coiler_short_code, not unique_code
                size: processFormData.size || null,
                supervisor: processFormData.supervisor === "Other"
                    ? processFormData.supervisor_other
                    : processFormData.supervisor,
                incharge: processFormData.incharge === "Other"
                    ? processFormData.incharge_other
                    : processFormData.incharge || null,
                contractor: processFormData.contractor || null,
                welder_name: processFormData.welder_name === "Other"
                    ? processFormData.welder_name_other
                    : processFormData.welder_name || null,
                machine_number: processFormData.machine_number // Can be string or array - backend will handle it
                // sample_timestamp will be auto-generated by backend if not provided
            }

            ////console.log('🔍 Submission data:', submissionData)

            const response = await batchcodeAPI.submitReCoil(submissionData)

            if (response.data.success) {
                // Extract unique_code from response - try multiple possible locations
                const uniqueCode = response.data.data?.unique_code
                    || response.data?.data?.unique_code
                    || response.data?.unique_code
                    || processFormData.unique_code
                    || ""
                setSuccessUniqueCode(uniqueCode)
                showPopupMessage("ReCoil data submitted successfully! / रीकॉइल डेटा सफलतापूर्वक जमा किया गया!", "success")
                setShowProcessForm(false)

                // Refresh BOTH tabs data to ensure consistency
                await Promise.all([
                    fetchHistoryData(),
                    fetchPendingHotCoilData()
                ])

                ////console.log('✅ Both tabs refreshed after submission')
            }
        } catch (error) {
            console.error("Submission error details:", error.response?.data)
            showPopupMessage(
                error.response?.data?.message || "Submission failed. Check console for details. / सबमिशन विफल। विवरण के लिए कंसोल जांचें।",
                "warning"
            )
        } finally {
            setIsSubmitting(false)
        }
    }, [processFormData, fetchHistoryData, fetchPendingHotCoilData])

    // Close process form
    const handleCloseProcessForm = useCallback(() => {
        setShowProcessForm(false)
        setSelectedRow(null)
        setProcessFormData({
            unique_code: "",
            size: "",
            supervisor: "",
            supervisor_other: "",
            incharge: "",
            incharge_other: "",
            contractor: "",
            welder_name: "",
            welder_name_other: "",
            machine_number: ""
        })
    }, [])

    // Toggle between pending and history views
    const toggleView = useCallback(() => {
        setShowHistory(prev => !prev)
        setSearchTerm("") // Clear search when switching views
    }, [])

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

    // Fetch appropriate data when view changes
    useEffect(() => {
        if (showHistory) {
            fetchHistoryData()
        } else {
            fetchPendingHotCoilData()
        }
    }, [showHistory, fetchHistoryData, fetchPendingHotCoilData])

    // Function to generate short code if not present
    const generateShortCode = (recordData) => {
        if (recordData.sms_short_code) return recordData.sms_short_code;
        if (recordData.unique_code) return recordData.unique_code;

        // Fallback generation
        const date = recordData.createdAt ? new Date(recordData.createdAt).toISOString().slice(0, 10).replace(/-/g, '') : '';
        return `HC${date}`;
    }

    // Filter data based on search term
    const filteredPendingData = useMemo(() => {
        if (!debouncedSearchTerm) return pendingHotCoilData;

        return pendingHotCoilData.filter(record => {
            const searchLower = debouncedSearchTerm.toLowerCase()
            return (
                formatIndianDateTime(record.createdAt).toLowerCase().includes(searchLower) ||
                String(record.unique_code).toLowerCase().includes(searchLower) ||
                String(record.size || '').toLowerCase().includes(searchLower) ||
                String(record.mill_incharge || '').toLowerCase().includes(searchLower) ||
                String(record.quality_supervisor || '').toLowerCase().includes(searchLower)
            )
        })
    }, [pendingHotCoilData, debouncedSearchTerm])

    const filteredHistoryData = useMemo(() => {
        if (!debouncedSearchTerm) return historyData;

        return historyData.filter(record => {
            const searchLower = debouncedSearchTerm.toLowerCase()
            return (
                String(record.unique_code || '').toLowerCase().includes(searchLower) ||
                formatIndianDateTime(record.createdAt).toLowerCase().includes(searchLower) ||
                String(record.size || '').toLowerCase().includes(searchLower) ||
                String(record.supervisor || '').toLowerCase().includes(searchLower) ||
                String(record.incharge || '').toLowerCase().includes(searchLower) ||
                String(record.contractor || '').toLowerCase().includes(searchLower) ||
                String(record.welder_name || '').toLowerCase().includes(searchLower) ||
                String(record.machine_number || '').toLowerCase().includes(searchLower)
            )
        })
    }, [historyData, debouncedSearchTerm])

    // Options for dropdowns
    const supervisorOptions = [
        { value: "", label: "Select Supervisor", hindiLabel: "पर्यवेक्षक चुनें" },
        { value: "Ramdhan Verma", label: "Ramdhan Verma", hindiLabel: "रामधन वर्मा" },
        { value: "Vijay Raut", label: "Vijay Raut", hindiLabel: "विजय राउत" },
        { value: "Yogesh Choudhari", label: "Yogesh Choudhari", hindiLabel: "योगेश चौधरी" },
        { value: "Rajesh Lohar", label: "Rajesh Lohar", hindiLabel: "राजेश लोहार" },
        { value: "Kamal Sahu", label: "Kamal Sahu", hindiLabel: "कमल साहू" },
        { value: "Kamlesh Bisen", label: "Kamlesh Bisen", hindiLabel: "कमलेश बिसेन" },
        { value: "Ranjit Kumar", label: "Ranjit Kumar", hindiLabel: "रंजीत कुमार" },
        { value: "Karmalal Nishad", label: "Karmalal Nishad", hindiLabel: "कर्मलाल निषाद" },
        { value: "Suryakant Jena", label: "Suryakant Jena", hindiLabel: "सूर्यकांत जेना" },
        { value: "Hitesh Barman", label: "Hitesh Barman", hindiLabel: "हितेश बरमन" },
        { value: "Other", label: "Other", hindiLabel: "अन्य" }
    ]

    const inchargeOptions = [
        { value: "", label: "Select Incharge", hindiLabel: "इंचार्ज चुनें" },
        { value: "Toman Lal Sahu", label: "Toman Lal Sahu", hindiLabel: "तोमन लाल साहू" },
        { value: "Ramdhan Verma", label: "Ramdhan Verma", hindiLabel: "रामधन वर्मा" },
        { value: "Ranjit Kumar", label: "Ranjit Kumar", hindiLabel: "रंजीत कुमार" },
        { value: "Other", label: "Other", hindiLabel: "अन्य" }
    ]

    const contractorOptions = [
        { value: "", label: "Select Contractor", hindiLabel: "ठेकेदार चुनें" },
        { value: "Dhananjay (CT)", label: "Dhananjay (CT)", hindiLabel: "धनंजय (सीटी)" },
        { value: "Mumtaz (MDM)", label: "Mumtaz (MDM)", hindiLabel: "मुमताज (एमडीएम)" },
        { value: "Birendra Kumar (BK)", label: "Birendra Kumar (BK)", hindiLabel: "बिरेंद्र कुमार (बीके)" },
        { value: "Sonu Kumar (SK)", label: "Sonu Kumar (SK)", hindiLabel: "सोनू कुमार (एसके)" }
    ]

    const welderNameOptions = [
        { value: "", label: "Select Welder Name", hindiLabel: "वेल्डर नाम चुनें" },
        { value: "Akhilesh", label: "Akhilesh", hindiLabel: "अखिलेश" },
        { value: "Jitendra", label: "Jitendra", hindiLabel: "जितेंद्र" },
        { value: "Chandan", label: "Chandan", hindiLabel: "चंदन" },
        { value: "Naresh", label: "Naresh", hindiLabel: "नरेश" },
        { value: "Arvind", label: "Arvind", hindiLabel: "अरविंद" },
        { value: "Pradeep", label: "Pradeep", hindiLabel: "प्रदीप" },
        { value: "Kaushal", label: "Kaushal", hindiLabel: "कौशल" },
        { value: "Birendra", label: "Birendra", hindiLabel: "बिरेंद्र" },
        { value: "Sonu", label: "Sonu", hindiLabel: "सोनू" },
        { value: "Amit", label: "Amit", hindiLabel: "अमित" },
        { value: "Dhananjay", label: "Dhananjay", hindiLabel: "धनंजय" },
        { value: "Sabbar Khan", label: "Sabbar Khan", hindiLabel: "सब्बर खान" },
        { value: "Saddam", label: "Saddam", hindiLabel: "सद्दाम" },
        { value: "Manoj", label: "Manoj", hindiLabel: "मनोज" },
        { value: "Govind", label: "Govind", hindiLabel: "गोविंद" },
        { value: "Nirmal", label: "Nirmal", hindiLabel: "निर्मल" },
        { value: "Badshah Khan", label: "Badshah Khan", hindiLabel: "बादशाह खान" },
        { value: "Ankit", label: "Ankit", hindiLabel: "अंकित" },
        { value: "Aanand", label: "Aanand", hindiLabel: "आनंद" },
        { value: "Other", label: "Other", hindiLabel: "अन्य" }
    ]

    const machineNumberOptions = [
        { value: "", label: "Select Machine Number", hindiLabel: "मशीन नंबर चुनें" },
        { value: "SRMPL01", label: "SRMPL01", hindiLabel: "एसआरएमपीएल01" },
        { value: "SRMPL02", label: "SRMPL02", hindiLabel: "एसआरएमपीएल02" },
        { value: "SRMPL03", label: "SRMPL03", hindiLabel: "एसआरएमपीएल03" },
        { value: "SRMPL04", label: "SRMPL04", hindiLabel: "एसआरएमपीएल04" },
        { value: "SRMPL05", label: "SRMPL05", hindiLabel: "एसआरएमपीएल05" },
        { value: "SRMPL06", label: "SRMPL06", hindiLabel: "एसआरएमपीएल06" },
        { value: "SRMPL07", label: "SRMPL07", hindiLabel: "एसआरएमपीएल07" },
        { value: "SRMPL08", label: "SRMPL08", hindiLabel: "एसआरएमपीएल08" },
        { value: "SRMPL09", label: "SRMPL09", hindiLabel: "एसआरएमपीएल09" }
    ]

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

                {/* Header Section */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-red-500 leading-tight">
                            {showHistory ? "ReCoil History" : "ReCoil Processing"}
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

                {/* Process Form – inline expanded card */}
                {showProcessForm && (
                    <div className="rounded-lg border-2 border-red-300 bg-white shadow-lg overflow-hidden">
                        <div className="bg-red-500 text-white px-4 py-3 flex justify-between items-center">
                            <h3 className="text-base font-semibold">Submit ReCoil Data / रीकॉइल डेटा जमा करें</h3>
                            <button onClick={handleCloseProcessForm} className="text-white hover:text-red-100 p-1">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Hot Coil Code */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                        Hot Coil Code / हॉट कॉइल कोड <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={processFormData.unique_code}
                                        readOnly
                                        className="w-full px-3 py-3 border border-gray-300 rounded-md bg-gray-100 text-gray-600 text-sm"
                                    />
                                    <p className="text-xs text-gray-400 mt-0.5">Auto-filled from Hot Coil</p>
                                </div>

                                {/* Size */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                        Size / आकार <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={processFormData.size}
                                        readOnly
                                        className="w-full px-3 py-3 border border-gray-300 rounded-md bg-gray-100 text-gray-600 text-sm"
                                    />
                                </div>

                                {/* Supervisor */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                        Supervisor / पर्यवेक्षक <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={processFormData.supervisor}
                                        onChange={(e) => handleProcessFormChange("supervisor", e.target.value)}
                                        className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-white"
                                        required
                                    >
                                        {supervisorOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {processFormData.supervisor === "Other" && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                            Other Supervisor <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.supervisor_other}
                                            onChange={(e) => handleProcessFormChange("supervisor_other", e.target.value)}
                                            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                            placeholder="Enter supervisor name"
                                        />
                                    </div>
                                )}

                                {/* Incharge */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                        Incharge / इंचार्ज <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={processFormData.incharge}
                                        onChange={(e) => handleProcessFormChange("incharge", e.target.value)}
                                        className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-white"
                                        required
                                    >
                                        {inchargeOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {processFormData.incharge === "Other" && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                            Other Incharge <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.incharge_other}
                                            onChange={(e) => handleProcessFormChange("incharge_other", e.target.value)}
                                            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                            placeholder="Enter incharge name"
                                        />
                                    </div>
                                )}

                                {/* Contractor */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                        Contractor / ठेकेदार <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={processFormData.contractor}
                                        onChange={(e) => handleProcessFormChange("contractor", e.target.value)}
                                        className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-white"
                                        required
                                    >
                                        {contractorOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Welder Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                        Welder Name / वेल्डर नाम <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={processFormData.welder_name}
                                        onChange={(e) => handleProcessFormChange("welder_name", e.target.value)}
                                        className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-white"
                                        required
                                    >
                                        {welderNameOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {processFormData.welder_name === "Other" && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                            Other Welder Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={processFormData.welder_name_other}
                                            onChange={(e) => handleProcessFormChange("welder_name_other", e.target.value)}
                                            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                            placeholder="Enter welder name"
                                        />
                                    </div>
                                )}

                                {/* Machine Number */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                        Machine Number / मशीन नंबर <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={processFormData.machine_number}
                                        onChange={(e) => handleProcessFormChange("machine_number", e.target.value)}
                                        className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-white"
                                        required
                                    >
                                        {machineNumberOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 px-4 py-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
                            <button
                                onClick={handleCloseProcessForm}
                                className="w-full sm:w-auto px-4 py-3 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 text-sm font-medium transition-colors"
                            >
                                Cancel / रद्द करें
                            </button>
                            <button
                                onClick={handleProcessSubmit}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto px-4 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                            >
                                <Save className="h-4 w-4" />
                                {isSubmitting ? "Submitting..." : "Submit ReCoil Data"}
                            </button>
                        </div>
                    </div>
                )}

                <div className="rounded-lg border border-gray-200 shadow-md bg-white overflow-hidden">
                    <div className="bg-gradient-to-r from-red-500 to-red-400 p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-white text-base sm:text-lg font-semibold">
                                {showHistory ? "ReCoil Records" : "Pending for ReCoil Processing"}
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
                        /* HISTORY VIEW */
                        filteredHistoryData.length > 0 ? (
                            <>
                                {/* Mobile card view */}
                                <div className="md:hidden divide-y divide-gray-100">
                                    {filteredHistoryData.map((record, index) => (
                                        <div key={record.id || record._id || index} className="p-4 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <span className="text-xs text-gray-500">{formatIndianDateTime(record.created_at || 'N/A')}</span>
                                                <span className="text-xs font-mono bg-red-50 text-red-700 px-2 py-0.5 rounded">{record.unique_code || 'N/A'}</span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-800">Hot Coil: <span className="font-mono">{record.hot_coiler_short_code || 'N/A'}</span></p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
                                                <span><span className="text-gray-400 text-xs">Size: </span>{record.size || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Machine: </span>{record.machine_number || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Supervisor: </span>{record.supervisor || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Incharge: </span>{record.incharge || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Contractor: </span>{record.contractor || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Welder: </span>{record.welder_name || 'N/A'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Desktop table view */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hot Coil Code</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recoiler Code</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supervisor</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incharge</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contractor</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Welder</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredHistoryData.map((record, index) => (
                                                <tr key={record.id || record._id || index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatIndianDateTime(record.created_at || 'N/A')}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.hot_coiler_short_code || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.unique_code || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.size || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.supervisor || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.incharge || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.contractor || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.welder_name || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.machine_number || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="py-12 text-center text-gray-500">
                                <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                <p className="font-medium">{searchTerm ? "No matching ReCoil records found" : "No ReCoil records found"}</p>
                                <p className="text-sm mt-1">{searchTerm ? "Try adjusting your search" : "Submit a ReCoil entry first"}</p>
                                {searchTerm && <button onClick={() => setSearchTerm("")} className="mt-3 px-4 py-2 bg-gray-500 text-white rounded-md text-sm">Clear Search</button>}
                                <button onClick={fetchHistoryData} className="mt-3 ml-2 px-4 py-2 bg-green-500 text-white rounded-md text-sm">Refresh</button>
                            </div>
                        )
                    ) : (
                        /* PENDING VIEW */
                        filteredPendingData.length > 0 ? (
                            <>
                                {/* Mobile card view */}
                                <div className="md:hidden divide-y divide-gray-100">
                                    {filteredPendingData.map((record, index) => (
                                        <div key={record.id || record._id || index} className="p-4 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500">{formatIndianDateTime(record.created_at || 'N/A')}</span>
                                                <button
                                                    onClick={() => handleProcessClick(record)}
                                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1"
                                                >
                                                    <Edit className="h-3 w-3" /> Process
                                                </button>
                                            </div>
                                            <p className="text-sm font-semibold font-mono text-gray-800">{record.unique_code || 'N/A'}</p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
                                                <span><span className="text-gray-400 text-xs">Size: </span>{record.size || 'N/A'}</span>
                                                <span><span className="text-gray-400 text-xs">Incharge: </span>{record.mill_incharge || 'N/A'}</span>
                                                <span className="col-span-2"><span className="text-gray-400 text-xs">QC Supervisor: </span>{record.quality_supervisor || 'N/A'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Desktop table view */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hot Coil Code</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mill Incharge</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">QC Supervisor</th>
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
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.mill_incharge || 'N/A'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.quality_supervisor || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="py-12 text-center text-gray-500">
                                <CheckCircle2 className="h-10 w-10 text-green-300 mx-auto mb-3" />
                                <p className="font-medium">{searchTerm ? "No matching pending records found" : "No pending Hot Coil records"}</p>
                                <p className="text-sm mt-1">{searchTerm ? "Try adjusting your search" : "All records have been processed"}</p>
                                {searchTerm && <button onClick={() => setSearchTerm("")} className="mt-3 px-4 py-2 bg-gray-500 text-white rounded-md text-sm">Clear Search</button>}
                                <button onClick={fetchPendingHotCoilData} className="mt-3 ml-2 px-4 py-2 bg-green-500 text-white rounded-md text-sm">Refresh</button>
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

export default ReCoilPage
