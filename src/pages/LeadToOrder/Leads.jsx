"use client"

import { useState, useEffect } from "react"
import * as leadToOrderAPI from "../../api/leadToOrderAPI";
import { Loader2 } from "lucide-react"
import { ArrowRightIcon } from "./Icons"

const INITIAL_FORM_DATA = {
  receiverName: "",
  scName: "",
  source: "",
  companyName: "",
  phoneNumber: "",
  salespersonName: "",
  location: "",
  email: "",
  state: "",
  address: "",
  nob: "",
  notes: ""
}

function Leads() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [receiverNames, setReceiverNames] = useState([])
  const [scNames, setScNames] = useState([])
  const [leadSources, setLeadSources] = useState([])
  const [companyOptions, setCompanyOptions] = useState([])
  const [companyDetailsMap, setCompanyDetailsMap] = useState({})
  const [nobOptions, setNobOptions] = useState([])
  const [stateOptions, setStateOptions] = useState([])
  const showNotification = (message, type) => {
    // Simple notification - can be enhanced with toast library
    alert(message)
  }

  // // Script URL
  // const scriptUrl = "https://script.google.com/macros/s/AKfycbyLTNpTAVKaVuGH_-GrVNxDOgXqbWiBYzdf8PQWWwIFhLiIz_1lT3qEQkl7BS1osfToGQ/exec"

  const labelClass = "ml-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:text-xs"
  const fieldClass = "w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[16px] font-medium text-slate-700 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:rounded-xl sm:py-3 sm:text-[15px]"
  const emphasisFieldClass = `${fieldClass} font-bold text-slate-900`
  const sectionTitleClass = "flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl"

  const fetchLeadDropdowns = async () => {
    try {
      // Use the centralized API service
      const response = await leadToOrderAPI.getLeadDropdowns();

      // Check if response data is HTML (string starting with <)
      if (typeof response.data === 'string') {
        const trimmed = response.data.trim();
        if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
          return; // Don't process HTML responses
        }
      }

      if (response?.data?.success && response?.data?.data) {
        const d = response.data.data;

        // Remove duplicates and filter out empty values to match original behavior
        const unique = (arr) => [...new Set(arr.filter(Boolean))];

        setReceiverNames(unique(d.receiverNames || []));
        setScNames(unique(d.scNames || []));
        setLeadSources(unique(d.leadSources || []));
        setStateOptions(unique(d.states || []));
        setNobOptions(unique(d.nob || []));

        // SAFE VERSION (NO CRASH)
        const companyList = d.companyList || {};

        setCompanyOptions(Object.keys(companyList));
        setCompanyDetailsMap(companyList);
      }
    } catch (error) {
      // Error fetching dropdowns - fallback to empty arrays
      setReceiverNames([]);
      setScNames([]);
      setLeadSources([]);
      setStateOptions([]);
      setNobOptions([]);
    }
  };



  // Fetch dropdown data when component mounts
  useEffect(() => {
    fetchLeadDropdowns();
    // Removed Google Sheets fetch - using backend API only
    // fetchDropdownData();
    // fetchCompanyData();
  }, []);


  // REMOVED: fetchDropdownData and fetchCompanyData - using backend API instead

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData(prevData => ({
      ...prevData,
      [id]: value
    }))

    // Auto-fill related fields if company is selected
    if (id === "companyName" && value) {
      const companyDetails = companyDetailsMap[value] || {};

      setFormData(prev => ({
        ...prev,
        companyName: value,
        phoneNumber: companyDetails.phoneNumber || "",
        salespersonName: companyDetails.salesPerson || "",
        location: companyDetails.location || "",
        email: companyDetails.email || ""
      }));
    }

  }

  // REMOVED: generateLeadNumber - lead number generation is handled by backend API

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        receiverName: formData.receiverName,
        scName: formData.scName,
        source: formData.source,
        companyName: formData.companyName,
        phoneNumber: formData.phoneNumber,
        salespersonName: formData.salespersonName,
        location: formData.location,
        email: formData.email,
        state: formData.state,
        address: formData.address,
        nob: formData.nob,
        notes: formData.notes,
      };

      // const response = await fetch("http://localhost:5050/api/leads", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(payload),
      // });

      const response = await leadToOrderAPI.createLead(payload);
      const result = response.data;

      if (result.success) {
        const leadNumber = result.data?.leadNo;
        showNotification(
          `Lead created successfully with Lead Number: ${leadNumber}`,
          "success"
        );

        // Reset form
        setFormData(INITIAL_FORM_DATA);
      } else {
        showNotification(
          "Error creating lead: " + (result.message || "Unknown error"),
          "error"
        );
      }
    } catch (error) {
      showNotification("Error submitting form: " + error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-[calc(100dvh-58px)] w-full bg-slate-50/60 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:pb-8 lg:px-6 lg:pt-2">
      <div className="mx-auto w-full max-w-none">
        <div className="px-3 pb-3 pt-3 sm:px-0 sm:pb-5 sm:pt-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-[clamp(1.9rem,4.8vw,2.8rem)] font-black tracking-tight text-transparent">
              Lead Management
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500 sm:text-base">
              Quickly register and track new business leads
            </p>
          </div>
          <div className="hidden rounded-full bg-blue-100 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-blue-700 sm:inline-flex sm:text-xs">
            New Lead Form
          </div>
        </div>
        </div>

        <div className="w-full overflow-hidden border-y border-slate-200 bg-white shadow-none transition-all sm:rounded-2xl sm:border sm:shadow-[0_20px_55px_rgba(30,41,59,0.06)]">
          <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white p-3 sm:p-6 lg:p-8">
            <h2 className={sectionTitleClass}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 sm:h-8 sm:w-8 sm:rounded-lg sm:text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </span>
              Lead Information
            </h2>
            <p className="ml-11 mt-1 max-w-3xl text-sm text-slate-500 sm:ml-10">
              Fill in all required fields to create a new lead reference.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
            <div className="space-y-4 p-3 sm:space-y-7 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                {/* Receiver Name */}
                <div className="space-y-2">
                  <label htmlFor="receiverName" className={labelClass}>
                    Lead Receiver Name
                  </label>
                  <select
                    id="receiverName"
                    value={formData.receiverName}
                    onChange={handleChange}
                    className={fieldClass}
                    required
                  >
                    <option value="">Select receiver</option>
                    {receiverNames.map((name, index) => (
                      <option key={index} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* SC Name */}
                <div className="space-y-2">
                  <label htmlFor="scName" className={labelClass}>
                    SC Name
                  </label>
                  <select
                    id="scName"
                    value={formData.scName}
                    onChange={handleChange}
                    className={fieldClass}
                    required
                  >
                    <option value="">Select SC Name</option>
                    {scNames.map((name, index) => (
                      <option key={index} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Lead Source */}
                <div className="space-y-2">
                  <label htmlFor="source" className={labelClass}>
                    Lead Source
                  </label>
                  <select
                    id="source"
                    value={formData.source}
                    onChange={handleChange}
                    className={fieldClass}
                    required
                  >
                    <option value="">Select source</option>
                    {leadSources.map((source, index) => (
                      <option key={index} value={source}>{source}</option>
                    ))}
                  </select>
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <label htmlFor="companyName" className={labelClass}>
                    Company Name
                  </label>
                  <div className="relative">
                    <input
                      list="companyOptions"
                      id="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Type or select company..."
                      className={emphasisFieldClass}
                      required
                    />
                    <datalist id="companyOptions">
                      {companyOptions.map((company, index) => (
                        <option key={index} value={company} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label htmlFor="phoneNumber" className={labelClass}>
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Contact Person */}
                <div className="space-y-2">
                  <label htmlFor="salespersonName" className={labelClass}>
                    Contact Person
                  </label>
                  <input
                    id="salespersonName"
                    value={formData.salespersonName}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder="Auto-fills from company"
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label htmlFor="location" className={labelClass}>
                    Location
                  </label>
                  <input
                    id="location"
                    value={formData.location}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder="Auto-fills from company"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className={labelClass}>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder="Auto-fills from company"
                  />
                </div>

                {/* State */}
                <div className="space-y-2">
                  <label htmlFor="state" className={labelClass}>
                    State
                  </label>
                  <select
                    id="state"
                    value={formData.state}
                    onChange={handleChange}
                    className={fieldClass}
                  >
                    <option value="">Select state</option>
                    {stateOptions.map((state, index) => (
                      <option key={index} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                {/* NOB */}
                <div className="space-y-2">
                  <label htmlFor="nob" className={labelClass}>
                    Nature of Business (NOB)
                  </label>
                  <input
                    list="nob-options"
                    id="nob"
                    name="nob"
                    value={formData.nob}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder="Select or type NOB"
                  />
                  <datalist id="nob-options">
                    {nobOptions.map((option, index) => (
                      <option key={index} value={option} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-0.5 sm:gap-5 sm:pt-1 md:grid-cols-2 lg:gap-6">
                {/* Address */}
                <div className="space-y-2">
                  <label htmlFor="address" className={labelClass}>
                    Address
                  </label>
                  <textarea
                    id="address"
                    value={formData.address}
                    onChange={handleChange}
                    className={`${fieldClass} min-h-[120px] resize-y`}
                    placeholder="Enter complete address details"
                    rows="3"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label htmlFor="notes" className={labelClass}>
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className={`${fieldClass} min-h-[120px] resize-y`}
                    placeholder="Any specific instructions or remarks"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex flex-col gap-2.5 border-t border-slate-100 bg-white/95 p-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:flex-row sm:items-center sm:justify-end sm:gap-4 sm:bg-slate-50 sm:p-6 lg:p-8">
              <button
                type="button"
                onClick={() => setFormData(INITIAL_FORM_DATA)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700 sm:w-auto sm:border-transparent sm:bg-transparent sm:px-8 sm:py-3"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50 hover:from-blue-700 hover:to-indigo-700 sm:w-auto sm:px-10 sm:rounded-xl sm:py-3"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Save Lead</span>
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Leads
