import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  CalendarPlus,
  Plus,
  Minus,
  Loader2Icon,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminLayout from "../../../components/layout/AdminLayout.jsx"

const NewMachine = () => {
  const navigate = useNavigate();

  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzudKkY63zbthWP_YcfyF-HnUOObG_XM9aS2JDCmTmcYLaY1OQq7ho6i085BXxu9N2E7Q/exec";
  const SHEET_NAME = "FormResponses";
  const SHEET_Id = "15SBKzTJKzaqhjPI5yt5tKkrd3tzNuhm_Q9-iDO8n0B0";
  const FOLDER_ID = "1ZMn-mLYxW3_RW4tCgMgesSet6ShgT1kS";


  // const API_URL = "http://18.60.212.185:5050/api/machines";
  const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();
  const API_URL = `${BACKEND_URL}/api/mainatce/machines`;



  const [formValues, setFormValues] = useState({
    serialNumber: "",
    machineName: "",
    model: "",
    manufacturer: "",
    department: "",
    location: "",
    purchaseDate: "",
    purchasePrice: "",
    vendor: "",
    warrantyExpiration: "",
    maintenanceSchedule: [],
    initialMaintenanceDate: "",
    note: "",
    tagNo: "", // New field for Tag No.
    userAllot: "", // New field for User Allot
  });



  const [sheetData, setSheetData] = useState([]);
  const [loaderSubmit, setLoaderSubmit] = useState(false);
  const [loaderSheetData, setLoaderSheetData] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [loaderMasterSheetData, setLoaderMasterSheetData] = useState(false);

  // Safe fetch function with error handling
  const safeFetch = async (url, options = {}) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load data. Please refresh the page.");
      return null;
    }
  };

  // Fetch sheet data with error handling
  const fetchSheetData = useCallback(async () => {
    try {
      setLoaderSheetData(true);
      const result = await safeFetch(
        `${SCRIPT_URL}?sheetId=${SHEET_Id}&sheet=${SHEET_NAME}`
      );

      if (result && result.success && result.table) {
        const headers = result.table.cols.map((col) => col.label);
        const rows = result.table.rows || [];

        // Transform rows into objects with key-value pairs
        const formattedRows = rows.map((rowObj) => {
          const row = rowObj.c || [];
          const rowData = {};
          row.forEach((cell, i) => {
            if (headers[i]) {
              rowData[headers[i]] = cell?.v || "";
            }
          });
          return rowData;
        });

        setSheetData(formattedRows);
      } else {
        console.error("Invalid response format:", result);
        setSheetData([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setSheetData([]);
      toast.error("Failed to load existing machines data");
    } finally {
      setLoaderSheetData(false);
    }
  }, [SCRIPT_URL, SHEET_Id, SHEET_NAME]);

  // Fetch department options
  const fetchMasterSheetData = useCallback(async () => {
    try {
      setLoaderMasterSheetData(true);
      // const res = await fetch("http://18.60.212.185:5050/api/departments");
      const res = await fetch(`${BACKEND_URL}/api/mainatce/departments`);
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        setDepartmentOptions(result.data);
      } else {
        setDepartmentOptions([]);
        toast.error("Failed to load department options");
      }
    } catch (error) {
      console.error("Fetch department error:", error);
      toast.error("Error fetching department list");
    } finally {
      setLoaderMasterSheetData(false);
    }
  }, []);


  // Generate serial number safely
  const generateSerialNumber = useCallback((records, machineName) => {
    if (!machineName || !machineName.trim()) {
      return "";
    }

    try {
      const currentYear = new Date().getFullYear();
      const cleanedName = machineName.toLowerCase().replace(/\s+/g, "");
      const prefix = `SRMPL-${cleanedName}/`;

      let count = 0;

      // Safely iterate through records
      if (Array.isArray(records)) {
        records.forEach((row) => {
          const serialNo = row["Serial No"] || row["Serial no"] || row["serial no"] || "";
          if (serialNo && typeof serialNo === 'string' && serialNo.startsWith(prefix)) {
            count++;
          }
        });
      }

      const suffix = String(count + 1).padStart(3, "0");
      return `${prefix}${suffix}`;
    } catch (error) {
      console.error("Error generating serial number:", error);
      return "";
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchSheetData();
    fetchMasterSheetData();
  }, [fetchSheetData, fetchMasterSheetData]);

  // Generate serial number when machine name changes
  useEffect(() => {
    if (formValues.machineName.trim() !== "" && sheetData.length > 0) {
      const newSerial = generateSerialNumber(sheetData, formValues.machineName);
      setFormValues((prev) => ({
        ...prev,
        serialNumber: newSerial,
      }));
    } else if (formValues.machineName.trim() === "") {
      setFormValues((prev) => ({
        ...prev,
        serialNumber: "",
      }));
    }
  }, [formValues.machineName, sheetData, generateSerialNumber]);

  // Safe checkbox handler for maintenanceSchedule
  const handleCheckboxChange = useCallback((e) => {
    const { id, checked } = e.target;
    setFormValues((prev) => {
      const currentSchedule = Array.isArray(prev.maintenanceSchedule)
        ? prev.maintenanceSchedule
        : [];

      const updated = checked
        ? [...currentSchedule, id]
        : currentSchedule.filter((item) => item !== id);

      return { ...prev, maintenanceSchedule: updated };
    });
  }, []);


  // Safe input handler
  const handleInputChange = useCallback((e) => {
    const { id, value } = e.target;
    setFormValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  // Safe date formatter
  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr || dateStr === "") return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";

      const dd = String(date.getDate()).padStart(2, "0");
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const yyyy = date.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch (e) {
      console.error("Date formatting error:", e);
      return dateStr;
    }
  };

  // Form validation
  const validateForm = () => {
    const requiredFields = {
      machineName: "Machine Name",
      department: "Department",
      purchaseDate: "Purchase Date",
      purchasePrice: "Purchase Price",
      initialMaintenanceDate: "Initial Maintenance Date"
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!formValues[field] || formValues[field].toString().trim() === "") {
        toast.error(`❌ ${label} is required`);
        return false;
      }
    }

    if (isNaN(Number(formValues.purchasePrice)) || Number(formValues.purchasePrice) <= 0) {
      toast.error("❌ Please enter a valid purchase price");
      return false;
    }

    return true;
  };

  // Safe form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoaderSubmit(true);

      const userManualUrl = "";
      const purchaseBillUrl = "";

      // ✅ Now prepare final JSON payload
      const payload = {
        serial_no: formValues.serialNumber,
        machine_name: formValues.machineName,
        model_no: formValues.model,
        manufacturer: formValues.manufacturer,
        department: formValues.department,
        location: formValues.location,
        purchase_date: formValues.purchaseDate,
        purchase_price: formValues.purchasePrice,
        vendor: formValues.vendor,
        warranty_expiration: formValues.warrantyExpiration,
        maintenance_schedule: JSON.stringify(formValues.maintenanceSchedule),
        initial_maintenance_date: formValues.initialMaintenanceDate,
        user_manual: userManualUrl,
        purchase_bill: purchaseBillUrl,
        notes: formValues.note,
        tag_no: formValues.tagNo,
        user_allot: formValues.userAllot,
      };

      // ✅ Send JSON data to backend
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("✅ Machine added successfully!");
        setFormValues({
          serialNumber: "",
          machineName: "",
          model: "",
          manufacturer: "",
          department: "",
          location: "",
          purchaseDate: "",
          purchasePrice: "",
          vendor: "",
          warrantyExpiration: "",
          maintenanceSchedule: [],
          initialMaintenanceDate: "",
          note: "",
          tagNo: "",
          userAllot: "",
        });
        setTimeout(() => navigate("/dashboard/machines"), 1000);
      } else {
        toast.error("❌ Failed to add machine");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("❌ Server error");
    } finally {
      setLoaderSubmit(false);
    }
  };


  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <Link
            to="/dashboard/machines"
            className="text-indigo-600 hover:text-indigo-900 mr-4 flex items-center"
          >
            <ChevronLeft size={20} />
            <span>Back to Machines</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Add New Machine</h1>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <h2 className="font-medium text-lg text-gray-900 border-b pb-2">
                    Machine Information
                  </h2>

                  {/* Machine Name */}
                  <div>
                    <label
                      htmlFor="machineName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Machine Name*
                    </label>
                    <input
                      type="text"
                      id="machineName"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      placeholder="e.g., Hydraulic Press HP-102"
                      value={formValues.machineName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Serial Number - Now Editable Input Field */}
                  <div>
                    <label
                      htmlFor="serialNumber"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Serial Number
                    </label>
                    <input
                      type="text"
                      id="serialNumber"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      placeholder="Auto-generated or enter manually"
                      value={formValues.serialNumber}
                      onChange={handleInputChange}
                    />
                    {/* <p className="text-xs text-gray-500 mt-1">
                    Serial number will be auto-generated when you enter machine name, but you can edit it if needed.
                  </p> */}
                  </div>

                  {/* Tag No. - New Input Field */}
                  <div>
                    <label
                      htmlFor="tagNo"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Tag No
                    </label>
                    <input
                      type="text"
                      id="tagNo"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      placeholder="e.g., TAG-001, ASSET-2024"
                      value={formValues.tagNo}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* User Allot - New Input Field */}
                  <div>
                    <label
                      htmlFor="userAllot"
                      className="block text-sm font-medium text-gray-700"
                    >
                      User Allot
                    </label>
                    <input
                      type="text"
                      id="userAllot"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      placeholder="e.g., John Doe, Maintenance Team"
                      value={formValues.userAllot}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Model No */}
                  <div>
                    <label
                      htmlFor="model"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Model No
                    </label>
                    <input
                      type="text"
                      id="model"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      placeholder="e.g., HP-2000 Series"
                      value={formValues.model}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Manufacturer */}
                  <div>
                    <label
                      htmlFor="manufacturer"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      id="manufacturer"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      value={formValues.manufacturer}
                      onChange={handleInputChange}
                      placeholder="e.g., Industrial Dynamics Ltd."
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h2 className="font-medium text-lg text-gray-900 border-b pb-2">
                    Department & Location
                  </h2>

                  {/* Department */}
                  <div>
                    <label
                      htmlFor="department"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Department*
                    </label>
                    <select
                      id="department"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      value={formValues.department}
                      onChange={handleInputChange}
                      disabled={loaderMasterSheetData}
                      required
                    >
                      <option value="">
                        {loaderMasterSheetData ? "Loading departments..." : "Select Department"}
                      </option>
                      {departmentOptions.map((dept, index) => (
                        <option key={index} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                    {loaderMasterSheetData && (
                      <p className="text-xs text-gray-500 mt-1">
                        <Loader2Icon className="inline animate-spin w-3 h-3 mr-1" />
                        Loading department options...
                      </p>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label
                      htmlFor="location"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Location
                    </label>
                    <input
                      type="text"
                      id="location"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      value={formValues.location}
                      onChange={handleInputChange}
                      placeholder="e.g., Building A, Floor 2, Section 3"
                    />
                  </div>

                  <h2 className="font-medium text-lg text-gray-900 border-b pb-2">
                    Purchase & Maintenance Details
                  </h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="purchaseDate"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Purchase Date*
                      </label>
                      <input
                        type="date"
                        id="purchaseDate"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        value={formValues.purchaseDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="purchasePrice"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Purchase Price*
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">₹</span>
                        </div>
                        <input
                          type="number"
                          id="purchasePrice"
                          className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                          placeholder="0.00"
                          value={formValues.purchasePrice}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="vendor"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Vendor
                    </label>
                    <input
                      type="text"
                      id="vendor"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      value={formValues.vendor}
                      onChange={handleInputChange}
                      placeholder="e.g., Industrial Suppliers Inc."
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="warrantyExpiration"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Warranty Expiration
                    </label>
                    <input
                      type="date"
                      id="warrantyExpiration"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      value={formValues.warrantyExpiration}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maintenance Schedule
                    </label>
                    <div className="space-y-2">
                      {[
                        { id: "Daily", label: "Daily" },
                        { id: "Weekly", label: "Weekly" },
                        { id: "Monthly", label: "Monthly" },
                        { id: "Half-Yearly", label: "Half-Yearly" },
                        { id: "Quarterly", label: "Quarterly" },
                        { id: "Yearly", label: "Yearly" }
                      ].map((option) => (
                        <div key={option.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={option.id}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            // checked={formValues.maintenanceSchedule.includes(option.id)}
                            checked={(formValues.maintenanceSchedule || []).includes(option.id)}
                            onChange={handleCheckboxChange}
                          />
                          <label
                            htmlFor={option.id}
                            className="ml-2 block text-sm text-gray-700"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="initialMaintenanceDate"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Initial Maintenance Date*
                    </label>
                    <input
                      type="date"
                      id="initialMaintenanceDate"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      value={formValues.initialMaintenanceDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>


              {/* Note Section */}
              <div className="mt-6 border-t border-gray-200 pt-6">
                <h2 className="font-medium text-lg text-gray-900 mb-4">Notes</h2>
                <textarea
                  rows={4}
                  id="note"
                  className="shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border border-gray-300 rounded-md p-2"
                  placeholder="Add any additional notes about this machine..."
                  value={formValues.note}
                  onChange={handleInputChange}
                />
              </div>

              {/* Submit Button */}
              <div className="mt-8 flex justify-end space-x-3">
                <Link
                  to="/dashboard/machines"
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loaderSubmit}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loaderSubmit && <Loader2Icon className="animate-spin mr-2 w-4 h-4" />}
                  Save Machine
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default NewMachine;
