import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronLeft,
  Calendar,
  DollarSign,
  Wrench,
  AlertTriangle,
  CheckCircle,
  FileText,
  Edit,
  Trash2,
  Plus,
  BarChart3,
  Clock,
  User,
  ArrowLeft,
  Thermometer,
  Save,
  X,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import axiosInstance from "@/api/checklist/axiosInstance.js";
import axios from "axios";
import toast from "react-hot-toast";

const MachineDetails = ({ machine, goBack }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [historyMaitenenceTasks, setHistoryMaitenenceTasks] = useState([]);
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState(null);
  const [totalMaintenanceCost, setTotalMaintenanceCost] = useState(0);
  const [totalMaintenancePurchasePrise, setTotalMaintenancePurchasePrise] = useState(0);
  const [maintenanceCount, setMaintenanceCount] = useState(0);
  const [metainanceHealthScore, setMetainanceHealthScore] = useState(0);
  const [temperatureGraphData, setTemperatureGraphData] = useState([]);
  const [percentMaintenanceToPurchase, setPercentMaintenanceToPurchase] = useState(0);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const { serialNo } = useParams();

  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzudKkY63zbthWP_YcfyF-HnUOObG_XM9aS2JDCmTmcYLaY1OQq7ho6i085BXxu9N2E7Q/exec";
  const SHEET_Id = "15SBKzTJKzaqhjPI5yt5tKkrd3tzNuhm_Q9-iDO8n0B0";


  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
  console.log(API_BASE_URL)


  // Enhanced formatSheetData with better error handling
  const formatSheetData = (sheetData) => {
    // Check if sheetData exists and has the expected structure
    if (!sheetData || !sheetData.table || !sheetData.table.cols || !sheetData.table.rows) {
      console.error("Invalid sheet data structure:", sheetData);
      return [];
    }

    try {
      const columns = sheetData.table.cols.map((col) => col?.label || "");
      const rows = sheetData.table.rows || [];

      return rows.map((row, rowIndex) => {
        const obj = {};
        if (row && row.c) {
          row.c.forEach((cell, i) => {
            obj[columns[i]] = cell?.v || "";
          });
        }
        return obj;
      });
    } catch (error) {
      console.error("Error formatting sheet data:", error);
      return [];
    }
  };



  const fetchMaintenanceHistory = async () => {
    if (!machine || !machine["Serial No"]) return;

    setLoadingTasks(true);
    try {
      // const res = await axios.get(`${API_BASE_URL}/${machine["Serial No"]}/history`);
      const res = await axiosInstance.get(
        `/api/mainatce/machine-details/${encodeURIComponent(machine["Serial No"])}/history`
      );

      if (res.data.success) {
        const tasks = res.data.data || [];
        setHistoryMaitenenceTasks(tasks);

        const totalCost = tasks.reduce((sum, t) => sum + (parseFloat(t.maintenance_cost) || 0), 0);
        setTotalMaintenanceCost(totalCost);
        setMaintenanceCount(tasks.length);

        const purchasePrice = parseFloat(machine["Purchase Price"] || 0);
        const ratio = purchasePrice > 0 ? (totalCost * 100) / purchasePrice : 0;
        setPercentMaintenanceToPurchase(ratio);

        // Temperature chart data
        const tempData = tasks
          .filter((t) => t.temperature_status)
          .map((t) => ({
            time: t.task_start_date ? new Date(t.task_start_date).toLocaleDateString() : "N/A",
            temp: Number(t.temperature_status),
          }));

        setTemperatureGraphData(tempData);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
      toast.error("Failed to fetch maintenance history");
    } finally {
      setLoadingTasks(false);
    }
  };



  // Initialize edit form data when machine data is available
  useEffect(() => {
    if (machine && !isEditing) {
      setEditFormData({
        serialNumber: machine["Serial No"] || "",
        machineName: machine["Machine Name"] || "",
        model: machine["Model No"] || "",
        manufacturer: machine["Manufacturer"] || "",
        department: machine["Department"] || "",
        location: machine["Location"] || "",
        purchaseDate: machine["Purchase Date"] ? formatDateForInput(machine["Purchase Date"]) : "",
        purchasePrice: machine["Purchase Price"] || "",
        vendor: machine["Vendor"] || "",
        warrantyExpiration: machine["Warranty Expiration"] ? formatDateForInput(machine["Warranty Expiration"]) : "",
        initialMaintenanceDate: machine["Initial Maintenance Date"] ? formatDateForInput(machine["Initial Maintenance Date"]) : "",
        note: machine["Notes"] || "",
        tagNo: machine["Tag No"] || "",
        userAllot: machine["User Allot"] || "",
      });
    }
  }, [machine, isEditing]);

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const formattedDate = new Date(parts[2], parts[1] - 1, parts[0]);
          return formattedDate.toISOString().split('T')[0];
        }
        return "";
      }
      return date.toISOString().split('T')[0];
    } catch {
      return "";
    }
  };

  // Format date for sheet (DD/MM/YYYY)
  const formatDateForSheet = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    // Reset form data to original values
    if (machine) {
      setEditFormData({
        serialNumber: machine["Serial No"] || "",
        machineName: machine["Machine Name"] || "",
        model: machine["Model No"] || "",
        manufacturer: machine["Manufacturer"] || "",
        department: machine["Department"] || "",
        location: machine["Location"] || "",
        purchaseDate: machine["Purchase Date"] ? formatDateForInput(machine["Purchase Date"]) : "",
        purchasePrice: machine["Purchase Price"] || "",
        vendor: machine["Vendor"] || "",
        warrantyExpiration: machine["Warranty Expiration"] ? formatDateForInput(machine["Warranty Expiration"]) : "",
        initialMaintenanceDate: machine["Initial Maintenance Date"] ? formatDateForInput(machine["Initial Maintenance Date"]) : "",
        note: machine["Notes"] || "",
        tagNo: machine["Tag No"] || "",
        userAllot: machine["User Allot"] || "",
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const serial = machine?.["Serial No"];
      if (!serial) {
        toast.error("Missing Serial No — cannot update");
        return;
      }

      // Build clean payload for PostgreSQL
      const payload = {
        machine_name: editFormData.machineName,
        model_no: editFormData.model,
        manufacturer: editFormData.manufacturer,
        department: editFormData.department,
        location: editFormData.location,
        purchase_date: editFormData.purchaseDate,
        purchase_price: editFormData.purchasePrice,
        vendor: editFormData.vendor,
        warranty_expiration: editFormData.warrantyExpiration,
        initial_maintenance_date: editFormData.initialMaintenanceDate,
        notes: editFormData.note,
        tag_no: editFormData.tagNo,
        user_allot: editFormData.userAllot,
      };

      console.log("📤 Sending UPDATE to PostgreSQL:", payload);

      // Send to Express → PostgreSQL
      const res = await axiosInstance.put(
        `/api/mainatce/machine-details/${encodeURIComponent(serial)}`,
        payload
      );

      console.log("📥 PostgreSQL Response:", res.data);

      if (res.data.success) {
        toast.success("Machine updated successfully");
        setIsEditing(false);

        // Refresh UI
        setTimeout(() => window.location.reload(), 800);
      } else {
        toast.error("Failed to update the machine");
      }

    } catch (err) {
      console.error("❌ Update error:", err);
      toast.error("Error updating machine");
    } finally {
      setSaving(false);
    }
  };




  const fetchMaintenceTasks = async () => {
    if (!machine || !machine["Serial No"]) {
      console.warn("Machine data not available yet");
      return;
    }

    setLoadingTasks(true);
    try {
      const response = await axios.get(
        `${SCRIPT_URL}?sheetId=${SHEET_Id}&sheet=Maitenance%20Task%20Assign`
      );

      // Check if response has data and is successful
      if (!response.data || !response.data.success) {
        console.warn("No valid data received from API");
        return;
      }

      const formattedHistoryData = formatSheetData(response.data);

      if (formattedHistoryData.length === 0) {
        console.warn("No formatted data available");
        return;
      }

      const machineFilteredTasks = formattedHistoryData.filter(
        (task) => task["Serial No"] === machine["Serial No"]
      );

      const taskStartDates = machineFilteredTasks
        .map((task) => {
          if (task["Task Start Date"]) {
            try {
              return new Date(task["Task Start Date"]).toLocaleDateString();
            } catch {
              return null;
            }
          }
          return null;
        })
        .filter((date) => date !== null);

      const temperatureData = machineFilteredTasks.map(
        (task) => task["Temperature Status"] || 0
      );

      const temperatureGraphData = taskStartDates.map((date, index) => ({
        time: date,
        temp: Number(temperatureData[index]) || 0,
      }));

      setTemperatureGraphData(temperatureGraphData);

      const filteredTasks = machineFilteredTasks.filter(
        (task) => task["Actual Date"] && task["Actual Date"] !== ""
      );

      setHistoryMaitenenceTasks(filteredTasks);

      const purchasePrice = machine["Purchase Price"]
        ? parseFloat(machine["Purchase Price"])
        : (filteredTasks.length > 0 && filteredTasks[0]["Purchase Price"]
          ? parseFloat(filteredTasks[0]["Purchase Price"])
          : 0);

      setTotalMaintenancePurchasePrise(purchasePrice);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcomingTask = machineFilteredTasks.find((task) => {
        if (!task["Task Start Date"]) return false;
        try {
          const dateOnlyStr = task["Task Start Date"].split(" ")[0];
          const taskDate = new Date(dateOnlyStr);
          return taskDate > today;
        } catch {
          return false;
        }
      });

      setNextMaintenanceDate(upcomingTask);

      const totalCost = filteredTasks.reduce((sum, task) => {
        const cost = parseFloat(task["Maintenace Cost"]) || 0;
        return sum + cost;
      }, 0);

      setTotalMaintenanceCost(totalCost);

      const maintenanceToPurchaseRatio = purchasePrice > 0
        ? (totalCost * 100) / purchasePrice
        : 0;
      setPercentMaintenanceToPurchase(maintenanceToPurchaseRatio);

      setMaintenanceCount(filteredTasks.length);

      const healthScore = machineFilteredTasks.length > 0
        ? Math.floor((filteredTasks.length * 100) / machineFilteredTasks.length)
        : 0;
      setMetainanceHealthScore(healthScore);

    } catch (error) {
      console.error("Error fetching maintenance tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  };



  useEffect(() => {
    if (machine && machine["Serial No"]) {
      fetchMaintenanceHistory();
    }
  }, [machine]);




  const getMonthlyMaintenanceCosts = () => {
    const monthlyCosts = {};
    historyMaitenenceTasks.forEach((task) => {
      if (task["Actual Date"] && task["Maintenace Cost"]) {
        try {
          const date = new Date(task["Actual Date"]);
          const month = date.toLocaleString("default", { month: "short" });
          const year = date.getFullYear();
          const monthYear = `${month}-${year}`;
          const cost = parseFloat(task["Maintenace Cost"]) || 0;

          if (monthlyCosts[monthYear]) {
            monthlyCosts[monthYear] += cost;
          } else {
            monthlyCosts[monthYear] = cost;
          }
        } catch (error) {
          console.warn("Invalid date format:", task["Actual Date"]);
        }
      }
    });

    return Object.keys(monthlyCosts).map((monthYear) => ({
      month: monthYear,
      cost: monthlyCosts[monthYear],
    }));
  };


  const monthlyMaintenanceCosts = getMonthlyMaintenanceCosts();

  // Show loading or error state if machine data is not available
  if (!machine) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-700">Loading machine details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Edit/Save/Cancel buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="text-indigo-600 hover:text-indigo-800 flex items-center space-x-2"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back to Machines</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            {machine["Machine Name"] || "Unknown Machine"}
          </h1>
        </div>

        {!isEditing ? (
          <button
            onClick={handleEditClick}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
          >
            <Edit size={16} className="mr-2" />
            Edit Machine
          </button>
        ) : (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleCancelClick}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex-1 sm:flex-none"
            >
              <X size={16} className="mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 flex-1 sm:flex-none"
            >
              {saving ? (
                <Loader2 className="animate-spin mr-2 w-4 h-4" />
              ) : (
                <Save size={16} className="mr-2" />
              )}
              Save
            </button>
          </div>
        )}
      </div>

      {/* Overview Tab with Editable Fields */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Machine Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Machine Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="serialNumber"
                        value={editFormData.serialNumber}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      />
                    ) : (
                      <div className="text-gray-900">{machine?.["Serial No"] || "N/A"}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tag No</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="tagNo"
                        value={editFormData.tagNo}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        placeholder="Enter Tag No"
                      />
                    ) : (
                      <div className="text-gray-900">{machine?.["Tag No"] || "N/A"}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Allot</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="userAllot"
                        value={editFormData.userAllot}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        placeholder="Enter User Allot"
                      />
                    ) : (
                      <div className="text-gray-900">{machine?.["User Allot"] || "N/A"}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="model"
                        value={editFormData.model}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      />
                    ) : (
                      <div className="text-gray-900">{machine?.["Model No"] || "N/A"}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="manufacturer"
                        value={editFormData.manufacturer}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      />
                    ) : (
                      <div className="text-gray-900">{machine?.Manufacturer || "N/A"}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Department & Location */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Department & Location</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="department"
                      value={editFormData.department}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-gray-900">{machine?.Department || "N/A"}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="location"
                      value={editFormData.location}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-gray-900">{machine?.Location || "N/A"}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Purchase Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Purchase Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="purchaseDate"
                      value={editFormData.purchaseDate}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-gray-900">
                      {machine?.["Purchase Date"]
                        ? new Date(machine["Purchase Date"]).toLocaleDateString()
                        : "N/A"
                      }
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                  {isEditing ? (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">₹</span>
                      </div>
                      <input
                        type="number"
                        name="purchasePrice"
                        value={editFormData.purchasePrice}
                        onChange={handleInputChange}
                        className="pl-8 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                      />
                    </div>
                  ) : (
                    <div className="text-gray-900">
                      ₹{machine?.["Purchase Price"]?.toLocaleString() || "N/A"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="vendor"
                      value={editFormData.vendor}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-gray-900">{machine?.Vendor || "N/A"}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expires</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="warrantyExpiration"
                      value={editFormData.warrantyExpiration}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-gray-900">
                      {machine?.["Warranty Expiration"]
                        ? new Date(machine["Warranty Expiration"]).toLocaleDateString()
                        : "N/A"
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Maintenance Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Maintenance Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Maintenance</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="initialMaintenanceDate"
                      value={editFormData.initialMaintenanceDate}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-gray-900">
                      {machine?.["Initial Maintenance Date"]
                        ? new Date(machine["Initial Maintenance Date"]).toLocaleDateString()
                        : "N/A"
                      }
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  {isEditing ? (
                    <textarea
                      name="note"
                      value={editFormData.note}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                  ) : (
                    <div className="text-gray-900">{machine?.Notes || "No notes available"}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Temperature Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Thermometer size={20} className="mr-2 text-indigo-600" />
              Latest Temperature Readings
            </h3>
            <div className="h-64">
              {temperatureGraphData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={temperatureGraphData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 50]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="temp"
                      name="Temperature (°C)"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">No temperature data available</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs for other sections */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === "overview"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              onClick={() => setActiveTab("overview")}
            >
              <FileText size={16} className="inline mr-2" />
              Overview
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === "maintenance"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              onClick={() => setActiveTab("maintenance")}
            >
              <Wrench size={16} className="inline mr-2" />
              Maintenance History
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === "maintenance analytics"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              onClick={() => setActiveTab("maintenance analytics")}
            >
              <BarChart3 size={16} className="inline mr-2" />
              Maintenance Analytics
            </button>
          </nav>
        </div>
        {
          activeTab === "maintenance" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Maintenance History</h3>
                <Link
                  to="/assign-task"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus size={16} className="mr-2" />
                  Schedule Maintenance
                </Link>
              </div>

              {loadingTasks ? (
                <div className="flex justify-center py-8">
                  <div className="text-gray-500">Loading maintenance history...</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Technician
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historyMaitenenceTasks.length > 0 ? (
                        historyMaitenenceTasks.map((record) => (
                          <tr
                            key={record["Task No"] || Math.random()}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record["Task Start Date"]
                                ? new Date(record["Task Start Date"]).toLocaleDateString()
                                : "N/A"
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record["Task Type"] || "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center">
                                <User size={16} className="text-gray-400 mr-2" />
                                {record["Doer Name"] || "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ₹{record["Maintenace Cost"] || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle size={12} className="mr-1" />
                                Completed
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                            No maintenance history available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        }

        {
          activeTab === "maintenance analytics" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">
                    Monthly Maintenance Costs
                  </h3>
                  <div className="h-80">
                    {monthlyMaintenanceCosts.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyMaintenanceCosts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip
                            formatter={(value) => `₹${value.toLocaleString()}`}
                          />
                          <Legend />
                          <Bar dataKey="cost" name="Cost" fill="#4F46E5" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-gray-500">No cost data available</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <DollarSign size={20} className="mr-2 text-indigo-600" />
                    Cost Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center">
                      <p className="text-sm text-gray-500 mb-2">
                        Total Purchase Price
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        ₹{totalMaintenancePurchasePrise?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center">
                      <p className="text-sm text-gray-500 mb-2">
                        Total Maintenance Cost
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        ₹{totalMaintenanceCost?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center col-span-2">
                      <p className="text-sm text-gray-500 mb-2">
                        Maintenance to Purchase Ratio
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        {percentMaintenanceToPurchase.toFixed(2)}%
                      </p>
                      <div className="w-full mt-2 bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${percentMaintenanceToPurchase < 10
                            ? "bg-green-500"
                            : percentMaintenanceToPurchase < 20
                              ? "bg-blue-500"
                              : percentMaintenanceToPurchase < 30
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                          style={{
                            width: `${Math.min(percentMaintenanceToPurchase, 100)}%`,
                          }}
                        ></div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 text-center">
                        {percentMaintenanceToPurchase < 10
                          ? "Excellent value - low maintenance costs"
                          : percentMaintenanceToPurchase < 20
                            ? "Good value - reasonable maintenance costs"
                            : percentMaintenanceToPurchase < 30
                              ? "Fair value - increasing maintenance costs"
                              : "Poor value - high maintenance costs, consider replacement"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">
                  Key Performance Indicators
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {metainanceHealthScore}%
                    </div>
                    <div className="text-sm text-gray-500">
                      Maintenance Health Score
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {maintenanceCount}
                    </div>
                    <div className="text-sm text-gray-500">
                      Total Maintenance Tasks
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      ₹{Math.round(totalMaintenanceCost / Math.max(maintenanceCount, 1)).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      Average Cost per Task
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </div >
    </div >
  );
};

export default MachineDetails;
