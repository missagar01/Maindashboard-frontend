"use client"

import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import * as leadToOrderAPI from "../../api/leadToOrderAPI";

function NewFollowUp({ leadId: propLeadId, leadNo: propLeadNo, onClose }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlLeadId = searchParams.get("leadId")
  const urlLeadNo = searchParams.get("leadNo")
  const leadId = propLeadId || urlLeadId
  const leadNo = propLeadNo || urlLeadNo
  const { user } = useAuth()
  const showNotification = (message, type) => {
    // Simple notification - can be enhanced with toast library
    alert(message)
  }
  const [customerFeedbackOptions, setCustomerFeedbackOptions] = useState([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [enquiryStatus, setEnquiryStatus] = useState("")
  const [items, setItems] = useState([{ id: "1", name: "", quantity: "" }])
  const [formData, setFormData] = useState({
    leadNo: "",
    nextAction: "",
    nextCallDate: "",
    nextCallTime: "",
    customerFeedback: "",
    enquiryApproach: "", // Add this new field
  })

  const [leadStatus, setLeadStatus] = useState("")

  // New state for dropdown options
  const [enquiryStates, setEnquiryStates] = useState([])
  const [salesTypes, setSalesTypes] = useState([])
  const [productCategories, setProductCategories] = useState([]) // New state for product categories
  const [nobOptions, setNobOptions] = useState([])
  const [enquiryApproachOptions, setEnquiryApproachOptions] = useState([])


  // Function to fetch dropdown data from backend
  const fetchDropdownData = async () => {
    try {
      const response = await leadToOrderAPI.getFollowUpDropdowns();
      const result = response?.data;

      // Check if response is HTML
      if (typeof result === 'string' && (result.trim().startsWith('<!DOCTYPE') || result.trim().startsWith('<html'))) {
        console.warn("Backend returned HTML instead of JSON for followup dropdowns. Using empty data.");
        setCustomerFeedbackOptions([]);
        setEnquiryApproachOptions([]);
        setProductCategories([]);
      } else if (result?.success) {
        setCustomerFeedbackOptions(result.data?.customerSay || []);
        setEnquiryApproachOptions(result.data?.enquiryApproach || []);
        setProductCategories(result.data?.productCategories || []);
      } else {
        setCustomerFeedbackOptions([]);
        setEnquiryApproachOptions([]);
        setProductCategories([]);
      }
    } catch (error) {
      console.error("Error fetching dropdown values:", error);
      // fallback
      setCustomerFeedbackOptions([]);
      setEnquiryApproachOptions([]);
      setProductCategories([]);
    }
  };


  useEffect(() => {
    // Fetch dropdown data when component mounts
    fetchDropdownData()

    // Prepopulate lead number if available
    if (leadNo) {
      setFormData((prevData) => ({
        ...prevData,
        leadNo: leadNo,
      }))
    }
  }, [leadNo])

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }))
  }

  const calculateTotalQuantity = () => {
    return items.reduce((total, item) => {
      const quantity = parseInt(item.quantity) || 0
      return total + quantity
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const itemsJson = items.map(it => ({
        name: it.name,
        quantity: it.quantity
      }));

      const payload = {
        leadNo: formData.leadNo,
        customer_say: document.getElementById("customerFeedback").value,
        lead_status: leadStatus,
        enquiry_received_status: enquiryStatus,
        enquiry_received_date:
          enquiryStatus === "yes"
            ? document.getElementById("enquiryDate").value
            : null,
        enquiry_approach:
          enquiryStatus === "yes" ? formData.enquiryApproach : null,
        project_value:
          enquiryStatus === "yes"
            ? document.getElementById("enquiryValue").value
            : null,
        item_qty: enquiryStatus === "yes" ? itemsJson : [],
        total_qty:
          enquiryStatus === "yes" ? calculateTotalQuantity() : 0,

        next_action:
          enquiryStatus === "expected"
            ? document.getElementById("nextAction").value
            : null,
        next_call_date:
          enquiryStatus === "expected"
            ? document.getElementById("nextCallDate").value
            : null,
        next_call_time:
          enquiryStatus === "expected"
            ? document.getElementById("nextCallTime").value
            : null
      };

      const response = await leadToOrderAPI.submitFollowUp(payload);
      const result = response?.data;

      // Check if response is HTML
      if (typeof result === 'string' && (result.trim().startsWith('<!DOCTYPE') || result.trim().startsWith('<html'))) {
        showNotification("Error: Backend returned invalid response", "error");
        return;
      }

      if (result?.success) {
        showNotification("Follow-up submitted successfully", "success");
        if (onClose) {
          onClose()
          // Refresh the page data
          window.location.reload()
        } else {
          navigate("/follow-up");
        }
      } else {
        showNotification("Error: " + (result?.message || "Unknown error"), "error");
      }
    } catch (error) {
      showNotification("Error submitting: " + error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };


  // Function to format date as dd/mm/yyyy
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const addItem = () => {
    // Define maximum number of items allowed
    const MAX_ITEMS = 300

    // Only add a new item if we haven't reached the maximum
    if (items.length < MAX_ITEMS) {
      const newId = (items.length + 1).toString()
      setItems([...items, { id: newId, name: "", quantity: "" }])
    }
  }

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id, field, value) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  return (
    <div className="w-full h-full flex flex-col">
      {!onClose && (
        <div className="p-8 sm:p-12 border-b bg-white">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight uppercase">Lead Follow-Up</h2>
          <p className="text-sm sm:text-lg text-slate-500 font-medium mt-2">
            Documenting conversation for
            {leadId && <span className="font-bold text-emerald-600"> Lead #{leadId}</span>}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col relative bg-[#f8fafc]/50">
        <div className="flex-1 p-5 sm:p-8 md:p-10 space-y-10 lg:space-y-12 pb-40 sm:pb-32">

          {/* Section 1: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-3">
              <label htmlFor="enquiryNo" className="block text-[12px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">
                Ref. Lead Number
              </label>
              <div className="relative group">
                <input
                  id="enquiryNo"
                  className="w-full px-7 py-5 bg-white border border-slate-200 rounded-[2rem] focus:outline-none focus:ring-[12px] focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-bold text-slate-700 shadow-sm text-lg"
                  placeholder="LD-001"
                  value={formData.leadNo}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="customerFeedback" className="block text-[12px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">
                Customer Say
              </label>
              <div className="relative group">
                <input
                  list="customer-feedback-options"
                  id="customerFeedback"
                  className="w-full px-7 py-5 bg-white border border-slate-200 rounded-[2rem] focus:outline-none focus:ring-[12px] focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-bold text-slate-700 shadow-sm text-lg"
                  placeholder="Select or type response"
                  required
                />
                <datalist id="customer-feedback-options">
                  {customerFeedbackOptions.map((feedback, index) => (
                    <option key={index} value={feedback} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Section 2: Priority & Result */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4 p-6 sm:p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-100/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Lead Temperature</label>
              </div>
              <div className="flex gap-4 sm:gap-6">
                {[
                  { id: "hot", label: "Hot", value: "Hot", activeClass: "bg-rose-500 border-rose-500 shadow-rose-200" },
                  { id: "warm", label: "Warm", value: "Warm", activeClass: "bg-amber-500 border-amber-500 shadow-amber-200" },
                  { id: "cold", label: "Cold", value: "Cold", activeClass: "bg-blue-500 border-blue-500 shadow-blue-200" }
                ].map((opt) => (
                  <label key={opt.id} className="flex-1 cursor-pointer group">
                    <input
                      type="radio"
                      id={opt.id}
                      name="leadStatus"
                      value={opt.id}
                      checked={leadStatus === opt.value}
                      onChange={() => setLeadStatus(opt.value)}
                      className="sr-only"
                    />
                    <div className={`text-center py-4 sm:py-5 rounded-[1.5rem] border-2 transition-all font-black text-xs sm:text-sm uppercase tracking-widest ${leadStatus === opt.value
                      ? `${opt.activeClass} text-white shadow-xl scale-[1.05]`
                      : "bg-slate-50/50 border-slate-100 text-slate-300 group-hover:border-slate-200 group-hover:bg-white"
                      }`}>
                      {opt.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-6 sm:p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-100/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Action Result</label>
              </div>
              <div className="flex gap-4 sm:gap-6">
                {[
                  { id: "yes", label: "Inquiry", value: "yes" },
                  { id: "expected", label: "Follow-up", value: "expected" },
                  { id: "not-interested", label: "No Interest", value: "not-interested" }
                ].map((opt) => (
                  <label key={opt.id} className="flex-1 cursor-pointer group">
                    <input
                      type="radio"
                      id={opt.id}
                      name="enquiryStatus"
                      value={opt.id}
                      checked={enquiryStatus === opt.value}
                      onChange={() => setEnquiryStatus(opt.value)}
                      className="sr-only"
                    />
                    <div className={`text-center py-4 sm:py-5 rounded-[1.5rem] border-2 transition-all font-black text-[10px] sm:text-xs uppercase tracking-widest ${enquiryStatus === opt.value
                      ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.05]"
                      : "bg-slate-50/50 border-slate-100 text-slate-300 group-hover:border-slate-200 group-hover:bg-white"
                      }`}>
                      {opt.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Conditional Content: Expected Next Call */}
          {enquiryStatus === "expected" && (
            <div className="space-y-8 p-6 sm:p-10 bg-amber-50/30 border border-amber-100 rounded-[3rem] animate-in slide-in-from-top-4 zoom-in-95 duration-500">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-amber-900 uppercase tracking-tight">Schedule Next Step</h3>
                  <p className="text-xs sm:text-sm font-bold text-amber-600/70 uppercase tracking-widest mt-1">Don't lose the lead traction</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-1 space-y-2.5">
                  <label htmlFor="nextAction" className="block text-[11px] font-black uppercase tracking-widest text-amber-700 ml-1">Call Objective</label>
                  <input
                    id="nextAction"
                    className="w-full px-6 py-4 bg-white border border-amber-200 rounded-3xl focus:outline-none focus:ring-8 focus:ring-amber-500/5 focus:border-amber-500 transition-all font-bold text-slate-700 shadow-sm text-lg"
                    placeholder="e.g., Quotation Follow-up"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label htmlFor="nextCallDate" className="block text-[12px] font-black uppercase tracking-widest text-amber-800 ml-1">Call Date</label>
                  <div className="relative group">
                    <input
                      id="nextCallDate"
                      type="date"
                      onFocus={(e) => e.target.showPicker && e.target.showPicker()}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      className="w-full px-7 py-5 bg-white border border-amber-200 rounded-[2rem] focus:outline-none focus:ring-[12px] focus:ring-amber-500/5 focus:border-amber-500 transition-all font-bold text-slate-700 shadow-sm text-lg cursor-pointer"
                      required
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-amber-500">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <label htmlFor="nextCallTime" className="block text-[11px] font-black uppercase tracking-widest text-amber-700 ml-1">Preferred Time</label>
                  <div className="relative group">
                    <input
                      id="nextCallTime"
                      type="time"
                      className="w-full px-6 py-4 bg-white border border-amber-200 rounded-3xl focus:outline-none focus:ring-8 focus:ring-amber-500/5 focus:border-amber-500 transition-all font-bold text-slate-700 shadow-sm text-lg cursor-pointer"
                      required
                    />
                    <div className="absolute right-5 inset-y-0 flex items-center pointer-events-none text-amber-500 group-focus-within:text-amber-600">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conditional Content: Active Inquiry */}
          {enquiryStatus === "yes" && (
            <div className="space-y-10 p-6 sm:p-10 bg-blue-50/30 border border-blue-100 rounded-[3rem] animate-in slide-in-from-top-4 zoom-in-95 duration-500">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-blue-900 uppercase tracking-tight">Active Enquiry Matrix</h3>
                  <p className="text-xs sm:text-sm font-bold text-blue-600/70 uppercase tracking-widest mt-1">Convert potential into order</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-3 relative group">
                  <label htmlFor="enquiryDate" className="block text-[12px] font-black uppercase tracking-widest text-blue-800 ml-1">
                    Received Date (Click Calendar)
                  </label>
                  <div className="relative group">
                    <input
                      id="enquiryDate"
                      type="date"
                      onFocus={(e) => e.target.showPicker && e.target.showPicker()}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      className="w-full pl-8 pr-16 py-5 bg-white border border-blue-200 rounded-[2.5rem] focus:outline-none focus:ring-[15px] focus:ring-blue-500/5 focus:border-blue-500 transition-all font-black text-slate-700 shadow-xl text-lg cursor-pointer hover:bg-white"
                      required
                    />
                    <div className="absolute right-7 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label htmlFor="enquiryApproach" className="block text-[11px] font-black uppercase tracking-widest text-blue-700 ml-1">Channel / Approach</label>
                  <div className="relative group">
                    <select
                      id="enquiryApproach"
                      className="w-full px-6 py-4 bg-white border border-blue-200 rounded-3xl focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-black text-slate-700 shadow-sm text-lg appearance-none cursor-pointer"
                      value={formData.enquiryApproach}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Channel</option>
                      {enquiryApproachOptions.map((approach, index) => (
                        <option key={index} value={approach}>{approach}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 inset-y-0 flex items-center pointer-events-none text-blue-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 md:col-span-2 lg:col-span-1">
                  <label htmlFor="enquiryValue" className="block text-[11px] font-black uppercase tracking-widest text-blue-700 ml-1">Budgeted Value</label>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400 group-focus-within:text-blue-500 transition-colors text-xl">₹</span>
                    <input
                      id="enquiryValue"
                      type="number"
                      className="w-full pl-12 pr-6 py-4 bg-white border border-blue-200 rounded-3xl focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-black text-slate-800 shadow-sm text-xl sm:text-2xl"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Requirement Matrix */}
              <div className="space-y-10 pt-12 border-t border-blue-100/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h4 className="text-xl sm:text-2xl font-black text-blue-900 uppercase tracking-tight">Product Requirements Matrix</h4>
                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mt-2">Specify items and quantities</p>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center justify-center gap-4 px-10 py-5 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest rounded-3xl shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all w-full sm:w-auto"
                    disabled={items.length >= 300}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                    Add Requirement
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {items.map((item, index) => (
                    <div key={item.id} className="group relative p-8 sm:p-10 bg-white border border-blue-50 rounded-[3rem] shadow-sm hover:shadow-[0_45px_100px_rgba(30,64,175,0.12)] transition-all animate-in zoom-in-95 duration-500 flex flex-col justify-between hover:-translate-y-2">
                      <div className="flex items-center justify-between mb-8">
                        <span className="flex items-center gap-3 px-5 py-2.5 bg-blue-50 text-blue-600 text-[11px] font-black uppercase tracking-widest rounded-2xl border border-blue-100">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                          Requirement {index + 1}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="w-12 h-12 flex items-center justify-center text-rose-400 hover:text-white hover:bg-rose-500 rounded-2xl transition-all shadow-sm hover:shadow-lg"
                          >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Description</label>
                          <input
                            list={`item-options-${item.id}`}
                            className="w-full px-7 py-5 bg-slate-50/50 border border-slate-200 rounded-[2rem] focus:ring-[15px] focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-bold text-base sm:text-lg"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, "name", e.target.value)}
                            required
                            placeholder="Type product..."
                          />
                          <datalist id={`item-options-${item.id}`}>
                            {productCategories.map((category, index) => (
                              <option key={index} value={category} />
                            ))}
                          </datalist>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Required Quantity</label>
                          <input
                            type="number"
                            className="w-full px-7 py-5 bg-slate-50/50 border border-slate-200 rounded-[2rem] focus:ring-[15px] focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-black text-slate-800 text-2xl"
                            placeholder="0"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ULTRA-RESPONSIVE FIXED FOOTER */}
        <div className="absolute bottom-0 left-0 right-0 px-8 sm:px-12 md:px-16 py-8 sm:py-10 bg-white/95 backdrop-blur-2xl border-t border-slate-100/80 flex flex-col sm:flex-row gap-5 sm:gap-8 z-50">
          <button
            type="button"
            onClick={() => onClose ? onClose() : navigate(-1)}
            className="flex-1 py-5 sm:py-6 px-12 border-2 border-slate-200 text-slate-600 font-black uppercase tracking-[0.25em] rounded-[2.5rem] hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all text-xs sm:text-[14px]"
          >
            Cancel Update
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] py-5 sm:py-6 px-12 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.25em] rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] disabled:opacity-50 active:scale-95 transition-all text-xs sm:text-[14px] flex items-center justify-center gap-5 group"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-5">
                <svg className="animate-spin h-7 w-7" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Syncing Live...
              </span>
            ) : (
              <>
                Finalize & Submit Update
                <svg className="w-7 h-7 group-hover:translate-x-3 transition-transform duration-500 ease-out" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewFollowUp
