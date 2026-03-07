"use client"

import { useState, useEffect, useContext } from "react"
import { Link } from "react-router-dom"
import { PlusIcon, SearchIcon, ArrowRightIcon, BuildingIcon } from "./Icons"
import { useAuth } from "../../context/AuthContext"
import CallTrackerForm from "./Call-Tracker-Form"
import NewCallTracker from "./NewCallTracker"
import * as leadToOrderAPI from "../../api/leadToOrderAPI";
import { Loader2, X, RefreshCwIcon, ShieldIcon } from "lucide-react"

// Animation classes
const slideIn = "animate-in slide-in-from-right duration-300"
const slideOut = "animate-out slide-out-to-right duration-300"
const fadeIn = "animate-in fade-in duration-300"
const fadeOut = "animate-out fade-out duration-300"

function CallTracker() {
  const { user: currentUser, user_access: userType, isAuthenticated, logout } = useAuth()
  const isAdmin = () => userType?.includes('all') || currentUser?.role === 'admin'
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("pending")
  const [pendingCallTrackers, setPendingCallTrackers] = useState([])
  const [historyCallTrackers, setHistoryCallTrackers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewCallTrackerForm, setShowNewCallTrackerForm] = useState(false)
  const [showCallTrackerModal, setShowCallTrackerModal] = useState(false)
  const [selectedLeadForCallTracker, setSelectedLeadForCallTracker] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [selectedTracker, setSelectedTracker] = useState(null)
  const [directEnquiryPendingTrackers, setDirectEnquiryPendingTrackers] = useState([])
  const [callingDaysFilter, setCallingDaysFilter] = useState([])
  const [enquiryNoFilter, setEnquiryNoFilter] = useState([])
  const [currentStageFilter, setCurrentStageFilter] = useState([])
  const [availableEnquiryNos, setAvailableEnquiryNos] = useState([])
  const [apiUserType, setApiUserType] = useState(null) // Store userType from API

  // Company, Person, and Phone filters (for pending tab)
  const [companyFilter, setCompanyFilter] = useState("all")
  const [personFilter, setPersonFilter] = useState("all")
  const [phoneFilter, setPhoneFilter] = useState("all")

  // Dropdown visibility states
  const [showCallingDaysDropdown, setShowCallingDaysDropdown] = useState(false)
  const [showEnquiryNoDropdown, setShowEnquiryNoDropdown] = useState(false)
  const [showCurrentStageDropdown, setShowCurrentStageDropdown] = useState(false)

  const [visibleColumns, setVisibleColumns] = useState({
    timestamp: true,
    enquiryNo: true,
    enquiryStatus: true,
    customerFeedback: true,
    currentStage: true,
    companyName: true,
    salesPersonName: true,
    sendQuotationNo: true,
    quotationSharedBy: true,
    quotationNumber: true,
    valueWithoutTax: true,
    valueWithTax: true,
    quotationUpload: true,
    quotationRemarks: true,
    validatorName: true,
    sendStatus: true,
    validationRemark: true,
    faqVideo: true,
    productVideo: true,
    offerVideo: true,
    productCatalog: true,
    productImage: true,
    nextCallDate: true,
    nextCallTime: true,
    orderStatus: true,
    acceptanceVia: true,
    paymentMode: true,
    paymentTerms: true,
    transportMode: true,
    registrationFrom: true,
    orderVideo: true,
    acceptanceFile: true,
    orderRemark: true,
    apologyVideo: true,
    reasonStatus: true,
    reasonRemark: true,
    holdReason: true,
    holdingDate: true,
    holdRemark: true,
  })
  const [showColumnDropdown, setShowColumnDropdown] = useState(false)

  // Helper function to determine priority based on status
  const determinePriority = (status) => {
    if (!status) return "Low"

    const statusLower = status.toLowerCase()
    if (statusLower === "hot") return "High"
    if (statusLower === "warm") return "Medium"
    return "Low"
  }

  // Helper function to format date to DD/MM/YYYY
  const formatDateToDDMMYYYY = (dateValue) => {
    if (!dateValue) return ""

    try {
      // Check if it's a Date object-like string (e.g. "Date(2025,3,22)")
      if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
        // Extract the parts from Date(YYYY,MM,DD) format
        const dateString = dateValue.substring(5, dateValue.length - 1)
        const [year, month, day] = dateString.split(",").map((part) => Number.parseInt(part.trim()))

        // JavaScript months are 0-indexed, but we need to display them as 1-indexed
        // Also ensure day and month are padded with leading zeros if needed
        return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
      }

      // Handle other date formats if needed
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
      }

      // If it's already in the correct format, return as is
      return dateValue
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateValue // Return the original value if formatting fails
    }
  }


  // Helper function to format time to 12-hour format with AM/PM
  const formatTimeTo12Hour = (timeValue) => {
    if (!timeValue) return ""

    try {
      // Check if it's a Date object-like string (e.g. "Date(1899,11,30,17,9,0)")
      if (typeof timeValue === "string" && timeValue.startsWith("Date(")) {
        // Extract the parts from Date(YYYY,MM,DD,HH,MM,SS) format
        const dateString = timeValue.substring(5, timeValue.length - 1)
        const parts = dateString.split(",")

        // If we have at least 5 parts (year, month, day, hour, minute)
        if (parts.length >= 5) {
          const hour = Number.parseInt(parts[3].trim())
          const minute = Number.parseInt(parts[4].trim())

          // Convert to 12-hour format
          const period = hour >= 12 ? "PM" : "AM"
          const displayHour = hour % 12 || 12 // Convert 0 to 12 for 12 AM

          // Format as h:mm AM/PM with leading zero for minutes when needed
          return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`
        }
      }

      // Handle HH:MM:SS format
      if (typeof timeValue === "string" && timeValue.includes(":")) {
        const [hour, minute] = timeValue.split(":").map((part) => Number.parseInt(part))

        // Convert to 12-hour format
        const period = hour >= 12 ? "PM" : "AM"
        const displayHour = hour % 12 || 12 // Convert 0 to 12 for 12 AM

        // Format as h:mm AM/PM
        return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`
      }

      // If it's already in the correct format or we can't parse it, return as is
      return timeValue
    } catch (error) {
      console.error("Error formatting time:", error)
      return timeValue // Return the original value if formatting fails
    }
  }

  // Helper function to check if a date is today
  const isToday = (dateStr) => {
    if (!dateStr) return false
    try {
      const date = new Date(dateStr.split("/").reverse().join("-"))
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      date.setHours(0, 0, 0, 0)
      return date.getTime() === today.getTime()
    } catch {
      return false
    }
  }

  // Helper function to check if a date is overdue
  const isOverdue = (dateStr) => {
    if (!dateStr) return false
    try {
      const date = new Date(dateStr.split("/").reverse().join("-"))
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      date.setHours(0, 0, 0, 0)
      return date < today
    } catch {
      return false
    }
  }

  // Helper function to check if a date is upcoming
  const isUpcoming = (dateStr) => {
    if (!dateStr) return false
    try {
      const date = new Date(dateStr.split("/").reverse().join("-"))
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      date.setHours(0, 0, 0, 0)
      return date > today
    } catch {
      return false
    }
  }

  const formatItemQty = (itemQtyString) => {
    if (!itemQtyString) return "";

    try {
      const items = JSON.parse(itemQtyString);

      // Check if items is actually an array
      if (!Array.isArray(items)) {
        // If it's not an array, return the original string or handle appropriately
        return typeof items === "object" ? "Invalid item format" : itemQtyString;
      }

      return items
        .filter(item => item.name && item.quantity && item.quantity !== "0")
        .map(item => `${item.name} : ${item.quantity}`)
        .join(", ");
    } catch (error) {
      console.error("Error parsing item quantity:", error);
      return itemQtyString; // Return original string if parsing fails
    }
  };


  // Replace the matchesCallingDaysFilter function with this updated version
  const matchesCallingDaysFilter = (dateStr, activeTab) => {
    if (callingDaysFilter.length === 0) return true;

    // Convert to lowercase for case-insensitive comparison
    const dateText = dateStr ? dateStr.toLowerCase() : '';

    return callingDaysFilter.some((filter) => {
      if (activeTab === "history") {
        // Special handling for history tab
        switch (filter) {
          case "today":
            return isToday(dateStr); // Use the isToday helper function
          case "older":
            return !isToday(dateStr); // Older days call
          default:
            return false;
        }
      } else {
        // Original handling for other tabs
        switch (filter) {
          case "today":
            return dateText.includes("today");
          case "overdue":
            return dateText.includes("overdue");
          case "upcoming":
            return dateText.includes("upcoming");
          default:
            return false;
        }
      }
    });
  };

  const handleColumnToggle = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }))
  }

  const handleSelectAll = () => {
    const allSelected = Object.values(visibleColumns).every(Boolean)
    const newState = Object.fromEntries(Object.keys(visibleColumns).map((key) => [key, !allSelected]))
    setVisibleColumns(newState)
  }

  const columnOptions = [
    { key: "timestamp", label: "Timestamp" },
    { key: "enquiryNo", label: "Enquiry No." },
    { key: "enquiryStatus", label: "Enquiry Status" },
    { key: "companyName", label: "Comapny Name" },
    { key: "salesPersonName", label: "Sales Person Name" },
    { key: "customerFeedback", label: "What Did Customer Say" },
    { key: "currentStage", label: "Current Stage" },
    { key: "sendQuotationNo", label: "Send Quotation No." },
    { key: "quotationSharedBy", label: "Quotation Shared By" },
    { key: "quotationNumber", label: "Quotation Number" },
    { key: "valueWithoutTax", label: "Value Without Tax" },
    { key: "valueWithTax", label: "Value With Tax" },
    { key: "quotationUpload", label: "Quotation Upload" },
    { key: "quotationRemarks", label: "Quotation Remarks" },
    { key: "validatorName", label: "Validator Name" },
    { key: "sendStatus", label: "Send Status" },
    { key: "validationRemark", label: "Validation Remark" },
    { key: "faqVideo", label: "FAQ Video" },
    { key: "productVideo", label: "Product Video" },
    { key: "offerVideo", label: "Offer Video" },
    { key: "productCatalog", label: "Product Catalog" },
    { key: "productImage", label: "Product Image" },
    { key: "nextCallDate", label: "Next Call Date" },
    { key: "nextCallTime", label: "Next Call Time" },
    { key: "orderStatus", label: "Order Status" },
    { key: "acceptanceVia", label: "Acceptance Via" },
    { key: "paymentMode", label: "Payment Mode" },
    { key: "paymentTerms", label: "Payment Terms" },
    { key: "transportMode", label: "Transport Mode" },
    { key: "registrationFrom", label: "Registration From" },
    { key: "orderVideo", label: "Order Video" },
    { key: "acceptanceFile", label: "Acceptance File" },
    { key: "orderRemark", label: "Remark" },
    { key: "apologyVideo", label: "Apology Video" },
    { key: "reasonStatus", label: "Reason Status" },
    { key: "reasonRemark", label: "Reason Remark" },
    { key: "holdReason", label: "Hold Reason" },
    { key: "holdingDate", label: "Holding Date" },
    { key: "holdRemark", label: "Hold Remark" },
  ]

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setShowCallingDaysDropdown(false)
        setShowEnquiryNoDropdown(false)
        setShowCurrentStageDropdown(false)
        setShowColumnDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handle modal visibility and body scroll
  useEffect(() => {
    if (showCallTrackerModal || showNewCallTrackerForm) {
      document.body.style.overflow = 'hidden'
      const navContainer = document.getElementById('main-nav-container')
      if (navContainer) navContainer.style.display = 'none'
      const sidebar = document.querySelector('aside')
      if (sidebar) sidebar.style.display = 'none'
    } else {
      document.body.style.overflow = 'auto'
      const navContainer = document.getElementById('main-nav-container')
      if (navContainer) navContainer.style.display = ''
      const sidebar = document.querySelector('aside')
      if (sidebar) sidebar.style.display = ''
    }
  }, [showCallTrackerModal, showNewCallTrackerForm])



  // Function to fetch data from FMS and Enquiry Tracker sheets
  // ================================
  // FIXED FETCH FUNCTION WITH MAPPING
  // ================================
  // ================================
  // FIXED FETCH FUNCTION WITH MAPPING AND CORS FIX
  // ================================
  useEffect(() => {
    const fetchCallTrackerData = async () => {
      try {
        setIsLoading(true);

        // ---------------------------------------------
        // 🔵 1) MAP PENDING (FMS LEADS) ROWS
        // ---------------------------------------------
        const mapPending = (row) => ({
          id: row.id,
          timestamp: row.created_at,
          leadId: row.lead_no,
          receiverName: row.lead_receiver_name,
          leadSource: row.lead_source,
          phoneNumber: row.phone_number,
          salespersonName: row.salesperson_name,
          companyName: row.company_name,
          currentStage: row.current_stage,
          callingDate: row.next_call_date
            ? formatDateToDDMMYYYY(row.next_call_date)
            : "",
          assignedTo: row.sc_name,
          itemQty: row.item_qty,
          priority: determinePriority(row.lead_source),
        });

        // ---------------------------------------------
        // 🔵 2) MAP DIRECT ENQUIRY PENDING (enquiry_to_order)
        // ---------------------------------------------
        const mapDirect = (row) => ({
          id: row.id,
          timestamp: row.timestamp,
          leadId: row.en_enquiry_no,
          leadSource: row.lead_source,
          companyName: row.company_name,
          enquiryReceiverName: row.enquiry_receiver_name,
          currentStage: row.current_stage,
          callingDate1: row.next_call_date
            ? formatDateToDDMMYYYY(row.next_call_date)
            : "",
          itemQty: row.item_qty,
          priority: determinePriority(row.lead_source),
        });

        // ---------------------------------------------
        // 🔵 3) MAP HISTORY (enquiry_tracker)
        // ---------------------------------------------
        const mapHistory = (row) => ({
          id: row.id,
          timestamp: row.timestamp,
          enquiryNo: row.enquiry_no,
          enquiryStatus: row.enquiry_status,
          companyName: row.party_name || "",
          salesPersonName: row.sales_person_name || "",
          customerFeedback: row.what_did_customer_say,
          currentStage: row.current_stage,
          nextCallDate: row.next_call_date
            ? formatDateToDDMMYYYY(row.next_call_date)
            : "",
          nextCallTime: row.next_call_time,
          orderStatus: row.is_order_received_status,
          acceptanceVia: row.acceptance_via,
          paymentMode: row.payment_mode,
          paymentTerms: row.payment_terms_in_days,
          transportMode: row.transport_mode,
          orderRemark: row.remark,
          reasonStatus: row.if_no_relevant_reason_status,
          reasonRemark: row.if_no_relevant_reason_remark,
          holdReason: row.customer_order_hold_reason_category,
          holdingDate: row.holding_date
            ? formatDateToDDMMYYYY(row.holding_date)
            : "",
          holdRemark: row.hold_remark,
        });

        // Use centralized API service with Promise.allSettled for error resilience
        const [pendingResponse, directResponse, historyResponse] = await Promise.allSettled([
          leadToOrderAPI.getPendingFMS(),
          leadToOrderAPI.getDirectEnquiryPending(),
          leadToOrderAPI.getEnquiryHistory()
        ]);

        // Handle pending response
        if (pendingResponse.status === 'fulfilled') {
          const pendingData = pendingResponse.value?.data;

          // Check if response is HTML
          if (typeof pendingData === 'string' && (pendingData.trim().startsWith('<!DOCTYPE') || pendingData.trim().startsWith('<html'))) {
            console.warn("Backend returned HTML instead of JSON for pending FMS. Using empty data.");
            setPendingCallTrackers([]);
          } else if (pendingData?.success && Array.isArray(pendingData.data)) {
            // Store userType from API response
            if (pendingData.userType) {
              setApiUserType(pendingData.userType);
            }
            setPendingCallTrackers((pendingData.data || []).map(mapPending));
          } else {
            setPendingCallTrackers([]);
          }
        } else {
          console.warn("Error fetching pending FMS:", pendingResponse.reason);
          setPendingCallTrackers([]);
        }

        // Handle direct enquiry pending response
        if (directResponse.status === 'fulfilled') {
          const directData = directResponse.value?.data;

          // Check if response is HTML
          if (typeof directData === 'string' && (directData.trim().startsWith('<!DOCTYPE') || directData.trim().startsWith('<html'))) {
            console.warn("Backend returned HTML instead of JSON for direct enquiry. Using empty data.");
            setDirectEnquiryPendingTrackers([]);
          } else if (directData?.success && Array.isArray(directData.data)) {
            setDirectEnquiryPendingTrackers((directData.data || []).map(mapDirect));
          } else {
            setDirectEnquiryPendingTrackers([]);
          }
        } else {
          console.warn("Error fetching direct enquiry:", directResponse.reason);
          setDirectEnquiryPendingTrackers([]);
        }

        // Handle history response
        if (historyResponse.status === 'fulfilled') {
          const historyData = historyResponse.value?.data;

          // Check if response is HTML
          if (typeof historyData === 'string' && (historyData.trim().startsWith('<!DOCTYPE') || historyData.trim().startsWith('<html'))) {
            console.warn("Backend returned HTML instead of JSON for enquiry history. Using empty data.");
            setHistoryCallTrackers([]);
          } else if (historyData?.success && Array.isArray(historyData.data)) {
            setHistoryCallTrackers((historyData.data || []).map(mapHistory));
          } else {
            setHistoryCallTrackers([]);
          }
        } else {
          console.warn("Error fetching enquiry history:", historyResponse.reason);
          setHistoryCallTrackers([]);
        }

        // Build Enquiry number dropdown list from successfully fetched data
        const allNos = new Set();

        if (pendingResponse.status === 'fulfilled' && pendingResponse.value?.data?.success) {
          (pendingResponse.value.data.data || []).forEach((i) => i.lead_no && allNos.add(i.lead_no));
        }
        if (directResponse.status === 'fulfilled' && directResponse.value?.data?.success) {
          (directResponse.value.data.data || []).forEach((i) => i.en_enquiry_no && allNos.add(i.en_enquiry_no));
        }
        if (historyResponse.status === 'fulfilled' && historyResponse.value?.data?.success) {
          (historyResponse.value.data.data || []).forEach((i) => i.enquiry_no && allNos.add(i.enquiry_no));
        }

        setAvailableEnquiryNos(Array.from(allNos).sort());

      } catch (err) {
        console.error("Frontend Fetch Error:", err);
        setPendingCallTrackers([]);
        setDirectEnquiryPendingTrackers([]);
        setHistoryCallTrackers([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchCallTrackerData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, userType, currentUser?.role]);


  // Enhanced filter function for search and dropdown filters
  const filterTrackers = (tracker, searchTerm, activeTab) => {
    // Search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchesSearch = Object.values(tracker).some(
        (value) => value && value.toString().toLowerCase().includes(term),
      )
      if (!matchesSearch) return false
    }

    // Company filter (only for pending tab)
    if (activeTab === "pending" && companyFilter !== "all") {
      const companyName = tracker.companyName || ""
      if (companyName.toLowerCase() !== companyFilter.toLowerCase()) return false
    }

    // Person filter (only for pending tab)
    if (activeTab === "pending" && personFilter !== "all") {
      const personName = tracker.salespersonName || ""
      if (personName.toLowerCase() !== personFilter.toLowerCase()) return false
    }

    // Phone filter (only for pending tab)
    if (activeTab === "pending" && phoneFilter !== "all") {
      const phoneNumber = tracker.phoneNumber ? tracker.phoneNumber.toString().trim() : ""
      if (phoneNumber !== phoneFilter.toString().trim()) return false
    }

    // Enquiry number filter
    if (enquiryNoFilter.length > 0) {
      const enquiryNo = activeTab === "history" ? tracker.enquiryNo : tracker.leadId
      if (!enquiryNoFilter.includes(enquiryNo)) return false
    }

    // Current stage filter
    if (currentStageFilter.length > 0) {
      const currentStage = tracker.currentStage || ""
      if (!currentStageFilter.includes(currentStage)) return false
    }

    // Calling days filter
    if (callingDaysFilter.length > 0) {
      const callingDate = tracker.callingDate || ""
      if (!matchesCallingDaysFilter(callingDate, activeTab)) return false
    }

    return true
  }

  const filteredPendingCallTrackers = pendingCallTrackers.filter((tracker) =>
    filterTrackers(tracker, searchTerm, "pending"),
  )

  const filteredHistoryCallTrackers = historyCallTrackers.filter((tracker) =>
    filterTrackers(tracker, searchTerm, "history"),
  )

  const filteredDirectEnquiryPendingTrackers = directEnquiryPendingTrackers.filter((tracker) =>
    filterTrackers(tracker, searchTerm, "directEnquiry"),
  )

  // Toggle dropdown visibility
  const toggleCallingDaysDropdown = (e) => {
    e.stopPropagation()
    setShowCallingDaysDropdown(!showCallingDaysDropdown)
    setShowEnquiryNoDropdown(false)
    setShowCurrentStageDropdown(false)
  }

  const toggleEnquiryNoDropdown = (e) => {
    e.stopPropagation()
    setShowEnquiryNoDropdown(!showEnquiryNoDropdown)
    setShowCallingDaysDropdown(false)
    setShowCurrentStageDropdown(false)
  }

  const toggleCurrentStageDropdown = (e) => {
    e.stopPropagation()
    setShowCurrentStageDropdown(!showCurrentStageDropdown)
    setShowCallingDaysDropdown(false)
    setShowEnquiryNoDropdown(false)
  }

  // Handle checkbox changes
  const handleCallingDaysChange = (value) => {
    if (callingDaysFilter.includes(value)) {
      setCallingDaysFilter(callingDaysFilter.filter(item => item !== value))
    } else {
      setCallingDaysFilter([...callingDaysFilter, value])
    }
  }

  const handleEnquiryNoChange = (value) => {
    if (enquiryNoFilter.includes(value)) {
      setEnquiryNoFilter(enquiryNoFilter.filter(item => item !== value))
    } else {
      setEnquiryNoFilter([...enquiryNoFilter, value])
    }
  }

  const handleCurrentStageChange = (value) => {
    if (currentStageFilter.includes(value)) {
      setCurrentStageFilter(currentStageFilter.filter(item => item !== value))
    } else {
      setCurrentStageFilter([...currentStageFilter, value])
    }
  }

  // Add this function inside your CallTracker component
  const calculateFilterCounts = () => {
    const counts = {
      today: 0,
      overdue: 0,
      upcoming: 0,
      older: 0
    };

    if (activeTab === "pending" || activeTab === "directEnquiry") {
      const trackers = activeTab === "pending" ? pendingCallTrackers : directEnquiryPendingTrackers;

      trackers.forEach(tracker => {
        const dateStr = tracker.callingDate || tracker.callingDate1;
        if (isToday(dateStr)) counts.today++;
        else if (isOverdue(dateStr)) counts.overdue++;
        else if (isUpcoming(dateStr)) counts.upcoming++;
      });
    } else if (activeTab === "history") {
      historyCallTrackers.forEach(tracker => {
        const dateStr = tracker.callingDate;
        if (isToday(dateStr)) counts.today++;
        else counts.older++;
      });
    }

    return counts;
  };

  const filterCounts = calculateFilterCounts();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 sm:pb-8">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sm:py-6 lg:py-8 mb-4 sm:mb-8 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent tracking-tight">
                Call Tracker Interface
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 rounded-full border border-purple-100">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                  <p className="text-purple-700 font-bold text-xs uppercase tracking-wider">
                    {isLoading ? "Synchronizing..." : `${pendingCallTrackers.length + historyCallTrackers.length + directEnquiryPendingTrackers.length} active sequences`}
                  </p>
                </div>
                {(apiUserType === "admin" || isAdmin()) && (
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shadow-sm">HQ Access</span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
              <div className="relative group min-w-[300px]">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-600 transition-colors">
                  <SearchIcon className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  placeholder="Scan queue..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-600 transition-all font-bold text-sm text-slate-700 shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => window.location.reload()}
                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-purple-600 hover:border-purple-200 hover:shadow-lg transition-all active:scale-90"
                title="Synchronize Data"
              >
                <RefreshCwIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowNewCallTrackerForm(true)}
                className="group relative px-8 py-3 bg-slate-900 overflow-hidden rounded-2xl shadow-xl hover:shadow-purple-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <PlusIcon className="w-5 h-5 text-white relative z-10" />
                <span className="text-white text-xs font-black uppercase tracking-widest relative z-10">Direct Sequence</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
        {/* Tab System - Mobile Optimized */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm mb-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold transition-all rounded-lg whitespace-nowrap ${activeTab === "pending"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
              : "text-slate-500 hover:text-slate-700"
              }`}
          >
            Pending Tracker
            <span className={`px-2 py-0.5 text-[10px] rounded-full ${activeTab === "pending" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {filteredPendingCallTrackers.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("directEnquiry")}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold transition-all rounded-lg whitespace-nowrap ${activeTab === "directEnquiry"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
              : "text-slate-500 hover:text-slate-700"
              }`}
          >
            Direct Pending
            <span className={`px-2 py-0.5 text-[10px] rounded-full ${activeTab === "directEnquiry" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {filteredDirectEnquiryPendingTrackers.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold transition-all rounded-lg whitespace-nowrap ${activeTab === "history"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
              : "text-slate-500 hover:text-slate-700"
              }`}
          >
            History
            <span className={`px-2 py-0.5 text-[10px] rounded-full ${activeTab === "history" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {filteredHistoryCallTrackers.length}
            </span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm relative z-30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Calling Days Dropdown */}
            <div className="space-y-1.5 dropdown-container relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Calling Schedule</label>
              <button
                onClick={toggleCallingDaysDropdown}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-700 hover:border-purple-300 transition-colors"
              >
                <span>{callingDaysFilter.length === 0 ? "All Days" : `${callingDaysFilter.length} Selected`}</span>
                <svg className={`w-4 h-4 transition-transform ${showCallingDaysDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showCallingDaysDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {['today', 'overdue', 'upcoming'].map(key => (
                    <label key={key} className="flex items-center justify-between p-2 hover:bg-purple-50 rounded-lg cursor-pointer group transition-colors">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={callingDaysFilter.includes(key)}
                          onChange={() => handleCallingDaysChange(key)}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-xs font-bold text-slate-700 capitalize">{key}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 group-hover:text-purple-600">{filterCounts[key] || 0}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Stage Filter */}
            <div className="space-y-1.5 dropdown-container relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Workflow Stage</label>
              <button
                onClick={toggleCurrentStageDropdown}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-700 hover:border-purple-300 transition-colors"
              >
                <span>{currentStageFilter.length === 0 ? "All Stages" : `${currentStageFilter.length} Selected`}</span>
                <svg className={`w-4 h-4 transition-transform ${showCurrentStageDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showCurrentStageDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[240px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 animate-in fade-in duration-200 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {[...new Set([...pendingCallTrackers, ...directEnquiryPendingTrackers, ...historyCallTrackers].map(t => t.currentStage))].filter(Boolean).sort().map(stage => (
                    <label key={stage} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-purple-600" checked={currentStageFilter.includes(stage)} onChange={() => handleCurrentStageChange(stage)} />
                      <span className="text-xs font-bold text-slate-700">{stage.replace('-', ' ')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Entity Filters for Pending Tracker */}
            {(activeTab === "pending" || activeTab === "directEnquiry") && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Enquiry ID</label>
                <div className="dropdown-container relative">
                  <button onClick={toggleEnquiryNoDropdown} className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-700 overflow-hidden">
                    <span className="truncate">{enquiryNoFilter.length === 0 ? "Select ID" : `${enquiryNoFilter.length} IDs`}</span>
                    <svg className={`w-4 h-4 shrink-0 transition-transform ${showEnquiryNoDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {showEnquiryNoDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 max-h-[250px] overflow-y-auto no-scrollbar">
                      {availableEnquiryNos.map(no => (
                        <label key={no} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-purple-600" checked={enquiryNoFilter.includes(no)} onChange={() => handleEnquiryNoChange(no)} />
                          <span className="text-xs font-mono font-black text-slate-700">{no}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Quick Actions / Reset */}
            <div className="sm:col-span-2 xl:col-span-2 flex items-end gap-2">
              <button
                onClick={() => {
                  setCallingDaysFilter([])
                  setEnquiryNoFilter([])
                  setCurrentStageFilter([])
                  setCompanyFilter("all")
                  setPersonFilter("all")
                  setPhoneFilter("all")
                }}
                className="flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors h-[38px]"
              >
                Reset All
              </button>
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 h-[38px]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
                Columns
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="relative flex h-20 w-20">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-20"></span>
                <Loader2 className="h-10 w-10 text-purple-600 absolute inset-0 m-auto animate-spin" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mt-6 uppercase tracking-widest">Compiling Trackers...</h3>
              <p className="text-slate-500 font-medium text-sm mt-2">Accessing secure sales sequence database</p>
            </div>
          ) : (
            <div className="relative">
              <div className="overflow-x-auto custom-scrollbar hidden lg:block">
                {activeTab === "pending" && (
                  <table className="w-full text-left border-collapse min-w-[1400px]">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800">
                        <th className="sticky top-0 left-0 z-30 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-800">Process</th>
                        <th className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Reference</th>
                        <th className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Schedule</th>
                        <th className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Entity & Identity</th>
                        <th className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Sales Context</th>
                        <th className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Current Stage</th>
                        <th className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Itemization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPendingCallTrackers.length > 0 ? (
                        filteredPendingCallTrackers.map((tracker, idx) => (
                          <tr key={idx} className="group hover:bg-purple-50/30 transition-all duration-200">
                            <td className="sticky left-0 z-10 bg-white group-hover:bg-purple-50/30 px-6 py-4 border-r border-slate-100 transition-colors">
                              <button
                                onClick={() => {
                                  setSelectedLeadForCallTracker(tracker.leadId)
                                  setShowCallTrackerModal(true)
                                }}
                                className="px-4 py-2 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-purple-200 hover:bg-purple-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                              >
                                <ArrowRightIcon className="w-3.5 h-3.5" />
                                Process Leads
                              </button>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-black font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded mb-1">{tracker.leadId}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${tracker.priority === "High" ? "bg-rose-100 text-rose-600" : tracker.priority === "Medium" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}>{tracker.priority}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-700">{tracker.callingDate}</span>
                                <span className={`text-[9px] font-bold mt-0.5 ${isOverdue(tracker.callingDate) ? "text-rose-500 animate-pulse" : isToday(tracker.callingDate) ? "text-amber-500" : "text-slate-400"}`}>
                                  {isOverdue(tracker.callingDate) ? "● Overdue" : isToday(tracker.callingDate) ? "● Today" : "● Upcoming"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <BuildingIcon className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-sm font-black text-slate-800">{tracker.companyName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold text-slate-500">{tracker.salespersonName}</span>
                                  <span className="text-[10px] font-black text-purple-600">{tracker.phoneNumber}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest text-[9px] mb-1">Source: {tracker.leadSource}</span>
                                <span className="text-xs font-medium text-slate-400 italic line-clamp-1">Rec: {tracker.receiverName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm whitespace-nowrap">
                                {tracker.currentStage?.replace('-', ' ') || "Initial"}
                              </span>
                            </td>
                            <td className="px-6 py-4 min-w-[300px]">
                              <div className="flex flex-wrap gap-1.5 leading-tight">
                                {JSON.parse(tracker.itemQty || '[]').filter(i => i.name && i.quantity !== "0").slice(0, 3).map((item, k) => (
                                  <span key={k} className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-black rounded-md flex items-center">
                                    {item.name} <span className="ml-1 text-purple-600 text-[9px]">{item.quantity}</span>
                                  </span>
                                ))}
                                {JSON.parse(tracker.itemQty || '[]').length > 3 && <span className="text-[9px] font-black text-slate-400 self-center">+{JSON.parse(tracker.itemQty).length - 3} more</span>}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-24 text-center">
                            <div className="flex flex-col items-center justify-center opacity-40">
                              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <SearchIcon className="w-10 h-10 text-slate-300" />
                              </div>
                              <h4 className="text-lg font-black text-slate-400 uppercase tracking-[0.2em]">Terminal Clearance</h4>
                              <p className="text-sm font-medium text-slate-400 mt-2">No pending enquiry sequences remain in queue</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === "directEnquiry" && (
                  <table className="w-full text-left border-collapse min-w-[1400px]">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800">
                        <th className="sticky top-0 left-0 z-30 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-800">Process</th>
                        <th className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Reference</th>
                        <th className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Schedule</th>
                        <th className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Entity & Identity</th>
                        <th className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Enquiry Context</th>
                        <th className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Current Stage</th>
                        <th className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Itemization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDirectEnquiryPendingTrackers.length > 0 ? (
                        filteredDirectEnquiryPendingTrackers.map((tracker, idx) => (
                          <tr key={idx} className={`group hover:bg-purple-50/30 transition-all duration-200 ${isOverdue(tracker.callingDate1) ? 'bg-rose-50/40' : ''}`}>
                            <td className="sticky left-0 z-10 bg-white group-hover:bg-purple-50/30 px-6 py-4 border-r border-slate-100 transition-colors">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setSelectedLeadForCallTracker(tracker.leadId)
                                    setShowCallTrackerModal(true)
                                  }}
                                  className="px-3 py-1.5 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-purple-200 hover:bg-purple-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                                >
                                  Process <ArrowRightIcon className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedTracker(tracker)
                                    setShowPopup(true)
                                  }}
                                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:bg-slate-50 transition-all"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-black font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded mb-1">{tracker.leadId}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${tracker.priority === "High" ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"}`}>{tracker.leadSource}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col">
                                <span className={`text-xs font-black ${isOverdue(tracker.callingDate1) ? 'text-rose-600' : 'text-slate-700'}`}>{tracker.callingDate1}</span>
                                <span className={`text-[9px] font-bold mt-0.5 ${isOverdue(tracker.callingDate1) ? "text-rose-500 animate-pulse" : isToday(tracker.callingDate1) ? "text-amber-500" : "text-slate-400"}`}>
                                  {isOverdue(tracker.callingDate1) ? "● Overdue" : isToday(tracker.callingDate1) ? "● Today" : "● Upcoming"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <BuildingIcon className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-sm font-black text-slate-800">{tracker.companyName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold text-slate-500">Rec: {tracker.enquiryReceiverName}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-700">ORD-{tracker.leadId?.slice(-4)}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Direct Access</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm whitespace-nowrap">
                                {tracker.currentStage?.replace('-', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 min-w-[300px]">
                              <div className="flex flex-wrap gap-1.5 leading-tight">
                                {formatItemQty(tracker.itemQty) ? (
                                  <span className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-black rounded-md">
                                    {formatItemQty(tracker.itemQty)}
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-slate-400 italic">No items specified</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center text-sm text-slate-500">
                            No direct enquiry pending trackers found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === "history" && (
                  <table className="w-full text-left border-collapse min-w-[1800px]">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800">
                        <th className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Reference</th>
                        {columnOptions.map(col => visibleColumns[col.key] && (
                          <th key={col.key} className="sticky top-0 z-20 bg-slate-900 px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistoryCallTrackers.length > 0 ? (
                        filteredHistoryCallTrackers.map((tracker, idx) => (
                          <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-center">
                              <span className="text-xs font-black font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded">{tracker.enquiryNo}</span>
                            </td>
                            {columnOptions.map(col => visibleColumns[col.key] && (
                              <td key={col.key} className="px-6 py-4 text-xs font-medium text-slate-600">
                                {col.key === 'itemQty' ? (
                                  <div className="max-w-[300px] break-words">
                                    {formatItemQty(tracker[col.key])}
                                  </div>
                                ) : col.key === 'enquiryStatus' ? (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${tracker[col.key] === "Hot" ? "bg-rose-100 text-rose-600" : tracker[col.key] === "Warm" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                                    {tracker[col.key]}
                                  </span>
                                ) : (
                                  tracker[col.key] || "—"
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columnOptions.filter(c => visibleColumns[c.key]).length + 1} className="py-24 text-center">
                            <div className="flex flex-col items-center justify-center opacity-40">
                              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <SearchIcon className="w-10 h-10 text-slate-300" />
                              </div>
                              <h4 className="text-lg font-black text-slate-400 uppercase tracking-[0.2em]">Archive Empty</h4>
                              <p className="text-sm font-medium text-slate-400 mt-2">No historical sequences found matching your search</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden p-4 space-y-4 bg-slate-50">
                {activeTab === "pending" && (
                  filteredPendingCallTrackers.length > 0 ? (
                    filteredPendingCallTrackers.map((tracker, idx) => (
                      <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-black font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit mb-1">{tracker.leadId}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter w-fit ${tracker.priority === "High" ? "bg-rose-100 text-rose-600" : tracker.priority === "Medium" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}>{tracker.priority} Priority</span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedLeadForCallTracker(tracker.leadId)
                              setShowCallTrackerModal(true)
                            }}
                            className="p-2 bg-purple-600 text-white rounded-lg shadow-lg shadow-purple-200"
                          >
                            <ArrowRightIcon className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400">Schedule</span>
                            <span className="text-sm font-black text-slate-700">{tracker.callingDate}</span>
                            <span className={`text-[10px] font-bold ${isOverdue(tracker.callingDate) ? "text-rose-500" : isToday(tracker.callingDate) ? "text-amber-500" : "text-slate-400"}`}>
                              {isOverdue(tracker.callingDate) ? "Overdue" : isToday(tracker.callingDate) ? "Today" : "Upcoming"}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400">Stage</span>
                            <span className="text-[10px] font-black text-purple-600 uppercase bg-purple-50 px-2 py-1 rounded w-fit mt-1">
                              {tracker.currentStage?.replace('-', ' ') || "Initial"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-3">
                            <BuildingIcon className="w-4 h-4 text-slate-400" />
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-800">{tracker.companyName}</span>
                              <span className="text-xs text-slate-500">{tracker.salespersonName} • {tracker.phoneNumber}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">Items</span>
                          <div className="flex flex-wrap gap-1.5">
                            {(() => {
                              try {
                                const items = JSON.parse(tracker.itemQty || '[]');
                                if (Array.isArray(items) && items.length > 0) {
                                  return items.filter(i => i.name && i.quantity !== "0").map((item, k) => (
                                    <span key={k} className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-black rounded-md">
                                      {item.name} ({item.quantity})
                                    </span>
                                  ));
                                }
                                return <span className="text-xs text-slate-400 italic">No items specified</span>;
                              } catch (e) {
                                return <span className="text-xs text-slate-400 italic">No items specified</span>;
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center opacity-40">
                      <SearchIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-black uppercase">No Sequences</p>
                    </div>
                  )
                )}

                {activeTab === "directEnquiry" && (
                  filteredDirectEnquiryPendingTrackers.length > 0 ? (
                    filteredDirectEnquiryPendingTrackers.map((tracker, idx) => (
                      <div key={idx} className={`bg-white rounded-2xl p-5 shadow-sm border ${isOverdue(tracker.callingDate1) ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-black font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit mb-1">{tracker.leadId}</span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{tracker.leadSource}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedTracker(tracker)
                                setShowPopup(true)
                              }}
                              className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg"
                            >
                              <SearchIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLeadForCallTracker(tracker.leadId)
                                setShowCallTrackerModal(true)
                              }}
                              className="p-2 bg-purple-600 text-white rounded-lg shadow-lg shadow-purple-200"
                            >
                              <ArrowRightIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400">Schedule</span>
                            <span className={`text-sm font-black ${isOverdue(tracker.callingDate1) ? 'text-rose-600' : 'text-slate-700'}`}>{tracker.callingDate1}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400">Stage</span>
                            <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit mt-1">
                              {tracker.currentStage?.replace('-', ' ') || "Initial"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-3">
                            <BuildingIcon className="w-4 h-4 text-slate-400" />
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-800">{tracker.companyName}</span>
                              <span className="text-xs text-slate-500">Receiver: {tracker.enquiryReceiverName}</span>
                            </div>
                          </div>
                        </div>

                        {formatItemQty(tracker.itemQty) && (
                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Items</span>
                            <p className="text-xs font-bold text-slate-600">{formatItemQty(tracker.itemQty)}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400">No records found</div>
                  )
                )}

                {activeTab === "history" && (
                  filteredHistoryCallTrackers.length > 0 ? (
                    filteredHistoryCallTrackers.map((tracker, idx) => (
                      <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xs font-black font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded">{tracker.enquiryNo}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${tracker.enquiryStatus === "Hot" ? "bg-rose-100 text-rose-600" : tracker.enquiryStatus === "Warm" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                            {tracker.enquiryStatus}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {columnOptions.map((col) => (
                            visibleColumns[col.key] && col.key !== 'enquiryNo' && (
                              <div key={col.key} className="flex justify-between items-start gap-4">
                                <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">{col.label}</span>
                                <span className="text-xs font-bold text-slate-700 text-right">
                                  {col.key === 'itemQty' ? formatItemQty(tracker[col.key]) : (tracker[col.key] || "—")}
                                </span>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400">No history found</div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Call Tracker Form Modal */}
      {
        showNewCallTrackerForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-20">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => setShowNewCallTrackerForm(false)}
            ></div>
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 flex justify-between items-center text-white shrink-0">
                <h2 className="text-xl font-bold tracking-tight">New Call Tracker</h2>
                <button
                  onClick={() => setShowNewCallTrackerForm(false)}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <CallTrackerForm />
              </div>
            </div>
          </div>
        )
      }

      {/* View Popup Modal */}
      {
        showPopup && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <div
              className={`absolute inset-0 bg-slate-900/60 backdrop-blur-md ${fadeIn}`}
              onClick={() => setShowPopup(false)}
            ></div>
            <div
              className={`relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col ${slideIn} border border-slate-200`}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:px-10 sm:py-8 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
                    <span className="p-2 bg-white/10 rounded-xl border border-white/20">
                      {activeTab === "history" ? "📜" : "⚡"}
                    </span>
                    {activeTab === "pending" || activeTab === "directEnquiry"
                      ? `Lead Architecture`
                      : `Event History`}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-black uppercase tracking-widest border border-white/10">ID: {activeTab === "history" ? selectedTracker?.enquiryNo : selectedTracker?.leadId}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                    <p className="text-slate-400 text-xs font-bold font-mono">Sequence Analysis Mode</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPopup(false)}
                  className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl transition-all border border-white/10 group active:scale-90 relative z-10"
                >
                  <X className="h-6 w-6 text-white group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
                <div className="space-y-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(activeTab === "pending" || activeTab === "directEnquiry" ? [
                      { label: "Lead ID", value: selectedTracker?.leadId, icon: "🆔", bold: true },
                      { label: "Gatekeeper", value: selectedTracker?.receiverName || "N/A", icon: "👤" },
                      { label: "Origin", value: selectedTracker?.leadSource, icon: "📍", badge: true },
                      { label: "Strategist", value: selectedTracker?.salespersonName, icon: "🤵" },
                      { label: "Entity", value: selectedTracker?.companyName, icon: "🏢", bold: true },
                      { label: "Timestamp", value: selectedTracker?.createdAt, icon: "📅" },
                      { label: "Comms", value: selectedTracker?.phoneNumber, icon: "�" },
                      { label: "Urgency", value: selectedTracker?.priority, icon: "🔥", badge: true },
                      { label: "Milestone", value: selectedTracker?.stage, icon: "🪜" },
                    ] : [
                      { label: "Enquiry ID", value: selectedTracker?.enquiryNo, icon: "🆔", bold: true },
                      { label: "Log Time", value: selectedTracker?.timestamp, icon: "⏰" },
                      { label: "Disposition", value: selectedTracker?.enquiryStatus, icon: "📈", badge: true },
                      { label: "Current Logic", value: selectedTracker?.currentStage, icon: "🪜" },
                      { label: "Next Interval", value: selectedTracker?.nextCallDate, icon: "📅" },
                      { label: "Window", value: selectedTracker?.nextCallTime, icon: "🕓" },
                      { label: "Fulfilment", value: selectedTracker?.orderStatus, icon: "📦" },
                      { label: "Commerce", value: selectedTracker?.paymentMode, icon: "💳" },
                      { label: "Provisions", value: selectedTracker?.paymentTerms || "Standard", icon: "📝" },
                    ]).map((item, idx) => (
                      <div key={idx} className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all duration-300">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{item.label}</p>
                            {item.badge ? (
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.value?.toLowerCase().includes("high") || item.value?.toLowerCase().includes("hot") ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"}`}>
                                {item.value}
                              </span>
                            ) : (
                              <p className={`text-sm ${item.bold ? "font-black text-slate-900" : "font-bold text-slate-600"} truncate`} title={item.value}>
                                {item.value || "—"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Feedback Section */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                    <div className="relative bg-slate-900 p-8 rounded-3xl text-white shadow-2xl overflow-hidden leading-relaxed">
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017V14C19.017 11.2386 16.7784 9 14.017 9V7C17.883 7 21.017 10.134 21.017 14V21H14.017ZM3.017 21L3.017 18C3.017 16.8954 3.9124 16 5.017 16H8.017V14C8.017 11.2386 5.7784 9 3.017 9V7C6.883 7 10.017 10.134 10.017 14V21H3.017Z" /></svg>
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-[0.3em] text-purple-400 mb-6 flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
                        Insights & Intelligence
                      </h4>
                      <p className="text-lg sm:text-xl font-medium text-slate-200 indent-8 italic tracking-tight">
                        {activeTab === "pending" || activeTab === "directEnquiry"
                          ? "Initial sequence deployed. Intelligence gathering in progress. No previous feedback recorded for this lead node."
                          : (selectedTracker?.customerFeedback || "The subject provided no qualitative feedback for this specific event cycle.")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 sm:px-10 bg-white border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
                <button
                  onClick={() => setShowPopup(false)}
                  className="w-full sm:w-auto px-10 py-3.5 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all border border-slate-200"
                >
                  Dismiss
                </button>
                {(activeTab === "pending" || activeTab === "directEnquiry") && (
                  <Link
                    to={`/call-tracker/new?leadId=${selectedTracker?.leadId}`}
                    className="w-full sm:w-auto"
                  >
                    <button className="w-full px-12 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-purple-500/20 transition-all transform hover:-translate-y-1 hover:shadow-purple-500/30 active:translate-y-0">
                      Initiate Protocol <ArrowRightIcon className="ml-2 h-4 w-4 inline-block group-hover:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Call Tracker Modal (Process Button) */}
      {
        showCallTrackerModal && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-12 sm:pt-20">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => {
                setShowCallTrackerModal(false)
                setSelectedLeadForCallTracker(null)
                document.body.style.overflow = 'auto'
              }}
            ></div>
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-500">
              <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-indigo-900 p-6 flex justify-between items-center text-white shrink-0 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                    <ShieldIcon className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight uppercase tracking-widest">Process Security</h2>
                    <p className="text-purple-300/60 text-[10px] font-bold tracking-tighter italic">Sequence: {selectedLeadForCallTracker}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCallTrackerModal(false)
                    setSelectedLeadForCallTracker(null)
                    document.body.style.overflow = 'auto'
                  }}
                  className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl transition-all border border-white/10 group active:scale-90"
                >
                  <X className="h-6 w-6 text-white group-hover:rotate-90 transition-transform" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 custom-scrollbar bg-slate-50/50">
                <NewCallTracker
                  leadId={selectedLeadForCallTracker}
                  onClose={() => {
                    setShowCallTrackerModal(false)
                    setSelectedLeadForCallTracker(null)
                    document.body.style.overflow = 'auto'
                    window.location.reload()
                  }}
                />
              </div>
            </div>
          </div>
        )
      }
    </div>
  )
}

export default CallTracker

