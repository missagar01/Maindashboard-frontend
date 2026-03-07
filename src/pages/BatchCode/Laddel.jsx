import { useState, useEffect, useRef } from "react"
import { Save, ArrowLeft, CheckCircle, AlertCircle, X, Eye, Search, ChevronLeft, ChevronRight } from "lucide-react"
// @ts-ignore - JSX component
import * as batchcodeAPI from "../../api/batchcodeAPI";

/* ─────────────────────────────────────────────
   Custom Calendar Date Picker component
───────────────────────────────────────────── */
function DatePicker({ value, onChange, error }) {
    const [open, setOpen] = useState(false)
    const [viewYear, setViewYear] = useState(() => value ? new Date(value).getFullYear() : new Date().getFullYear())
    const [viewMonth, setViewMonth] = useState(() => value ? new Date(value).getMonth() : new Date().getMonth())
    const pickerRef = useRef(null)

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

    const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()
    const firstDayOf = (y, m) => new Date(y, m, 1).getDay()

    const pad = (n) => String(n).padStart(2, "0")

    // Display label
    const displayValue = () => {
        if (!value) return "DD-MM-YYYY"
        const [y, m, d] = value.split("-")
        return `${d}-${m}-${y}`
    }

    const selectDate = (day) => {
        const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`
        onChange(iso)
        setOpen(false)
    }

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
        else setViewMonth(m => m - 1)
    }
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
        else setViewMonth(m => m + 1)
    }

    const isSelected = (day) => {
        if (!value) return false
        const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`
        return iso === value
    }
    const isToday = (day) => {
        const now = new Date()
        return now.getDate() === day && now.getMonth() === viewMonth && now.getFullYear() === viewYear
    }

    const blanks = firstDayOf(viewYear, viewMonth)
    const total = daysInMonth(viewYear, viewMonth)

    return (
        <div className="relative" ref={pickerRef}>
            {/* Input trigger */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
            >
                <span className={value ? "text-gray-800" : "text-gray-400"}>{displayValue()}</span>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            {/* Calendar dropdown */}
            {open && (
                <div className="absolute left-0 top-full mt-1 z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-72 select-none">
                    {/* Month / Year navigation */}
                    <div className="flex items-center justify-between mb-3">
                        <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="text-sm font-semibold text-gray-800">{MONTHS[viewMonth]} {viewYear}</span>
                        <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-1">
                        {DAYS.map(d => (
                            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                        ))}
                    </div>

                    {/* Day grid */}
                    <div className="grid grid-cols-7 gap-y-1">
                        {/* Empty blanks */}
                        {Array.from({ length: blanks }).map((_, i) => <div key={`b${i}`} />)}
                        {/* Days */}
                        {Array.from({ length: total }, (_, i) => i + 1).map(day => (
                            <button
                                key={day}
                                type="button"
                                onClick={() => selectDate(day)}
                                className={`h-8 w-8 mx-auto flex items-center justify-center rounded-full text-sm transition-colors
                                    ${isSelected(day)
                                        ? 'bg-red-500 text-white font-semibold'
                                        : isToday(day)
                                            ? 'border border-red-400 text-red-600 font-semibold hover:bg-red-50'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>

                    {/* Clear button */}
                    {value && (
                        <button
                            type="button"
                            onClick={() => { onChange(""); setOpen(false) }}
                            className="mt-3 w-full text-xs text-gray-500 hover:text-red-500 transition-colors text-center py-1 border-t border-gray-100"
                        >
                            Clear date
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

/* ─────────────────────────────────────────────
   Main LaddleFormPage component
───────────────────────────────────────────── */
function LaddleFormPage() {

    const [formData, setFormData] = useState({
        laddle_number: "",
        sample_date: "",
        slag_cleaning_top: "Not Done",
        slag_cleaning_bottom: "Not Done",
        nozzle_proper_lancing: "Not Done",
        pursing_plug_cleaning: "Not Done",
        sly_gate_check: "Not Done",
        nozzle_check_cleaning: "Not Done",
        sly_gate_operate: "Not Done",
        nfc_proper_heat: "Not Done",
        nfc_filling_nozzle: "Not Done",
        plate_life: "",
        timber_man_name: "",
        laddle_man_name: "",
        laddle_foreman_name: "",
        supervisor_name: ""
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [popupMessage, setPopupMessage] = useState("")
    const [popupType, setPopupType] = useState("")
    const [showPopup, setShowPopup] = useState(false)
    const [successUniqueCode, setSuccessUniqueCode] = useState("")
    const [errors, setErrors] = useState({})
    const [laddleData, setLaddleData] = useState([])
    const [loading, setLoading] = useState(false)
    const [viewMode, setViewMode] = useState("form")
    const [searchTerm, setSearchTerm] = useState("")
    const [filteredLaddleData, setFilteredLaddleData] = useState([])

    // Auto-hide warnings
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

    useEffect(() => {
        if (viewMode === "list") fetchLaddleData()
    }, [viewMode])

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredLaddleData(laddleData)
        } else {
            const sl = searchTerm.toLowerCase()
            const filtered = laddleData.filter(record => {
                const rd = record.data || record
                return (
                    String(rd.laddle_number || '').toLowerCase().includes(sl) ||
                    String(rd.plate_life || '').toLowerCase().includes(sl) ||
                    String(rd.timber_man_name || '').toLowerCase().includes(sl) ||
                    String(rd.laddle_man_name || '').toLowerCase().includes(sl) ||
                    String(rd.laddle_foreman_name || '').toLowerCase().includes(sl) ||
                    String(rd.supervisor_name || '').toLowerCase().includes(sl) ||
                    String(rd.unique_code || generateUniqueCode(rd) || '').toLowerCase().includes(sl) ||
                    formatIndianDate(rd.sample_date).toLowerCase().includes(sl) ||
                    String(rd.sample_date || '').toLowerCase().includes(sl) ||
                    String(rd.slag_cleaning_top === "Done" ? "Yes" : "No").toLowerCase().includes(sl) ||
                    String(rd.slag_cleaning_bottom === "Done" ? "Yes" : "No").toLowerCase().includes(sl) ||
                    String(rd.nozzle_proper_lancing === "Done" ? "Yes" : "No").toLowerCase().includes(sl) ||
                    String(rd.pursing_plug_cleaning === "Done" ? "Yes" : "No").toLowerCase().includes(sl) ||
                    String(rd.sly_gate_check === "Done" ? "Yes" : "No").toLowerCase().includes(sl) ||
                    String(rd.nozzle_check_cleaning === "Done" ? "Yes" : "No").toLowerCase().includes(sl) ||
                    String(rd.sly_gate_operate === "Done" ? "Yes" : "No").toLowerCase().includes(sl) ||
                    String(rd.nfc_proper_heat === "Done" ? "Yes" : "No").toLowerCase().includes(sl) ||
                    String(rd.nfc_filling_nozzle === "Done" ? "Yes" : "No").toLowerCase().includes(sl)
                )
            })
            setFilteredLaddleData(filtered)
        }
    }, [searchTerm, laddleData])

    const showPopupMessage = (message, type) => {
        setPopupMessage(message); setPopupType(type); setShowPopup(true)
    }

    const fetchLaddleData = async () => {
        setLoading(true)
        try {
            const response = await batchcodeAPI.getLaddleChecklists()
            let data = []
            if (Array.isArray(response.data)) data = response.data
            else if (response.data && Array.isArray(response.data.data)) data = response.data.data
            else if (response.data && response.data.data && typeof response.data.data === 'object') data = Object.values(response.data.data)
            setLaddleData(data)
        } catch (error) {
            console.error("Error fetching ladle data:", error)
            showPopupMessage("Error fetching ladle data!", "warning")
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }))
    }

    const handleDateChange = (iso) => {
        setFormData(prev => ({ ...prev, sample_date: iso }))
        if (errors.sample_date) setErrors(prev => ({ ...prev, sample_date: "" }))
    }

    const handleChecklistChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }))
    }

    const validateForm = () => {
        const newErrors = {}
        if (!formData.laddle_number) newErrors.laddle_number = "Laddle Number is required"
        if (!formData.sample_date) newErrors.sample_date = "Date is required"
        if (!formData.plate_life) newErrors.plate_life = "Plate life is required"
        if (!formData.timber_man_name.trim()) newErrors.timber_man_name = "Timber Man Name is required"
        if (!formData.laddle_man_name.trim()) newErrors.laddle_man_name = "Laddle Man Name is required"
        if (!formData.laddle_foreman_name.trim()) newErrors.laddle_foreman_name = "Laddle Foreman Name is required"
        if (!formData.supervisor_name.trim()) newErrors.supervisor_name = "Supervisor Name is required"

        checklistFields.forEach(field => {
            if (!formData[field]) newErrors[field] = "Please select a status"
        })

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validateForm()) {
            showPopupMessage("Please fill all required fields correctly! / कृपया सभी आवश्यक फ़ील्ड्स सही से भरें!", "warning")
            return
        }
        setIsSubmitting(true)
        try {
            const submissionData = {
                ...formData,
                laddle_number: parseInt(formData.laddle_number),
                plate_life: formData.plate_life ? parseInt(formData.plate_life) : null,
            }
            const response = await batchcodeAPI.submitLaddleChecklist(submissionData)
            if (response.data.success) {
                const uniqueCode = response.data.data?.unique_code
                    || response.data?.unique_code
                    || (response.data.data && generateUniqueCode(response.data.data))
                    || generateUniqueCode(submissionData)
                    || ""
                setSuccessUniqueCode(uniqueCode)
                showPopupMessage("Laddle form submitted successfully! / लेडल फॉर्म सफलतापूर्वक सबमिट हो गया!", "success")
                setFormData({
                    laddle_number: "", sample_date: "",
                    slag_cleaning_top: "Not Done", slag_cleaning_bottom: "Not Done",
                    nozzle_proper_lancing: "Not Done", pursing_plug_cleaning: "Not Done",
                    sly_gate_check: "Not Done", nozzle_check_cleaning: "Not Done",
                    sly_gate_operate: "Not Done", nfc_proper_heat: "Not Done",
                    nfc_filling_nozzle: "Not Done", plate_life: "",
                    timber_man_name: "", laddle_man_name: "",
                    laddle_foreman_name: "", supervisor_name: ""
                })
                setErrors({})
                if (viewMode === "list") fetchLaddleData()
            } else {
                throw new Error(response.data.message || "Failed to submit form")
            }
        } catch (error) {
            console.error("Error submitting form:", error)
            showPopupMessage("Error submitting form. Please try again. / फॉर्म सबमिट करने में त्रुटि!", "warning")
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleViewMode = () => { setViewMode(prev => prev === "form" ? "list" : "form"); setSearchTerm("") }

    const getYesNoBadge = (status) => status === "Done" ? (
        <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 w-12">Yes</span>
    ) : (
        <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 w-12">No</span>
    )

    const formatIndianDate = (dateString) => {
        if (!dateString) return ''
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return dateString
            const d = date.getDate().toString().padStart(2, '0')
            const m = (date.getMonth() + 1).toString().padStart(2, '0')
            return `${d}-${m}-${date.getFullYear()}`
        } catch { return dateString }
    }

    const generateUniqueCode = (rd) => {
        if (rd.unique_code) return rd.unique_code
        const date = rd.sample_date ? rd.sample_date.replace(/-/g, '') : ''
        return `LAD${date}${rd.laddle_number || '0'}`
    }

    /* ── static data ── */
    const checklistFields = [
        'slag_cleaning_top', 'slag_cleaning_bottom', 'nozzle_proper_lancing',
        'pursing_plug_cleaning', 'sly_gate_check', 'nozzle_check_cleaning',
        'sly_gate_operate', 'nfc_proper_heat', 'nfc_filling_nozzle'
    ]

    const checklistItems = [
        { id: "slag_cleaning_top", label: "Slag cleaning in top area", hindiLabel: "लेडल के उपरी भाग का स्लैग साफ हो गया" },
        { id: "slag_cleaning_bottom", label: "Slag remove in bottom area", hindiLabel: "लेडल के निचे भाग का स्लैग साफ हो गया" },
        { id: "nozzle_proper_lancing", label: "Nozzle proper lancing", hindiLabel: "नोजल की उचित लैंसिंग की गई" },
        { id: "pursing_plug_cleaning", label: "Pursing plug proper cleaning", hindiLabel: "पर्सिंग प्लेग की उचित सफाई की गई" },
        { id: "sly_gate_check", label: "Sly gate plate/machine/frame proper check", hindiLabel: "स्लाइ गेट प्लेट/मशीन/फ्रेम की उचित जांच की गई" },
        { id: "nozzle_check_cleaning", label: "Nozzle check & cleaning", hindiLabel: "नोजल की जाँच और सफाई" },
        { id: "sly_gate_operate", label: "Sly gate operate 3 times with 80 pressure", hindiLabel: "क्या आपने 80 दबाव के साथ 3 बार स्ली गेट संचालित किया" },
        { id: "nfc_proper_heat", label: "NFC proper heat", hindiLabel: "NFC को अच्छे से गर्म किया गया" },
        { id: "nfc_filling_nozzle", label: "NFC proper filling in nozzle", hindiLabel: "क्या आपने नोजल में एनएफसी ठीक से भरा है" }
    ]

    const laddleNumberOptions = [
        { value: "", label: "Select Laddle Number" },
        ...["1", "2", "3", "4", "5", "6", "7", "8"].map(v => ({ value: v, label: v }))
    ]

    const plateLifeOptions = [
        { value: "", label: "Select plate life" },
        ...["1", "2", "3", "4"].map(v => ({ value: v, label: v }))
    ]

    const statusOptions = [
        { value: "Done", label: "Done — किया गया" },
        { value: "Not Done", label: "Not Done — नहीं किया" }
    ]

    const inputCls = (field) =>
        `w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${errors[field] ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
        }`

    return (
        <div>
            <div className="space-y-6">

                {/* ── Popup Modal ── */}
                {showPopup && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <div className={`relative mx-4 p-6 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 pointer-events-auto ${popupType === "success" ? 'bg-green-50 border-2 border-green-400' : 'bg-yellow-50 border-2 border-yellow-400'
                            }`}>
                            <div className="flex items-center justify-center mb-4">
                                {popupType === "success"
                                    ? <CheckCircle className="h-12 w-12 text-green-500" />
                                    : <AlertCircle className="h-12 w-12 text-yellow-500" />}
                            </div>
                            <div className="text-center">
                                <h3 className={`text-lg font-semibold mb-2 ${popupType === "success" ? 'text-green-800' : 'text-yellow-800'}`}>
                                    {popupType === "success" ? "Success!" : "Warning!"}
                                </h3>
                                <p className={popupType === "success" ? 'text-green-700' : 'text-yellow-700'}>{popupMessage}</p>
                                {popupType === "success" && successUniqueCode && (
                                    <p className="mt-2 text-green-700 font-semibold">
                                        Unique Code: <span className="font-bold">{successUniqueCode}</span>
                                    </p>
                                )}
                            </div>
                            {popupType === "warning" && (
                                <div className="mt-4 w-full bg-gray-200 rounded-full h-1">
                                    <div className="h-1 rounded-full bg-yellow-500" style={{ animation: 'shrink 2s linear forwards' }} />
                                </div>
                            )}
                            <div className="mt-4 flex justify-center">
                                <button onClick={handleClosePopup}
                                    className={`px-6 py-2 rounded-md font-medium transition-colors ${popupType === "success" ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                        }`}>
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Header ── */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-red-500">
                        {viewMode === "form" ? "Create Laddle Form" : "Laddle Form Records"}
                    </h1>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        {viewMode === "list" && (
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search across all columns..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                        <button onClick={toggleViewMode}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors w-full sm:w-auto text-sm font-medium">
                            {viewMode === "form"
                                ? <><Eye className="h-4 w-4" />View Records</>
                                : <><ArrowLeft className="h-4 w-4" />Back to Form</>}
                        </button>
                    </div>
                </div>

                {viewMode === "form" ? (
                    /* ════════ FORM VIEW ════════ */
                    <div className="rounded-lg border border-gray-200 shadow-md bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-red-400 p-4">
                            <h2 className="text-white text-lg font-semibold">Laddle Information</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">

                            {/* Laddle Number + Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label htmlFor="laddle_number" className="block text-sm font-medium text-gray-700 mb-2">
                                        Laddle Number / लेडल नंबर <span className="text-red-500">*</span>
                                    </label>
                                    <select id="laddle_number" name="laddle_number"
                                        value={formData.laddle_number} onChange={handleInputChange}
                                        className={inputCls("laddle_number")}>
                                        {laddleNumberOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                    {errors.laddle_number && <p className="text-red-500 text-xs mt-1.5">{errors.laddle_number}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Date / दिनांक <span className="text-red-500">*</span>
                                    </label>
                                    <DatePicker
                                        value={formData.sample_date}
                                        onChange={handleDateChange}
                                        error={!!errors.sample_date}
                                    />
                                    {errors.sample_date && <p className="text-red-500 text-xs mt-1.5">{errors.sample_date}</p>}
                                </div>
                            </div>

                            {/* Completion Checklist */}
                            <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 md:mb-6">
                                    Completion Checklist / लेडल बनाने का चेकलिस्ट <span className="text-red-500">*</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                    {checklistItems.map((item) => (
                                        <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-all">
                                            <div className="mb-3">
                                                <label className="block text-sm font-medium text-gray-700 break-words">{item.label}</label>
                                                <p className="text-xs text-gray-500 mt-1 break-words">{item.hindiLabel}</p>
                                            </div>
                                            <select value={formData[item.id]}
                                                onChange={(e) => handleChecklistChange(item.id, e.target.value)}
                                                className={inputCls(item.id)}>
                                                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                            {errors[item.id] && <p className="text-red-500 text-xs mt-1.5">{errors[item.id]}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Plate Life + Timber Man */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label htmlFor="plate_life" className="block text-sm font-medium text-gray-700 mb-2">
                                        Plate life / प्लेट की लाइफ <span className="text-red-500">*</span>
                                    </label>
                                    <select id="plate_life" name="plate_life"
                                        value={formData.plate_life} onChange={handleInputChange}
                                        className={inputCls("plate_life")}>
                                        {plateLifeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                    {errors.plate_life && <p className="text-red-500 text-xs mt-1.5">{errors.plate_life}</p>}
                                </div>
                                <div>
                                    <label htmlFor="timber_man_name" className="block text-sm font-medium text-gray-700 mb-2">
                                        Timber Man Name / टिम्बर मेन का नाम <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" id="timber_man_name" name="timber_man_name"
                                        value={formData.timber_man_name} onChange={handleInputChange}
                                        className={inputCls("timber_man_name")} placeholder="Enter timber man name" />
                                    {errors.timber_man_name && <p className="text-red-500 text-xs mt-1.5">{errors.timber_man_name}</p>}
                                </div>
                            </div>

                            {/* Checked By section */}
                            <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 md:mb-6">
                                    Checked By — किस किस के द्वारा चेक किया गया <span className="text-red-500">*</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                    <div>
                                        <label htmlFor="laddle_man_name" className="block text-sm font-medium text-gray-700 mb-2">
                                            Laddle Man Name / लेडल मेन का नाम <span className="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="laddle_man_name" name="laddle_man_name"
                                            value={formData.laddle_man_name} onChange={handleInputChange}
                                            className={inputCls("laddle_man_name")} placeholder="Enter laddle man name" />
                                        {errors.laddle_man_name && <p className="text-red-500 text-xs mt-1.5">{errors.laddle_man_name}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="laddle_foreman_name" className="block text-sm font-medium text-gray-700 mb-2">
                                            Laddle Foreman Name / लेडल फोरमेन का नाम <span className="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="laddle_foreman_name" name="laddle_foreman_name"
                                            value={formData.laddle_foreman_name} onChange={handleInputChange}
                                            className={inputCls("laddle_foreman_name")} placeholder="Enter laddle foreman name" />
                                        {errors.laddle_foreman_name && <p className="text-red-500 text-xs mt-1.5">{errors.laddle_foreman_name}</p>}
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label htmlFor="supervisor_name" className="block text-sm font-medium text-gray-700 mb-2">
                                            Supervisor Name (Controller) / सुपरवाइजर का नाम <span className="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="supervisor_name" name="supervisor_name"
                                            value={formData.supervisor_name} onChange={handleInputChange}
                                            className={inputCls("supervisor_name")} placeholder="Enter supervisor name" />
                                        {errors.supervisor_name && <p className="text-red-500 text-xs mt-1.5">{errors.supervisor_name}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end pt-6 border-t border-gray-200">
                                <button type="submit" disabled={isSubmitting}
                                    className="flex items-center justify-center w-full sm:w-auto px-6 py-4 sm:py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-sm">
                                    <Save className="mr-2 h-5 w-5" />
                                    {isSubmitting ? "Submitting..." : "Submit Laddle Form"}
                                </button>
                            </div>
                        </form>
                    </div>

                ) : (
                    /* ════════ LIST VIEW ════════ */
                    <div className="rounded-lg border border-gray-200 shadow-md bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-red-400 p-4">
                            <h2 className="text-white text-lg font-semibold">Laddle Form Records</h2>
                            <p className="text-white text-sm opacity-90">
                                Total Records: {filteredLaddleData.length}{searchTerm && ` (Filtered from ${laddleData.length})`}
                            </p>
                        </div>

                        <div className="p-4">
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mb-4" />
                                    <p className="text-gray-600">Loading ladle data...</p>
                                </div>
                            ) : filteredLaddleData.length > 0 ? (
                                <>
                                    {/* Mobile card view */}
                                    <div className="md:hidden divide-y divide-gray-100">
                                        {filteredLaddleData.map((record, index) => {
                                            const rd = record.data || record
                                            return (
                                                <div key={rd.id || rd._id || index} className="p-4 space-y-2">
                                                    <div className="flex justify-between items-start flex-wrap gap-1">
                                                        <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{rd.unique_code || generateUniqueCode(rd) || 'N/A'}</span>
                                                        <span className="text-xs text-gray-500">{formatIndianDate(rd.sample_date) || 'N/A'}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
                                                        <span><span className="text-gray-400 text-xs">Laddle No: </span>{rd.laddle_number || 'N/A'}</span>
                                                        <span><span className="text-gray-400 text-xs">Plate Life: </span>{rd.plate_life || 'N/A'}</span>
                                                        <span><span className="text-gray-400 text-xs">Timber: </span>{rd.timber_man_name || 'N/A'}</span>
                                                        <span><span className="text-gray-400 text-xs">Supervisor: </span>{rd.supervisor_name || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 pt-1">
                                                        {[
                                                            { label: 'Slag Top', val: rd.slag_cleaning_top },
                                                            { label: 'Slag Bot', val: rd.slag_cleaning_bottom },
                                                            { label: 'Nozzle Lance', val: rd.nozzle_proper_lancing },
                                                            { label: 'Pursing', val: rd.pursing_plug_cleaning },
                                                            { label: 'Gate Check', val: rd.sly_gate_check },
                                                        ].map(({ label, val }) => (
                                                            <span key={label} className="text-xs">
                                                                <span className="text-gray-400">{label}: </span>
                                                                {getYesNoBadge(val)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    {/* Desktop table */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    {["Unique Code", "Laddle No.", "Date", "Slag Top", "Slag Bot", "Nozzle Lance", "Pursing Plug", "Gate Check", "Nozzle Clean", "Gate Operate", "NFC Heat", "NFC Fill", "Plate Life", "Timber Man", "Laddle Man", "Foreman", "Supervisor"].map(h => (
                                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {filteredLaddleData.map((record, index) => {
                                                    const rd = record.data || record
                                                    return (
                                                        <tr key={rd.id || rd._id || index} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.unique_code || generateUniqueCode(rd) || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{rd.laddle_number || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatIndianDate(rd.sample_date) || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">{getYesNoBadge(rd.slag_cleaning_top)}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">{getYesNoBadge(rd.slag_cleaning_bottom)}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">{getYesNoBadge(rd.nozzle_proper_lancing)}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">{getYesNoBadge(rd.pursing_plug_cleaning)}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">{getYesNoBadge(rd.sly_gate_check)}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">{getYesNoBadge(rd.nozzle_check_cleaning)}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">{getYesNoBadge(rd.sly_gate_operate)}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">{getYesNoBadge(rd.nfc_proper_heat)}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">{getYesNoBadge(rd.nfc_filling_nozzle)}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.plate_life || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.timber_man_name || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.laddle_man_name || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.laddle_foreman_name || 'N/A'}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{rd.supervisor_name || 'N/A'}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 px-4">
                                    <p className="text-lg font-medium text-gray-500">
                                        {searchTerm ? "No matching records found" : "No ladle form records found"}
                                    </p>
                                    <p className="text-sm text-gray-400 mb-4">
                                        {searchTerm ? "Try adjusting your search terms" : "Submit a form first to see records here"}
                                    </p>
                                    <div className="flex gap-2 justify-center flex-wrap">
                                        {searchTerm && (
                                            <button onClick={() => setSearchTerm("")}
                                                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm">
                                                Clear Search
                                            </button>
                                        )}
                                        <button onClick={fetchLaddleData}
                                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm">
                                            Refresh Data
                                        </button>
                                        <button onClick={() => setViewMode("form")}
                                            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm">
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

export default LaddleFormPage
