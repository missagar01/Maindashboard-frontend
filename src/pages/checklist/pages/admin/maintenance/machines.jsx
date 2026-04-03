import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Plus,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Wrench,
  FileText,
} from "lucide-react";
import MachineDetails from "./machineDetails.jsx";
import NewMachine from "./newMachine.jsx";
import AssignTask from "../MaintenanceTaskAssign.jsx";
import AdminLayout from "../../../components/layout/AdminLayout.jsx";
import axiosInstance from "@/api/checklist/axiosInstance.js";


const Machines = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sheetData, setSheetData] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [loaderMasterSheetData, setLoaderMasterSheetData] = useState(false);
  const [showResultsCount, setShowResultsCount] = useState(false);
  const [resultsCount, setResultsCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);


  // const SCRIPT_URL =
  //   "https://script.google.com/macros/s/AKfycbzudKkY63zbthWP_YcfyF-HnUOObG_XM9aS2JDCmTmcYLaY1OQq7ho6i085BXxu9N2E7Q/exec";
  // const SHEET_NAME = "FormResponses";
  // const SHEET_Id = "15SBKzTJKzaqhjPI5yt5tKkrd3tzNuhm_Q9-iDO8n0B0";

  const [loaderSheetData, setLoaderSheetData] = useState(false);

  // const API_URL = "http://18.60.212.185:5050/api/machines";
  const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();
  const API_URL = `${BACKEND_URL}/api/mainatce/machines`;

  const fetchSheetData = async (pageNumber = 1) => {
    try {
      if (pageNumber === 1) setLoaderSheetData(true);
      else setLoadingMore(true);

      const { data: result } = await axiosInstance.get(`${API_URL}?page=${pageNumber}`);

      if (result.success) {
        const formatted = result.data.map((item) => ({
          "Machine Name": item.machine_name,
          "Serial No": item.serial_no,
          "Tag No": item.tag_no,
          "Department": item.department,
          "Warranty Expiration": item.warranty_expiration,
          "Purchase Date": item.purchase_date,
          "Vendor": item.vendor,
          "Purchase Price": item.purchase_price,
        }));

        if (pageNumber === 1) {
          setSheetData(formatted);
        } else {
          setSheetData((prev) => [...prev, ...formatted]);
        }

        setHasMore(result.nextPage !== null);
      }
    } catch (err) {
      console.error("Failed to fetch machines:", err?.response?.data?.message || err?.message);
    } finally {
      setLoaderSheetData(false);
      setLoadingMore(false);
    }
  };


  useEffect(() => {
    // Page height tracking
  }, [sheetData]);


  const fetchMasterSheetData = async () => {
    try {
      setLoaderMasterSheetData(true);
      const { data: result } = await axiosInstance.get(`${BACKEND_URL}/api/mainatce/master`);

      if (result.success && result.table) {
        const headers = result.table.cols.map((col) => col.label);
        const rows = result.table.rows || [];

        const formattedRows = rows.map((rowObj) => {
          const row = rowObj.c || [];
          const rowData = {};
          row.forEach((cell, i) => {
            if (headers[i]) {
              rowData[headers[i]] = cell ? cell.v : null;
            }
          });
          return rowData;
        });

        const departments = formattedRows
          .map((row) => {
            const columnBValue = Object.values(row)[1];
            return columnBValue;
          })
          .filter((dept) => dept && dept.toString().trim() !== "")
          .filter((dept, index, self) => self.indexOf(dept) === index)
          .sort();

        setDepartmentOptions(departments);
      }
    } catch (err) {
      console.error("Failed to fetch master data:", err?.response?.data?.message || err?.message);
      setDepartmentOptions([]);
    } finally {
      setLoaderMasterSheetData(false);
    }
  };


  useEffect(() => {
    fetchSheetData(1);
    fetchMasterSheetData();
  }, []);





  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };


  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.innerHeight + window.scrollY;
      const bottom = document.documentElement.scrollHeight - 300;

      if (scrollPosition >= bottom && !loadingMore && hasMore) {
        setPage((prevPage) => {
          const nextPage = prevPage + 1;
          fetchSheetData(nextPage);
          return nextPage;
        });
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadingMore, hasMore]);




  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value);
  };

  const filteredMachines = sheetData
    .filter((machine) => {
      const matchesSearch = machine["Machine Name"]
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesDepartment =
        selectedDepartment === "all" ||
        machine["Department"] === selectedDepartment;

      const matchesStatus =
        selectedStatus === "all" || machine["Status"] === selectedStatus;

      return matchesSearch && matchesDepartment && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

  // Show results count when either search or dropdown filter is active
  useEffect(() => {
    const hasActiveSearch = searchTerm.trim() !== "";
    const hasActiveDepartment = selectedDepartment !== "all";

    setShowResultsCount(hasActiveSearch || hasActiveDepartment);
    setResultsCount(filteredMachines.length);
  }, [searchTerm, selectedDepartment, filteredMachines.length]);

  if (selectedMachine) {
    return (
      <MachineDetails
        machine={selectedMachine}
        goBack={() => setSelectedMachine(null)}
      />
    );
  }

  const handleScroll = (e) => {
    const el = e.target;
    const scrollPosition = el.scrollTop + el.clientHeight;
    const bottom = el.scrollHeight - 200;

    if (scrollPosition >= bottom && !loadingMore && hasMore) {
      setPage((prev) => {
        const next = prev + 1;
        fetchSheetData(next);
        return next;
      });
    }
  };


  return (
    // <div className="space-y-6">
    // <div className="space-y-6 min-h-[200vh]">
    <AdminLayout onScroll={handleScroll}>
      <div className="space-y-6 min-h-screen">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Machines</h1>
          <Link
            to="/dashboard/machines/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus size={16} className="mr-2" />
            Add Machine
          </Link>
        </div>

        {/* Filter and Search */}
        <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-1 max-w-md">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search machines..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={handleSearch}
              />
              <Search
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
            </div>

            {/* Results Count Button - Shows for both search and dropdown filters */}
            {showResultsCount && (
              <div className="ml-3 flex items-center">
                <button className="px-3 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg border border-blue-200 hover:bg-blue-200 transition-colors">
                  Results: {resultsCount}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter size={16} className="text-gray-500" />
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedDepartment}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                disabled={loaderMasterSheetData}
              >
                <option value="all">All Departments</option>
                {departmentOptions.map((dept, index) => (
                  <option key={index} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Machine List Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* <div className="overflow-x-auto"> */}
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="">
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      Machine Name
                      {sortColumn === "name" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp size={14} className="ml-1" />
                        ) : (
                          <ArrowDown size={14} className="ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("department")}
                  >
                    <div className="flex items-center">
                      Department
                      {sortColumn === "department" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp size={14} className="ml-1" />
                        ) : (
                          <ArrowDown size={14} className="ml-1" />
                        ))}
                    </div>
                  </th>

                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("nextMaintenance")}
                  >
                    <div className="flex items-center">
                      Next Maintenance
                      {sortColumn === "nextMaintenance" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp size={14} className="ml-1" />
                        ) : (
                          <ArrowDown size={14} className="ml-1" />
                        ))}
                    </div>
                  </th>
                  {/* <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("vendor")}
                  >
                    <div className="flex items-center">
                      Vendor
                    </div>
                  </th>
                  {/* <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("healthScore")}
                  >
                    <div className="flex items-center">
                      Purchase Price
                      {sortColumn === "healthScore" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp size={14} className="ml-1" />
                        ) : (
                          <ArrowDown size={14} className="ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th> */}
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {/* {filteredMachines.map((machine, index) => ( */}
                {sheetData.map((machine, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {machine["Machine Name"]}
                      </div>
                      <div className="text-xs text-gray-500">
                        Tag No: {machine["Tag No"] || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {machine["Department"]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {machine["Warranty Expiration"]
                          ? new Date(machine["Warranty Expiration"]).toLocaleDateString()
                          : ""}
                      </div>

                      <div className="text-xs text-gray-500">
                        Purchase:{" "}
                        {machine["Purchase Date"]
                          ? new Date(machine["Purchase Date"]).toLocaleDateString()
                          : ""}
                      </div>
                    </td>

                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {machine["Vendor"]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ₹{parseFloat(machine["Purchase Price"]).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setSelectedMachine(machine)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                        >
                          <FileText size={18} />
                        </button>
                        <Link
                          to={"/assign-task"}
                          className="text-amber-600 hover:text-amber-900 p-1 rounded hover:bg-amber-50"
                        >
                          <Wrench size={18} />
                        </Link>
                      </div>
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loaderSheetData ? (
            <div className="flex justify-center py-8 flex-col items-center text-gray-600 text-sm">
              <div className="w-6 h-6 border-4 border-blue-500 border-dashed rounded-full animate-spin mb-2"></div>
              Loading machines...
            </div>
          ) : filteredMachines.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">
                No machines found matching your criteria.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Machines;
