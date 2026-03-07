import { useState, useEffect } from "react"
import { Save, ArrowLeft, CheckCircle, AlertCircle, X, Eye, Search } from "lucide-react"
// @ts-ignore - JSX component
import * as batchcodeAPI from "../../api/batchcodeAPI";

function TundishFormPage() {
    const [formData, setFormData] = useState({
        tundish_number: "",
        sample_date: "",
        sample_time: "",
        nozzle_plate_check: "",
        well_block_check: "",
        board_proper_set: "",
        board_sand_filling: "",
        refractory_slag_cleaning: "",
        tundish_mession_name: "",
        handover_proper_check: "",
        handover_nozzle_installed: "",
        handover_masala_inserted: "",
        stand1_mould_operator: "",
        stand2_mould_operator: "",
        timber_man_name: "",
        laddle_operator_name: "",
        shift_incharge_name: "",
        forman_name: ""
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [popupMessage, setPopupMessage] = useState("")
    const [popupType, setPopupType] = useState("")
    const [showPopup, setShowPopup] = useState(false)
    const [successUniqueCode, setSuccessUniqueCode] = useState("")
    const [errors, setErrors] = useState({})
    const [tundishData, setTundishData] = useState([])
    const [loading, setLoading] = useState(false)
    const [viewMode, setViewMode] = useState("form") // "form" or "list"
    const [searchTerm, setSearchTerm] = useState("")
    const [filteredTundishData, setFilteredTundishData] = useState([])

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

    // Fetch tundish data when in list view
    useEffect(() => {
        if (viewMode === "list") {
            fetchTundishData()
        }
    }, [viewMode])

    // Filter data when search term or tundishData changes
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredTundishData(tundishData)
        } else {
            const filtered = tundishData.filter(record => {
                const recordData = record.data || record
                const searchLower = searchTerm.toLowerCase()

                return (
                    String(recordData.tundish_number || '').toLowerCase().includes(searchLower) ||
                    String(recordData.tundish_mession_name || '').toLowerCase().includes(searchLower) ||
                    String(recordData.stand1_mould_operator || '').toLowerCase().includes(searchLower) ||
                    String(recordData.stand2_mould_operator || '').toLowerCase().includes(searchLower) ||
                    String(recordData.timber_man_name || '').toLowerCase().includes(searchLower) ||
                    String(recordData.laddle_operator_name || '').toLowerCase().includes(searchLower) ||
                    String(recordData.shift_incharge_name || '').toLowerCase().includes(searchLower) ||
                    String(recordData.forman_name || '').toLowerCase().includes(searchLower) ||
                    String(recordData.unique_code || generateUniqueCode(recordData) || '').toLowerCase().includes(searchLower) ||
                    formatIndianDateTime(recordData.sample_date).toLowerCase().includes(searchLower) ||
                    String(recordData.sample_date || '').toLowerCase().includes(searchLower) ||
                    String(recordData.sample_time || '').toLowerCase().includes(searchLower) ||
                    String(recordData.nozzle_plate_check === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.well_block_check === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.board_proper_set === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.board_sand_filling === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.refractory_slag_cleaning === "Done" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.handover_proper_check === "Yes" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.handover_nozzle_installed === "Yes" ? "Yes" : "No").toLowerCase().includes(searchLower) ||
                    String(recordData.handover_masala_inserted === "Yes" ? "Yes" : "No").toLowerCase().includes(searchLower)
                )
            })
            setFilteredTundishData(filtered)
        }
    }, [searchTerm, tundishData])

    const showPopupMessage = (message, type) => {
        setPopupMessage(message)
        setPopupType(type)
        setShowPopup(true)
    }

    const fetchTundishData = async () => {
        setLoading(true)
        try {
            const response = await batchcodeAPI.getTundishChecklists()

            let data = [];
            if (Array.isArray(response.data)) {
                data = response.data;
            } else if (response.data && Array.isArray(response.data.data)) {
                data = response.data.data;
            } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
                data = response.data.data;
            } else if (response.data && response.data.data && typeof response.data.data === 'object') {
                data = Object.values(response.data.data);
            } else {
                data = [];
            }

            setTundishData(data)
        } catch (error) {
            console.error("Error fetching tundish data:", error)
            showPopupMessage("Error fetching tundish data!", "warning")
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }))
        }
    }

    const handleChecklistChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }))
        }
    }

    const validateForm = () => {
        const newErrors = {}

        if (!formData.tundish_number) newErrors.tundish_number = "Tundish Number is required"
        if (!formData.tundish_mession_name.trim()) newErrors.tundish_mession_name = "Tundish Mession Name is required"
        if (!formData.stand1_mould_operator.trim()) newErrors.stand1_mould_operator = "Stand 1 Mould Operator Name is required"
        if (!formData.stand2_mould_operator.trim()) newErrors.stand2_mould_operator = "Stand 2 Mould Operator Name is required"
        if (!formData.timber_man_name.trim()) newErrors.timber_man_name = "Timber Man Name is required"
        if (!formData.laddle_operator_name.trim()) newErrors.laddle_operator_name = "Laddle Operator Name is required"
        if (!formData.shift_incharge_name.trim()) newErrors.shift_incharge_name = "Shift Incharge Name is required"
        if (!formData.forman_name.trim()) newErrors.forman_name = "Forman Name is required"

        ['nozzle_plate_check', 'well_block_check', 'board_proper_set', 'board_sand_filling', 'refractory_slag_cleaning'].forEach(field => {
            if (!formData[field]) newErrors[field] = "Please select a status"
        })

        ['handover_proper_check', 'handover_nozzle_installed', 'handover_masala_inserted'].forEach(field => {
            if (!formData[field]) newErrors[field] = "Please select a status"
        })

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validateForm()) {
            showPopupMessage("कृपया सभी आवश्यक फ़ील्ड्स सही से भरें!", "warning")
            return
        }

        setIsSubmitting(true)

        try {
            const { sample_date, sample_time, ...restFormData } = formData;
            const submissionData = {
                ...restFormData,
                tundish_number: parseInt(formData.tundish_number)
            }

            const response = await batchcodeAPI.submitTundishChecklist(submissionData)

            if (response.data.success) {
                const uniqueCode = response.data.data?.unique_code
                    || response.data?.unique_code
                    || (response.data.data && generateUniqueCode(response.data.data))
                    || generateUniqueCode(submissionData)
                    || ""
                setSuccessUniqueCode(uniqueCode)
                showPopupMessage("टंडिस फॉर्म सफलतापूर्वक सबमिट हो गया!", "success")

                setFormData({
                    tundish_number: "", sample_date: "", sample_time: "",
                    nozzle_plate_check: "", well_block_check: "", board_proper_set: "",
                    board_sand_filling: "", refractory_slag_cleaning: "",
                    tundish_mession_name: "", handover_proper_check: "",
                    handover_nozzle_installed: "", handover_masala_inserted: "",
                    stand1_mould_operator: "", stand2_mould_operator: "",
                    timber_man_name: "", laddle_operator_name: "",
                    shift_incharge_name: "", forman_name: ""
                })
                setErrors({})

                if (viewMode === "list") fetchTundishData()
            } else {
                throw new Error(response.data.message || "Failed to submit form")
            }
        } catch (error) {
            console.error("Error submitting form:", error)
            showPopupMessage("फॉर्म सबमिट करने में त्रुटि। कृपया पुनः प्रयास करें।", "warning")
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleViewMode = () => {
        setViewMode(prev => prev === "form" ? "list" : "form")
        setSearchTerm("")
    }

    const getYesNoBadge = (status, type = "tundish") => {
        const isYes = type === "tundish" ? status === "Done" : status === "Yes"
        return isYes ? (
            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 w-12">Yes</span>
        ) : (
            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 w-12">No</span>
        )
    }

    const formatIndianDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
        } catch (error) {
            return dateString;
        }
    }

    const generateUniqueCode = (recordData) => {
        if (recordData.unique_code) return recordData.unique_code;
        const date = recordData.sample_date ? recordData.sample_date.replace(/-/g, '') : '';
        const tundishNum = recordData.tundish_number || '0';
        return `TUN${date}${tundishNum}`;
    }

    const tundishNumberOptions = [
        { value: "", label: "Select Tundish Number" },
        { value: "1", label: "1" }, { value: "2", label: "2" },
        { value: "3", label: "3" }, { value: "4", label: "4" },
        { value: "5", label: "5" }, { value: "6", label: "6" }
    ]

    const tundishChecklistItems = [
        { id: "nozzle_plate_check", label: "Tundish nozzle plate checking", hindiLabel: "टंडिस नोज़ल प्लेट चेक" },
        { id: "well_block_check", label: "Tundish well block checking", hindiLabel: "टंडिस वेल ब्लॉक चेक" },
        { id: "board_proper_set", label: "Tundish board proper set", hindiLabel: "टंडिस बोर्ड प्रॉपर सेटिंग" },
        { id: "board_sand_filling", label: "Tundish board sand proper filling", hindiLabel: "टंडिस बोर्ड में रेत अच्छे से भरी" },
        { id: "refractory_slag_cleaning", label: "If refractory tundish slag proper cleaning", hindiLabel: "अगर रिफ्रैक्टरी हुआ है टंडिस स्लैग अच्छे से साफ हुआ" }
    ]

    const handoverChecklistItems = [
        { id: "handover_proper_check", label: "Tundish proper check/well block/board etc", hindiLabel: "टुंडिश/कुआं ब्लॉक/बोर्ड आदि की उचित जांच की गई" },
        { id: "handover_nozzle_installed", label: "Nozzle installed", hindiLabel: "नोज़ल स्थापित हो गया" },
        { id: "handover_masala_inserted", label: "Masala proper inserted in nozzle", hindiLabel: "नोज़ल में मसाला सही तरीके से डाला गया" }
    ]

    const tundishStatusOptions = [
        { value: "", label: "Select Status" },
        { value: "Done", label: "Done" },
        { value: "Not Done", label: "Not Done" }
    ]

    const handoverStatusOptions = [
        { value: "", label: "Select Status" },
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" }
    ]

    return (
        <div>
            <div className="space-y-6">
                {/* Popup Modal */}
                {showPopup && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <div className={`relative mx-4 p-6 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 pointer-events-auto ${popupType === "success" ? 'bg-green-50 border-2 border-green-400' : 'bg-yellow-50 border-2 border-yellow-400'}`}>
                            <div className="flex items-center justify-center mb-4">
                                {popupType === "success" ? (
                                    <CheckCircle className="h-12 w-12 text-green-500" />
                                ) : (
                                    <AlertCircle className="h-12 w-12 text-yellow-500" />
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className={`text-lg font-semibold mb-2 ${popupType === "success" ? 'text-green-800' : 'text-yellow-800'}`}>
                                    {popupType === "success" ? "सफलता!" : "चेतावनी!"}
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
                            {popupType === "warning" && (
                                <div className="mt-4 w-full bg-gray-200 rounded-full h-1">
                                    <div
                                        className="h-1 rounded-full bg-yellow-500"
                                        style={{ animation: 'shrink 2s linear forwards' }}
                                    />
                                </div>
                            )}
                            <div className="mt-4 flex justify-center">
                                <button
                                    onClick={handleClosePopup}
                                    className={`px-6 py-2 rounded-md font-medium transition-colors ${popupType === "success" ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-red-500 leading-tight">
                            {viewMode === "form" ? "Create Tundish Form" : "Tundish Form Records"}
                        </h1>
                        <button
                            onClick={toggleViewMode}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium flex-shrink-0"
                        >
                            {viewMode === "form" ? (
                                <><Eye className="h-4 w-4" /><span>Records</span></>
                            ) : (
                                <><ArrowLeft className="h-4 w-4" /><span>Form</span></>
                            )}
                        </button>
                    </div>

                    {viewMode === "list" && (
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
                    )}
                </div>

                {viewMode === "form" ? (
                    /* FORM VIEW */
                    <div className="rounded-lg border border-gray-200 shadow-md bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-red-400 border-b border-red-200 p-4">
                            <h2 className="text-white text-lg font-semibold">Tundish Information</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label htmlFor="tundish_number" className="block text-sm font-medium text-gray-700 mb-2">
                                        Tundish Number / टंडिस नंबर <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="tundish_number"
                                        name="tundish_number"
                                        value={formData.tundish_number}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.tundish_number ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                                    >
                                        {tundishNumberOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                    {errors.tundish_number && <p className="text-red-500 text-xs mt-1.5">{errors.tundish_number}</p>}
                                </div>

                                <div>
                                    <label htmlFor="tundish_mession_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Tundish Mession Name / टंडिस मेसन का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="tundish_mession_name"
                                        name="tundish_mession_name"
                                        value={formData.tundish_mession_name}
                                        onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.tundish_mession_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                                        placeholder="Enter tundish mession name"
                                    />
                                    {errors.tundish_mession_name && <p className="text-red-500 text-xs mt-1.5">{errors.tundish_mession_name}</p>}
                                </div>
                            </div>

                            {/* Tundish Checklist */}
                            <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 md:mb-6">
                                    Checklist for tundish / चेकलिस्ट <span className="text-red-500">*</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                    {tundishChecklistItems.map((item) => (
                                        <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm transition-all bg-white">
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700 break-words">{item.label}</label>
                                                <p className="text-xs text-gray-500 mt-1 break-words">{item.hindiLabel}</p>
                                            </div>
                                            <select
                                                value={formData[item.id]}
                                                onChange={(e) => handleChecklistChange(item.id, e.target.value)}
                                                className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors[item.id] ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                                            >
                                                {tundishStatusOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                            {errors[item.id] && <p className="text-red-500 text-xs mt-1.5">{errors[item.id]}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Handover Checklist */}
                            <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 md:mb-6">
                                    Tundish send to / hand over to production <span className="text-red-500">*</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                    {handoverChecklistItems.map((item) => (
                                        <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm transition-all bg-white">
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700 break-words">{item.label}</label>
                                                <p className="text-xs text-gray-500 mt-1 break-words">{item.hindiLabel}</p>
                                            </div>
                                            <select
                                                value={formData[item.id]}
                                                onChange={(e) => handleChecklistChange(item.id, e.target.value)}
                                                className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors[item.id] ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                                            >
                                                {handoverStatusOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                            {errors[item.id] && <p className="text-red-500 text-xs mt-1.5">{errors[item.id]}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Operator Names */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label htmlFor="stand1_mould_operator" className="block text-sm font-medium text-gray-700 mb-2">
                                        Stand 1 Mould Operator Name / स्टैंड 1 मोल्ड ऑपरेटर का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" id="stand1_mould_operator" name="stand1_mould_operator" value={formData.stand1_mould_operator} onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.stand1_mould_operator ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                                        placeholder="Enter stand 1 operator name" />
                                    {errors.stand1_mould_operator && <p className="text-red-500 text-xs mt-1.5">{errors.stand1_mould_operator}</p>}
                                </div>
                                <div>
                                    <label htmlFor="stand2_mould_operator" className="block text-sm font-medium text-gray-700 mb-2">
                                        Stand 2 Mould Operator Name / स्टैंड 2 मोल्ड ऑपरेटर का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" id="stand2_mould_operator" name="stand2_mould_operator" value={formData.stand2_mould_operator} onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.stand2_mould_operator ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                                        placeholder="Enter stand 2 operator name" />
                                    {errors.stand2_mould_operator && <p className="text-red-500 text-xs mt-1.5">{errors.stand2_mould_operator}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label htmlFor="timber_man_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Timber Man Name / टिम्बर मेन का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" id="timber_man_name" name="timber_man_name" value={formData.timber_man_name} onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.timber_man_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                                        placeholder="Enter timber man name" />
                                    {errors.timber_man_name && <p className="text-red-500 text-xs mt-1.5">{errors.timber_man_name}</p>}
                                </div>
                                <div>
                                    <label htmlFor="laddle_operator_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Laddle Operator Name / लेडल ऑपरेटर का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" id="laddle_operator_name" name="laddle_operator_name" value={formData.laddle_operator_name} onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.laddle_operator_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                                        placeholder="Enter laddle operator name" />
                                    {errors.laddle_operator_name && <p className="text-red-500 text-xs mt-1.5">{errors.laddle_operator_name}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label htmlFor="shift_incharge_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Shift Incharge Name / शिफ्ट इंचार्ज का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" id="shift_incharge_name" name="shift_incharge_name" value={formData.shift_incharge_name} onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.shift_incharge_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                                        placeholder="Enter shift incharge name" />
                                    {errors.shift_incharge_name && <p className="text-red-500 text-xs mt-1.5">{errors.shift_incharge_name}</p>}
                                </div>
                                <div>
                                    <label htmlFor="forman_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Forman Name / फोरमेन का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" id="forman_name" name="forman_name" value={formData.forman_name} onChange={handleInputChange}
                                        className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors.forman_name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                                        placeholder="Enter foreman name" />
                                    {errors.forman_name && <p className="text-red-500 text-xs mt-1.5">{errors.forman_name}</p>}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end pt-6 border-t border-gray-200">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center justify-center w-full sm:w-auto px-6 py-4 sm:py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-sm"
                                >
                                    <Save className="mr-2 h-5 w-5" />
                                    {isSubmitting ? "Submitting..." : "Submit Tundish Form"}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    /* LIST VIEW */
                    <div className="rounded-lg border border-gray-200 shadow-md bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-red-400 border-b border-red-200 p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h2 className="text-white text-lg font-semibold">Tundish Form Records</h2>
                                    <p className="text-white text-sm opacity-90">
                                        Total Records: {filteredTundishData.length} {searchTerm && `(Filtered from ${tundishData.length})`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4">
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mb-4"></div>
                                    <p className="text-gray-600">Loading tundish data...</p>
                                </div>
                            ) : filteredTundishData && filteredTundishData.length > 0 ? (
                                <>
                                    {/* Mobile card view */}
                                    <div className="md:hidden divide-y divide-gray-100">
                                        {filteredTundishData.map((record, index) => {
                                            const rd = record.data || record;
                                            return (
                                                <div key={rd.id || rd._id || index} className="p-4 space-y-2">
                                                    <div className="flex justify-between items-start flex-wrap gap-1">
                                                        <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{rd.unique_code || generateUniqueCode(rd) || 'N/A'}</span>
                                                        <span className="text-xs text-gray-500">{formatIndianDateTime(rd.sample_timestamp) || 'N/A'}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
                                                        <span><span className="text-gray-400 text-xs">Tundish No: </span>{rd.tundish_number || 'N/A'}</span>
                                                        <span><span className="text-gray-400 text-xs">Shift IC: </span>{rd.shift_incharge_name || 'N/A'}</span>
                                                        <span><span className="text-gray-400 text-xs">Foreman: </span>{rd.forman_name || 'N/A'}</span>
                                                        <span><span className="text-gray-400 text-xs">Ladle Op: </span>{rd.laddle_operator_name || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 pt-1">
                                                        {[
                                                            { label: 'Nozzle Plate', val: rd.nozzle_plate_check, type: 'tundish' },
                                                            { label: 'Well Block', val: rd.well_block_check, type: 'tundish' },
                                                            { label: 'Board Set', val: rd.board_proper_set, type: 'tundish' },
                                                            { label: 'Sand Fill', val: rd.board_sand_filling, type: 'tundish' },
                                                            { label: 'Slag Clean', val: rd.refractory_slag_cleaning, type: 'tundish' },
                                                        ].map(({ label, val, type }) => (
                                                            <span key={label} className="text-xs">
                                                                <span className="text-gray-400">{label}: </span>
                                                                {getYesNoBadge(val, type)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* Desktop table view */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unique Code</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tundish No.</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date &amp; Time</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nozzle Plate</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Well Block</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Board Set</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sand Fill</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slag Clean</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tundish Check</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nozzle Installed</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Masala</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mession</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stand 1 Op</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stand 2 Op</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timber Man</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ladle Op</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift IC</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Foreman</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {filteredTundishData.map((record, index) => {
                                                    const rd = record.data || record;
                                                    return (
                                                        <tr key={rd.id || rd._id || index} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.unique_code || generateUniqueCode(rd) || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{rd.tundish_number || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatIndianDateTime(rd.sample_timestamp) || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getYesNoBadge(rd.nozzle_plate_check, "tundish")}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getYesNoBadge(rd.well_block_check, "tundish")}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getYesNoBadge(rd.board_proper_set, "tundish")}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getYesNoBadge(rd.board_sand_filling, "tundish")}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getYesNoBadge(rd.refractory_slag_cleaning, "tundish")}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getYesNoBadge(rd.handover_proper_check, "handover")}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getYesNoBadge(rd.handover_nozzle_installed, "handover")}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getYesNoBadge(rd.handover_masala_inserted, "handover")}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.tundish_mession_name || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.stand1_mould_operator || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.stand2_mould_operator || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.timber_man_name || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.laddle_operator_name || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.shift_incharge_name || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.forman_name || 'N/A'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 px-4">
                                    <div className="text-gray-500 mb-4">
                                        <p className="text-lg font-medium">
                                            {searchTerm ? "No matching records found" : "No tundish form records found"}
                                        </p>
                                        <p className="text-sm">
                                            {searchTerm ? "Try adjusting your search terms" : "Submit a form first to see records here"}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 justify-center flex-wrap">
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm("")}
                                                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                                            >
                                                Clear Search
                                            </button>
                                        )}
                                        <button
                                            onClick={fetchTundishData}
                                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                                        >
                                            Refresh Data
                                        </button>
                                        <button
                                            onClick={() => setViewMode("form")}
                                            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                        >
                                            Create New Form
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

export default TundishFormPage
