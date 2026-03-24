import React, { useEffect, useMemo, useState } from "react";
// import { Plus, User, Building, X, Save, Edit, Trash2, Settings, Search, ChevronDown, Calendar, RefreshCw } from 'lucide-react';
import {
    Plus,
    User,
    Building,
    X,
    Save,
    Edit,
    Trash2,
    Settings,
    Search,
    ChevronDown,
    Calendar,
    RefreshCw,
    Eye,
    EyeOff,
    Delete
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";
import { useAuth } from "../context/AuthContext";
import { patchVerifyAccessApi, patchVerifyAccessDeptApi } from "@/api/checklist/settingApi.js";
import axiosInstance from "@/api/checklist/axiosInstance.js";
import {
    SYSTEM_OPTIONS,
    getPageOptionGroupsForSystems,
    normalizePageAccessEntries,
    normalizeSystemAccessEntries,
    normalizeSystemName,
} from "@/utils/settingsAccessOptions.js";

const Setting = () => {
    const [activeTab, setActiveTab] = useState("users");
    const [showUserModal, setShowUserModal] = useState(false);
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentDeptId, setCurrentDeptId] = useState(null);
    const [usernameFilter, setUsernameFilter] = useState("");
    const [usernameDropdownOpen, setUsernameDropdownOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [activeDeptSubTab, setActiveDeptSubTab] = useState("departments");
    const [showPasswords, setShowPasswords] = useState({}); // Track which passwords are visibl
    const [showModalPassword, setShowModalPassword] = useState(false);
    const [showDeptDropdown, setShowDeptDropdown] = useState(false);
    const [updateMessage, setUpdateMessage] = useState({ type: "", text: "" }); // Success/Error message
    const [isUpdating, setIsUpdating] = useState(false); // Loading state for update
    const [deptUpdateMessage, setDeptUpdateMessage] = useState({ type: "", text: "" }); // Department success/error message
    const [isDeptUpdating, setIsDeptUpdating] = useState(false); // Loading state for department update
    const [verifyAccessValue, setVerifyAccessValue] = useState("");
    const [verifyAccessDepts, setVerifyAccessDepts] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);

    const { settingState, fetchSettingsData, createSettingDepartment, createSettingUser, deleteSettingUser, updateSettingDepartment, updateSettingUser, fetchSettingUserDetails, fetchSettingDepartmentDetails } = useAuth();
    const { settingUserData: userData, settingDepartment: department, settingDepartmentsOnly: departmentsOnly, settingGivenBy: givenBy, settingLoading: loading, settingError: error } = settingState;

    const loadUserList = async () => {
        setUsersLoading(true);
        try {
            await fetchSettingUserDetails();
        } catch (fetchError) {
            console.error("Error fetching setting users:", fetchError);
        } finally {
            setUsersLoading(false);
        }
    };

    // Your existing functions remain the same...
    const handleUsernameFilterSelect = (username) => {
        setUsernameFilter(username);
        setUsernameDropdownOpen(false);
    };

    const clearUsernameFilter = () => {
        setUsernameFilter("");
        setUsernameDropdownOpen(false);
    };

    const toggleUsernameDropdown = () => {
        setUsernameDropdownOpen(!usernameDropdownOpen);
    };

    const togglePasswordVisibility = (userId) => {
        setShowPasswords((prev) => ({
            ...prev,
            [userId]: !prev[userId],
        }));
    };

    const handleAddButtonClick = () => {
        if (activeTab === "users") {
            resetUserForm();
            setIsUpdating(false); // Reset updating state when opening add form
            setUpdateMessage({ type: "", text: "" }); // Clear any previous messages
            setShowUserModal(true);
        } else if (activeTab === "departments") {
            resetDeptForm();
            setShowDeptModal(true);
        }
    };

    const handleUserSelection = (userId, isSelected) => {
        if (isSelected) {
            setSelectedUsers((prev) => [...prev, userId]);
        } else {
            setSelectedUsers((prev) => prev.filter((id) => id !== userId));
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUsers(
                Array.isArray(userData) ? userData.map((user) => user.id) : []
            );
        } else {
            setSelectedUsers([]);
        }
    };

    // Handle tab change
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === "users") {
            loadUserList();
            fetchSettingDepartmentDetails(); // Ensure departments are fetched
        } else if (tab === "departments") {
            fetchSettingDepartmentDetails();
        }
    };

    const [userForm, setUserForm] = useState({
        username: "",
        email: "",
        password: "",
        phone: "",
        employee_id: "",
        department: "", // Single selection for department column
        departments: [], // Change from single department to array
        givenBy: "",
        role: "user",
        status: "active",
        user_access1: "", // Text input for multiple comma-separated values
        systemAccess: [],
        pageAccess: [],
        division: "", // Added division field
    });

    const [divisionOptions, setDivisionOptions] = useState([]); // State for available divisions

    const [deptForm, setDeptForm] = useState({
        name: "",
        givenBy: "",
        division: "",
    });

    const selectedSystemAccess = useMemo(
        () => normalizeSystemAccessEntries(userForm.systemAccess),
        [userForm.systemAccess]
    );

    const selectedPageAccess = useMemo(
        () => normalizePageAccessEntries(userForm.pageAccess, userForm.systemAccess),
        [userForm.pageAccess, userForm.systemAccess]
    );

    const availablePageAccessGroups = useMemo(
        () => getPageOptionGroupsForSystems(userForm.systemAccess),
        [userForm.systemAccess]
    );

    const buildAccessPayload = () => {
        const normalizedSystems = normalizeSystemAccessEntries(userForm.systemAccess);
        const normalizedPages = normalizePageAccessEntries(
            userForm.pageAccess,
            normalizedSystems
        );

        return {
            system_access: normalizedSystems.join(","),
            page_access: normalizedPages.join(","),
        };
    };

    const fetchDivisions = async () => {
        try {
            const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();
            const { data: result } = await axiosInstance.get(`${BACKEND_URL}/api/checklist/assign-task/divisions`);
            if (Array.isArray(result)) {
                setDivisionOptions(result);
            }
        } catch (err) {
            console.error("Division fetch error:", err);
        }
    };

    useEffect(() => {
        loadUserList();
        fetchSettingDepartmentDetails(); // Fetch departments on mount
        fetchDivisions(); // Fetch divisions on mount
    }, []);

    // In your handleAddUser function:
    // Modified handleAddUser
    const handleAddUser = async (e) => {
        e.preventDefault();

        setIsUpdating(true);
        setUpdateMessage({ type: "", text: "" });

        const departmentsString = Array.isArray(userForm.departments)
            ? userForm.departments.join(",")
            : "";

        const { system_access, page_access } = buildAccessPayload();

        const newUser = {
            username: userForm.username?.trim() || "",
            email: userForm.email?.trim() || "",
            password: userForm.password?.trim() || "",
            phone: userForm.phone?.trim() || "",
            employee_id: userForm.employee_id?.trim() || "",
            role: userForm.role || "user",
            status: userForm.status || "active",
            user_access: departmentsString, // Join array into comma-separated string
            department: userForm.department || "", // From single select dropdown
            givenBy: userForm.givenBy?.trim() || "", // Add givenBy field
            user_access1: (() => {
                // Handle user_access1: if it's an array, join with commas; if string, use as is; otherwise convert to string
                if (Array.isArray(userForm.user_access1)) {
                    return userForm.user_access1.filter(Boolean).join(",");
                } else if (userForm.user_access1 !== undefined && userForm.user_access1 !== null) {
                    return typeof userForm.user_access1 === 'string'
                        ? userForm.user_access1.trim()
                        : String(userForm.user_access1).trim();
                }
                return "";
            })(), // Ensure user_access1 is always sent as comma-separated string
            system_access,
            page_access,
            division: userForm.division || "", // Added division
        };

        // Validate required fields
        if (!newUser.username || !newUser.email || !newUser.password || !newUser.department) {
            setUpdateMessage({
                type: "error",
                text: "Please fill in all required fields (Username, Email, Password, Department).",
            });
            setIsUpdating(false);
            return;
        }

        try {
            const result = await createSettingUser(newUser);

            if (result) {
                // Show success message
                setUpdateMessage({
                    type: "success",
                    text: "User created successfully! ✅",
                });

                // Refresh user data immediately
                fetchSettingUserDetails();

                // Keep modal open for 2 seconds to show success message, then close
                setTimeout(() => {
                    resetUserForm();
                    setShowUserModal(false);
                    setUpdateMessage({ type: "", text: "" });
                    // Refresh again to ensure UI updates
                    fetchSettingUserDetails();
                }, 2000);
            } else {
                throw new Error("Creation failed - no response from server");
            }
        } catch (error) {
            console.error("Error adding user:", error);
            const errorMessage =
                error?.message ||
                error?.error ||
                "Failed to create user. Please check your input and try again.";
            setUpdateMessage({
                type: "error",
                text: `Error: ${errorMessage}`,
            });
            setIsUpdating(false); // Re-enable button on error
        }
    };

    // Modified handleUpdateUser
    const handleUpdateUser = async (e) => {
        e.preventDefault();

        if (!currentUserId) {
            setUpdateMessage({
                type: "error",
                text: "User ID is missing. Please try again.",
            });
            return;
        }

        setIsUpdating(true);
        setUpdateMessage({ type: "", text: "" });

        // Prepare updated user data
        const departmentsString = Array.isArray(userForm.departments)
            ? userForm.departments.join(",")
            : "";
        const { system_access, page_access } = buildAccessPayload();

        const updatedUser = {
            user_name: userForm.username?.trim() || "",
            email_id: userForm.email?.trim() || "",
            number: userForm.phone?.trim() || "",
            employee_id: userForm.employee_id?.trim() || "",
            role: userForm.role || "user",
            status: userForm.status || "active",
            user_access: departmentsString, // Join array into comma-separated string
            department: userForm.department || "", // From single select dropdown
            user_access1: (() => {
                // Handle user_access1: if it's an array, join with commas; if string, use as is; otherwise convert to string
                if (Array.isArray(userForm.user_access1)) {
                    return userForm.user_access1.filter(Boolean).join(",");
                } else if (userForm.user_access1 !== undefined && userForm.user_access1 !== null) {
                    return typeof userForm.user_access1 === 'string'
                        ? userForm.user_access1.trim()
                        : String(userForm.user_access1).trim();
                }
                return "";
            })(), // Ensure user_access1 is always sent as comma-separated string
            system_access,
            page_access,
            division: userForm.division || "", // Added division
        };

        // Only include password if it's not empty
        if (userForm.password && userForm.password.trim() !== "") {
            updatedUser.password = userForm.password.trim();
        }

        // Debug: Log the data being sent
        console.log("Updating user with data:", {
            id: currentUserId,
            updatedUser: {
                ...updatedUser,
                password: updatedUser.password ? "***" : undefined
            }
        });

        try {
            const result = await updateSettingUser({ id: currentUserId, updatedUser });

            if (result) {
                // Show success message
                setUpdateMessage({
                    type: "success",
                    text: "User updated successfully! ✅",
                });

                // Refresh user data immediately
                fetchSettingUserDetails();

                // Keep modal open for 2 seconds to show success message, then close
                setTimeout(() => {
                    resetUserForm();
                    setShowUserModal(false);
                    setUpdateMessage({ type: "", text: "" });
                    // Refresh again to ensure UI updates
                    fetchSettingUserDetails();
                }, 2000);
            } else {
                throw new Error("Update failed - no response from server");
            }
        } catch (error) {
            console.error("❌ Error updating user:", error);
            console.error("Error details:", {
                message: error?.message,
                error: error?.error,
                response: error?.response
            });

            // Extract error message from various possible locations
            let errorMessage = "Failed to update user. Please check your input and try again.";

            if (error?.message) {
                errorMessage = error.message;
            } else if (error?.error) {
                errorMessage = typeof error.error === 'string' ? error.error : error.error.message || errorMessage;
            } else if (error?.detail) {
                errorMessage = error.detail;
            }

            setUpdateMessage({
                type: "error",
                text: `Error: ${errorMessage}`,
            });
            setIsUpdating(false); // Re-enable button on error
        }
    };

    // Modified handleAddDepartment
    const handleAddDepartment = async (e) => {
        e.preventDefault();

        setIsDeptUpdating(true);
        setDeptUpdateMessage({ type: "", text: "" });

        // Validate required fields
        if (!deptForm.name || deptForm.name.trim() === "") {
            setDeptUpdateMessage({
                type: "error",
                text: "Please enter a department name",
            });
            setIsDeptUpdating(false);
            return;
        }

        const newDept = {
            name: deptForm.name.trim(),
            givenBy: deptForm.givenBy?.trim() || null,
            division: deptForm.division || null,
        };

        try {
            const result = await createSettingDepartment(newDept);

            if (result) {
                // Show success message
                setDeptUpdateMessage({
                    type: "success",
                    text: "Department created successfully! ✅",
                });

                // Refresh department data
                fetchSettingDepartmentDetails();

                // Keep modal open for 2 seconds to show success message, then close
                setTimeout(() => {
                    resetDeptForm();
                    setShowDeptModal(false);
                    setDeptUpdateMessage({ type: "", text: "" });
                    // Refresh again to ensure UI updates
                    fetchSettingDepartmentDetails();
                }, 2000);
            } else {
                throw new Error("Creation failed - no response from server");
            }
        } catch (error) {
            console.error("Error adding department:", error);
            const errorMessage = error?.message || error?.error || "Failed to create department. Please try again.";
            setDeptUpdateMessage({
                type: "error",
                text: `Error: ${errorMessage}`,
            });
            setIsDeptUpdating(false);
        }
    };

    // Modified handleUpdateDepartment
    const handleUpdateDepartment = async (e) => {
        e.preventDefault();

        setIsDeptUpdating(true);
        setDeptUpdateMessage({ type: "", text: "" });

        // Validate required fields
        if (!deptForm.name || deptForm.name.trim() === "") {
            setDeptUpdateMessage({
                type: "error",
                text: "Please enter a department name",
            });
            setIsDeptUpdating(false);
            return;
        }

        if (!currentDeptId) {
            setDeptUpdateMessage({
                type: "error",
                text: "Department ID is missing. Please try again.",
            });
            setIsDeptUpdating(false);
            return;
        }

        const updatedDept = {
            department: deptForm.name.trim(),
            given_by: deptForm.givenBy?.trim() || null,
            division: deptForm.division || null,
        };

        try {
            const result = await updateSettingDepartment({ id: currentDeptId, updatedDept });

            if (result) {
                // Show success message
                setDeptUpdateMessage({
                    type: "success",
                    text: "Department updated successfully! ✅",
                });

                // Refresh department data
                fetchSettingDepartmentDetails();

                // Keep modal open for 2 seconds to show success message, then close
                setTimeout(() => {
                    resetDeptForm();
                    setShowDeptModal(false);
                    setDeptUpdateMessage({ type: "", text: "" });
                    // Refresh again to ensure UI updates
                    fetchSettingDepartmentDetails();
                }, 2000);
            } else {
                throw new Error("Update failed - no response from server");
            }
        } catch (error) {
            console.error("Error updating department:", error);
            const errorMessage = error?.message || error?.error || "Failed to update department. Please try again.";
            setDeptUpdateMessage({
                type: "error",
                text: `Error: ${errorMessage}`,
            });
            setIsDeptUpdating(false);
        }
    };

    // Modified handleDeleteUser
    const handleDeleteUser = async (userId) => {
        try {
            await deleteSettingUser(userId);
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    };

    // User form handlers
    const handleUserInputChange = (e) => {
        const { name, value, options } = e.target;

        if (name === "departments") {
            // For multi-select dropdown
            const selectedValues = Array.from(options)
                .filter((option) => option.selected)
                .map((option) => option.value);

            setUserForm((prev) => ({ ...prev, [name]: selectedValues }));
        } else if (name === "division") {
            // When division changes, reset department and departments access
            setUserForm((prev) => ({
                ...prev,
                [name]: value,
                department: "",
                departments: [],
            }));
        } else {
            setUserForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const toggleSystemAccessOption = (option) => {
        const normalizedOption = normalizeSystemName(option) || option;
        setUserForm((prev) => {
            const currentSystems = normalizeSystemAccessEntries(prev.systemAccess);
            const hasOption = currentSystems.includes(normalizedOption);
            const nextSystems = hasOption
                ? currentSystems.filter((item) => item !== normalizedOption)
                : [...currentSystems, normalizedOption];

            return {
                ...prev,
                systemAccess: nextSystems,
                pageAccess: normalizePageAccessEntries(prev.pageAccess, nextSystems),
            };
        });
    };

    const togglePageAccessOption = (option) => {
        setUserForm((prev) => {
            const currentPages = normalizePageAccessEntries(
                prev.pageAccess,
                prev.systemAccess
            );
            const hasOption = currentPages.includes(option);
            return {
                ...prev,
                pageAccess: hasOption
                    ? currentPages.filter((item) => item !== option)
                    : [...currentPages, option],
            };
        });
    };

    const handleAddVerifyDept = async (dept) => {
        if (!dept || verifyAccessDepts.includes(dept)) return;

        try {
            await patchVerifyAccessDeptApi({
                id: currentUserId,
                verify_access_dept: dept
            });

            setVerifyAccessDepts(prev => [...prev, dept]);
            fetchSettingUserDetails();
        } catch (err) {
            alert("Failed to add department access");
        }
    };

    const handleRemoveVerifyDept = async (dept) => {
        try {
            await patchVerifyAccessDeptApi({
                id: currentUserId,
                verify_access_dept: dept
            });

            setVerifyAccessDepts(prev => prev.filter(d => d !== dept));
            fetchSettingUserDetails();
        } catch (err) {
            alert("Failed to remove department access");
        }
    };

    // Get unique departments from department data
    const availableDepartments = React.useMemo(() => {
        if (department && department.length > 0) {
            let filteredDepts = department;

            // If user has selected a division, filter departments by that division
            if (userForm.division) {
                filteredDepts = department.filter(
                    (dept) => dept.division === userForm.division
                );
            }

            return [...new Set(filteredDepts.map((dept) => dept.department))]
                .filter((deptName) => deptName && deptName.trim() !== "")
                .sort();
        }
        return [];
    }, [department, userForm.division]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showDeptDropdown && !event.target.closest(".relative")) {
                setShowDeptDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showDeptDropdown]);

    const handleEditUser = (userId) => {
        if (!Array.isArray(userData)) {
            console.error("userData is not an array");
            return;
        }

        const user = userData.find((u) => u && u.id === userId);
        if (!user) {
            console.error("User not found");
            return;
        }

        setVerifyAccessValue(user.verify_access || "");

        setVerifyAccessDepts(
            user.verify_access_dept
                ? user.verify_access_dept.split(",").map(d => d.trim()).filter(Boolean)
                : []
        );


        const systemAccessArray = normalizeSystemAccessEntries(user.system_access);
        const pageAccessArray = normalizePageAccessEntries(
            user.page_access,
            systemAccessArray
        );

        setUserForm({
            username: user.user_name || "",
            email: user.email_id || "",
            password: "", // Leave empty initially, user can change if needed
            phone: user.number || "",
            employee_id: user.employee_id || "",
            department: user.department || "",
            departments: user.user_access
                ? user.user_access
                    .split(",")
                    .map((d) => d.trim())
                    .filter(Boolean)
                : [], // Split comma-separated string into array
            givenBy: user.givenBy || "",
            role: user.role || "user",
            status: user.status || "active",
            user_access1: user.user_access1 !== null && user.user_access1 !== undefined
                ? String(user.user_access1)
                : "", // Ensure it's always a string
            systemAccess: systemAccessArray,
            pageAccess: pageAccessArray,
            division: user.division || "", // Populating division field
        });
        setCurrentUserId(userId);
        setIsEditing(true);
        setIsUpdating(false); // Reset updating state when opening edit form
        setUpdateMessage({ type: "", text: "" }); // Clear any previous messages
        setShowUserModal(true);
    };

    const handleEditDepartment = (deptId) => {
        const dept = department.find((d) => d.id === deptId);
        if (dept) {
            setDeptForm({
                name: dept.department || "",
                givenBy: dept.given_by || "",
                division: dept.division || "",
            });
            setCurrentDeptId(deptId);
            setShowDeptModal(true);
        }
    };

    const resetUserForm = () => {
        setUserForm({
            username: "",
            email: "",
            password: "",
            phone: "",
            employee_id: "",
            department: "",
            departments: [], // Reset to empty array
            givenBy: "",
            role: "user",
            status: "active",
            user_access1: "", // Reset user_access1 to empty string
            systemAccess: [],
            pageAccess: [],
            division: "", // Resetting division field
        });
        setIsEditing(false);
        setCurrentUserId(null);
        setIsUpdating(false); // Reset updating state when resetting form
        setUpdateMessage({ type: "", text: "" }); // Clear messages
        setVerifyAccessValue("");
        setVerifyAccessDepts([]);
    };

    // Department form handlers
    const handleDeptInputChange = (e) => {
        const { name, value } = e.target;
        setDeptForm((prev) => ({ ...prev, [name]: value }));
    };

    const resetDeptForm = () => {
        setDeptForm({
            name: "",
            givenBy: "",
            division: "",
        });
        setCurrentDeptId(null);
        setIsDeptUpdating(false);
        setDeptUpdateMessage({ type: "", text: "" });
    };

    // Modified handleDeleteDepartment
    const handleDeleteDepartment = async (deptId) => {
        if (!window.confirm("Are you sure you want to delete this department?")) {
            return;
        }

        try {
            const result = await dispatch(deleteDepartment(deptId)).unwrap();

            if (result) {
                // Refresh department data
                dispatch(departmentDetails());
                dispatch(departmentOnlyDetails());
                dispatch(givenByDetails());

                alert("Department deleted successfully! ✅");
            }
        } catch (error) {
            console.error("Error deleting department:", error);
            const errorMessage = error?.message || error?.error || "Failed to delete department. Please try again.";
            alert(`Error: ${errorMessage}`);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!Array.isArray(userData)) {
            return [];
        }

        return userData.filter((user) => {
            if (user?.user_name === "admin") return false;
            if (!usernameFilter) return true;

            const search = usernameFilter.toLowerCase();

            return (
                (user?.user_name &&
                    user.user_name.toLowerCase().includes(search)) ||
                (user?.employee_id &&
                    String(user.employee_id).toLowerCase().includes(search))
            );
        });
    }, [userData, usernameFilter]);

    const getStatusColor = (status) => {
        return status === "active"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800";
    };

    const getRoleColor = (role) => {
        switch (role) {
            case "admin":
                return "bg-blue-100 text-blue-800";
            case "manager":
                return "bg-purple-100 text-purple-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const handleVerifyAccessChange = async (userId, value) => {
        try {
            await patchVerifyAccessApi({
                id: userId,
                verify_access: value.toLowerCase()
            });

            // refresh users
            fetchSettingUserDetails();
        } catch (error) {
            console.error("Verify access update failed", error);
            alert("Failed to update verify access");
        }
    };


    return (
        <AdminLayout>
            <div className="space-y-8">
                {/* Header and Tabs */}
                <div className="my-3 sm:my-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <h1 className="text-xl sm:text-2xl font-bold text-red-600">
                            Settings
                        </h1>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                            <div className="flex border border-purple-200 rounded-md overflow-hidden w-full sm:w-auto">
                                <button
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium ${activeTab === "users"
                                        ? "bg-purple-600 text-white"
                                        : "bg-white text-purple-600 hover:bg-purple-50"
                                        }`}
                                    onClick={() => {
                                        handleTabChange("users");
                                    }}
                                >
                                    <User size={16} className="sm:w-[18px] sm:h-[18px]" />
                                    <span className="hidden xs:inline">Users</span>
                                </button>
                                <button
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium ${activeTab === "departments"
                                        ? "bg-purple-600 text-white"
                                        : "bg-white text-purple-600 hover:bg-purple-50"
                                        }`}
                                    onClick={() => {
                                        handleTabChange("departments");
                                    }}
                                >
                                    <Building size={16} className="sm:w-[18px] sm:h-[18px]" />
                                    <span className="hidden xs:inline">Departments</span>
                                </button>
                            </div>

                            {/* <button
                                onClick={fetchDeviceLogsAndUpdateStatus}
                                disabled={isRefreshing}
                                className="w-full sm:w-auto rounded-md bg-green-600 py-2 px-3 sm:px-4 text-white hover:bg-green-700 text-xs sm:text-sm"
                            >
                                <div className="flex items-center justify-center">
                                    <RefreshCw
                                        size={16}
                                        className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                                    />
                                    <span className="hidden sm:inline">
                                        {isRefreshing ? "Refreshing..." : "Refresh Status"}
                                    </span>
                                    <span className="sm:hidden">Refresh</span>
                                </div>
                            </button> */}

                            {/* Add button */}
                            <button
                                onClick={handleAddButtonClick}
                                className="w-full sm:w-auto rounded-md bg-red-600 py-2 px-3 sm:px-4 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-xs sm:text-sm"
                            >
                                <div className="flex items-center justify-center">
                                    <Plus size={16} className="mr-2" />
                                    <span>
                                        {activeTab === "users" ? "Add User" : "Add Department"}
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Users Tab */}
                {activeTab === "users" && (
                    <div className="bg-white shadow rounded-lg overflow-hidden border border-purple-200">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple px-3 sm:px-6 py-3 sm:py-4 border-gray-200">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
                                <h2 className="text-base sm:text-lg font-medium text-purple-700">
                                    User List
                                </h2>

                                {/* Username Filter */}
                                <div className="relative w-full sm:w-auto">
                                    <div className="flex items-center gap-2">
                                        {/* Input with datalist for autocomplete */}
                                        <div className="relative flex-1 sm:flex-none">
                                            <Search
                                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                                size={16}
                                            />
                                            <input
                                                type="text"
                                                list="usernameOptions"
                                                placeholder="Filter by username..."
                                                value={usernameFilter}
                                                onChange={(e) => setUsernameFilter(e.target.value)}
                                                className="w-full sm:w-48 pl-10 pr-8 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                            />
                                            <datalist id="usernameOptions">
                                                {Array.isArray(userData) &&
                                                    userData
                                                        .filter((user) => user && user.id && user.user_name && user.user_name !== "admin")
                                                        .map((user) => (
                                                            <option
                                                                key={user.id}
                                                                value={`${user.user_name} (${user.employee_id || "N/A"})`}
                                                            />
                                                        ))}
                                            </datalist>

                                            {/* Clear button for input */}
                                            {usernameFilter && (
                                                <button
                                                    onClick={clearUsernameFilter}
                                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Dropdown button */}
                                        <button
                                            onClick={toggleUsernameDropdown}
                                            className="flex items-center gap-1 px-3 py-2 border border-purple-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                            <ChevronDown
                                                size={16}
                                                className={`transition-transform ${usernameDropdownOpen ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Dropdown menu */}
                                    {usernameDropdownOpen && (
                                        <div className="absolute z-50 mt-1 w-full sm:w-56 rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto top-full right-0">
                                            <div className="py-1">
                                                <button
                                                    onClick={clearUsernameFilter}
                                                    className={`block w-full text-left px-4 py-2 text-sm ${!usernameFilter
                                                        ? "bg-purple-100 text-purple-900"
                                                        : "text-gray-700 hover:bg-gray-100"
                                                        }`}
                                                >
                                                    All Usernames
                                                </button>
                                                {Array.isArray(userData) &&
                                                    userData
                                                        .filter((user) => user && user.user_name !== "admin")
                                                        .map((user) => (
                                                            <button
                                                                key={user.id}
                                                                onClick={() =>
                                                                    handleUsernameFilterSelect(user.user_name)
                                                                }
                                                                className={`block w-full text-left px-4 py-2 text-sm ${usernameFilter === user.user_name
                                                                    ? "bg-purple-100 text-purple-900"
                                                                    : "text-gray-700 hover:bg-gray-100"
                                                                    }`}
                                                            >
                                                                {user.user_name}
                                                            </button>
                                                        ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="h-[calc(100vh-275px)] sm:h-[calc(100vh-250px)] overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Actions
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Emp ID
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Username
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Password
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Email
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Phone
                                        </th>

                                        <th
                                            scope="col"
                                            className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Department
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Status
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Role
                                        </th>
                                        {/* <th
                                            scope="col"
                                            className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Page Access
                                        </th> */}

                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {usersLoading ? (
                                        <tr>
                                            <td
                                                colSpan="9"
                                                className="px-6 py-16 text-center text-sm text-gray-500"
                                            >
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
                                                    <span>Loading users...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length > 0 ? (
                                        filteredUsers.map((user, index) => (
                                            <tr
                                                key={user?.id || index}
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex space-x-1 sm:space-x-2 justify-end">
                                                        <button
                                                            onClick={() => handleEditUser(user?.id)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                            title="Edit User"
                                                        >
                                                            <Edit
                                                                size={16}
                                                                className="sm:w-[18px] sm:h-[18px]"
                                                            />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user?.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Delete User"
                                                        >
                                                            <Trash2
                                                                size={16}
                                                                className="sm:w-[18px] sm:h-[18px]"
                                                            />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xs sm:text-sm text-gray-900">
                                                        {user?.employee_id || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xs sm:text-sm font-medium text-gray-900">
                                                        {user?.user_name}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xs sm:text-sm text-gray-900">
                                                        <div className="flex items-center space-x-1 sm:space-x-2">
                                                            <span className="font-mono text-xs">
                                                                {showPasswords[user.id]
                                                                    ? user?.password
                                                                    : "••••••••"}
                                                            </span>
                                                            <button
                                                                onClick={() =>
                                                                    togglePasswordVisibility(user.id)
                                                                }
                                                                className="text-gray-500 hover:text-blue-600 text-xs"
                                                                title={
                                                                    showPasswords[user.id]
                                                                        ? "Hide Password"
                                                                        : "Show Password"
                                                                }
                                                            >
                                                                {showPasswords[user.id] ? "👁️‍🗨️" : "👁️"}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(
                                                                        user?.password || ""
                                                                    );
                                                                    alert("Password copied to clipboard!");
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800 text-xs bg-blue-50 px-1 sm:px-2 py-1 rounded"
                                                                title="Copy Password"
                                                            >
                                                                Copy
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 whitespace-normal">
                                                    <div className="text-xs sm:text-sm text-gray-900">
                                                        {user?.email_id}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xs sm:text-sm text-gray-900">
                                                        {user?.number}
                                                    </div>
                                                </td>

                                                <td className="px-3 sm:px-6 py-4 whitespace-normal">
                                                    <div className="text-xs sm:text-sm text-gray-900 break-words">
                                                        {user?.department || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <span
                                                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                                                user?.status
                                                            )}`}
                                                        >
                                                            {user?.status}
                                                        </span>
                                                        {user?.status === "active" && (
                                                            <span
                                                                className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"
                                                                title="Live Status"
                                                            ></span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(
                                                            user?.role
                                                        )}`}
                                                    >
                                                        {user?.role}
                                                    </span>
                                                </td>
                                                {/* <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(
                                                                user?.role
                                                            )} truncate max-w-[100px] sm:max-w-none`}
                                                        >
                                                            {user?.page_access}
                                                        </span>
                                                    </td> */}

                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan="9"
                                                className="px-6 py-4 text-center text-sm text-gray-500"
                                            >
                                                No users found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Departments Tab */}
                {activeTab === "departments" && (
                    <div className="bg-white shadow rounded-lg overflow-hidden border border-purple-200">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple px-3 sm:px-6 py-3 sm:py-4 border-gray-200">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
                                <h2 className="text-base sm:text-lg font-medium text-purple-700">
                                    Department Management
                                </h2>

                                {/* Sub-tabs for Departments and Given By */}
                                <div className="flex border border-purple-200 rounded-md overflow-hidden w-full sm:w-auto">
                                    <button
                                        className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium ${activeDeptSubTab === "departments"
                                            ? "bg-purple-600 text-white"
                                            : "bg-white text-purple-600 hover:bg-purple-50"
                                            }`}
                                        onClick={() => setActiveDeptSubTab("departments")}
                                    >
                                        Departments
                                    </button>
                                    <button
                                        className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium ${activeDeptSubTab === "givenBy"
                                            ? "bg-purple-600 text-white"
                                            : "bg-white text-purple-600 hover:bg-purple-50"
                                            }`}
                                        onClick={() => setActiveDeptSubTab("givenBy")}
                                    >
                                        Given By
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="p-8 text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                <p className="mt-2 text-gray-600">Loading...</p>
                            </div>
                        )}

                        {/* Error State */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-md m-4">
                                <p className="text-red-600">Error: {error}</p>
                            </div>
                        )}

                        {/* Departments Sub-tab - Show only department names */}
                        {activeDeptSubTab === "departments" && !loading && (
                            <div className="h-[calc(100vh-275px)] sm:h-[calc(100vh-250px)] overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                ID
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Department Name
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {department && department.length > 0 ? (
                                            // Get unique departments and show them
                                            Array.from(
                                                new Map(
                                                    department.map((dept) => [dept.department, dept])
                                                ).values()
                                            )
                                                .filter(
                                                    (dept) =>
                                                        dept?.department && dept.department.trim() !== ""
                                                )
                                                .map((dept, index) => (
                                                    <tr key={dept.id} className="hover:bg-gray-50">
                                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                                            {index + 1}
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                                            {dept.department}
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">


                                                            <div className="flex space-x-1 sm:space-x-2 justify-end">
                                                                <button
                                                                    onClick={() => handleEditDepartment(dept.id)}
                                                                    className="text-blue-600 hover:text-blue-900"
                                                                    title="Edit User"
                                                                >
                                                                    <Edit
                                                                        size={16}
                                                                        className="sm:w-[18px] sm:h-[18px]"
                                                                    />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteDepartment(dept.id)}
                                                                    className="text-red-600 hover:text-red-900"
                                                                    title="Delete User"
                                                                >
                                                                    <Trash2
                                                                        size={16}
                                                                        className="sm:w-[18px] sm:h-[18px]"
                                                                    />
                                                                </button>
                                                            </div>


                                                        </td>
                                                    </tr>
                                                ))
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan="3"
                                                    className="px-3 sm:px-6 py-4 text-center text-xs sm:text-sm text-gray-500"
                                                >
                                                    No departments found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Given By Sub-tab - Show only given_by values */}
                        {activeDeptSubTab === "givenBy" && !loading && (
                            <div className="h-[calc(100vh-275px)] sm:h-[calc(100vh-250px)] overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                ID
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Given By
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {department && department.length > 0 ? (
                                            // Get unique given_by values and show them
                                            Array.from(
                                                new Map(
                                                    department.map((dept) => [dept.given_by, dept])
                                                ).values()
                                            )
                                                .filter(
                                                    (dept) =>
                                                        dept?.given_by && dept.given_by.trim() !== ""
                                                )
                                                .map((dept, index) => (
                                                    <tr key={dept.id} className="hover:bg-gray-50">
                                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                                            {index + 1}
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                                            {dept.given_by}
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <div className="flex space-x-2 justify-end">
                                                                <button
                                                                    onClick={() => handleEditDepartment(dept.id)}
                                                                    className="text-blue-600 hover:text-blue-900"
                                                                >
                                                                    <Edit
                                                                        size={16}
                                                                        className="sm:w-[18px] sm:h-[18px]"
                                                                    />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan="3"
                                                    className="px-3 sm:px-6 py-4 text-center text-xs sm:text-sm text-gray-500"
                                                >
                                                    No given by data found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* User Modal */}
                {showUserModal && (
                    <div
                        className="fixed z-50 inset-y-0 right-0 left-0 xl:left-[240px] overflow-y-auto"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setIsUpdating(false);
                                setShowUserModal(false);
                                resetUserForm();
                            }
                        }}
                    >
                        <div className="flex items-center justify-center min-h-screen px-2 sm:px-4 py-4">
                            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                                <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-4 sm:px-6 py-4 flex justify-between items-center">
                                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                                        {isEditing ? "Edit User" : "Create New User"}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsUpdating(false); // Reset updating state when closing modal
                                            setShowUserModal(false);
                                            resetUserForm();
                                        }}
                                        className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded p-1"
                                        aria-label="Close"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="px-4 sm:px-6 py-4 bg-white">
                                    {/* Success/Error Message */}
                                    {updateMessage.text && (
                                        <div
                                            className={`mb-4 p-3 rounded-md ${updateMessage.type === "success"
                                                ? "bg-green-50 border border-green-200 text-green-800"
                                                : "bg-red-50 border border-red-200 text-red-800"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">
                                                    {updateMessage.text}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        setUpdateMessage({ type: "", text: "" })
                                                    }
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <form
                                        onSubmit={isEditing ? handleUpdateUser : handleAddUser}
                                        className="bg-white"
                                    >
                                        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 bg-white">
                                            <div className="sm:col-span-2 lg:col-span-1">
                                                <label
                                                    htmlFor="username"
                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                >
                                                    Username
                                                </label>
                                                <input
                                                    type="text"
                                                    name="username"
                                                    id="username"
                                                    value={userForm.username}
                                                    onChange={handleUserInputChange}
                                                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    required
                                                />
                                            </div>

                                            <div className="sm:col-span-2 lg:col-span-1">
                                                <label
                                                    htmlFor="password"
                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                >
                                                    Password
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showModalPassword ? "text" : "password"}
                                                        name="password"
                                                        id="password"
                                                        value={userForm.password}
                                                        onChange={handleUserInputChange}
                                                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder={
                                                            isEditing
                                                                ? "Leave empty to keep current password"
                                                                : "Enter password"
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowModalPassword(!showModalPassword)
                                                        }
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none"
                                                    >
                                                        {showModalPassword ? (
                                                            <EyeOff
                                                                size={18}
                                                                className="text-gray-400 hover:text-gray-600"
                                                            />
                                                        ) : (
                                                            <Eye
                                                                size={18}
                                                                className="text-gray-400 hover:text-gray-600"
                                                            />
                                                        )}
                                                    </button>
                                                </div>
                                                {isEditing && (
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Leave empty to keep current password
                                                    </p>
                                                )}
                                            </div>

                                            <div className="sm:col-span-2 lg:col-span-1">
                                                <label
                                                    htmlFor="email"
                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                >
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    id="email"
                                                    value={userForm.email}
                                                    onChange={handleUserInputChange}
                                                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    required
                                                />
                                            </div>

                                            <div className="sm:col-span-2 lg:col-span-1">
                                                <label
                                                    htmlFor="phone"
                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                >
                                                    Phone
                                                </label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    id="phone"
                                                    value={userForm.phone}
                                                    onChange={handleUserInputChange}
                                                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>

                                            <div className="sm:col-span-2 lg:col-span-1">
                                                <label
                                                    htmlFor="employee_id"
                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                >
                                                    Employee ID
                                                </label>
                                                <input
                                                    type="text"
                                                    name="employee_id"
                                                    id="employee_id"
                                                    value={userForm.employee_id}
                                                    onChange={handleUserInputChange}
                                                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Enter Employee ID"
                                                />
                                            </div>

                                            <div className="sm:col-span-2 lg:col-span-1">
                                                <label
                                                    htmlFor="division"
                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                >
                                                    Division
                                                </label>
                                                <select
                                                    id="division"
                                                    name="division"
                                                    value={userForm.division}
                                                    onChange={handleUserInputChange}
                                                    className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">Select Division</option>
                                                    {divisionOptions.map((div) => (
                                                        <option key={div} value={div}>
                                                            {div}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="sm:col-span-2 lg:col-span-1">
                                                <label
                                                    htmlFor="department"
                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                >
                                                    Department
                                                </label>
                                                <select
                                                    id="department"
                                                    name="department"
                                                    value={userForm.department}
                                                    onChange={handleUserInputChange}
                                                    className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    required
                                                >
                                                    <option value="">Select Department</option>
                                                    {availableDepartments.map((dept) => (
                                                        <option key={dept} value={dept}>
                                                            {dept}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="sm:col-span-2 lg:col-span-1">
                                                <label
                                                    htmlFor="role"
                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                >
                                                    Role
                                                </label>
                                                <select
                                                    id="role"
                                                    name="role"
                                                    value={userForm.role}
                                                    onChange={handleUserInputChange}
                                                    className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="manager">Manager</option>
                                                </select>
                                            </div>

                                            <div className="sm:col-span-2 lg:col-span-3">
                                                <label
                                                    htmlFor="user_access1"
                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                >
                                                    User Access 1 (Comma-separated values)
                                                </label>
                                                <input
                                                    type="text"
                                                    name="user_access1"
                                                    id="user_access1"
                                                    value={userForm.user_access1}
                                                    onChange={handleUserInputChange}
                                                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Enter values separated by commas (e.g., value1, value2, value3)"
                                                />
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Enter multiple values separated by commas. Database
                                                    supports long text.
                                                </p>
                                            </div>



                                            <div className="sm:col-span-2 lg:col-span-3">
                                                <label
                                                    htmlFor="departments"
                                                    className="block text-sm font-medium text-gray-700"
                                                >
                                                    Departments Access (Multiple Selection)
                                                </label>

                                                {/* Dropdown trigger button */}
                                                <div className="relative mt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowDeptDropdown(!showDeptDropdown)
                                                        }
                                                        className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="block truncate">
                                                                {userForm.departments.length === 0
                                                                    ? "Select Departments"
                                                                    : `${userForm.departments.length} department(s) selected`}
                                                            </span>
                                                            <ChevronDown
                                                                size={16}
                                                                className={`text-gray-400 transition-transform ${showDeptDropdown ? "rotate-180" : ""
                                                                    }`}
                                                            />
                                                        </div>
                                                    </button>

                                                    {/* Dropdown with checkboxes */}
                                                    {showDeptDropdown && (
                                                        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg border border-gray-300 rounded-md max-h-60 overflow-y-auto">
                                                            <div className="p-2">
                                                                {/* Select All option */}
                                                                <div className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        id="selectAllDepartments"
                                                                        checked={
                                                                            userForm.departments.length ===
                                                                            availableDepartments.length &&
                                                                            availableDepartments.length > 0
                                                                        }
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setUserForm((prev) => ({
                                                                                    ...prev,
                                                                                    departments: availableDepartments,
                                                                                }));
                                                                            } else {
                                                                                setUserForm((prev) => ({
                                                                                    ...prev,
                                                                                    departments: [],
                                                                                }));
                                                                            }
                                                                        }}
                                                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                    />
                                                                    <label
                                                                        htmlFor="selectAllDepartments"
                                                                        className="ml-3 text-sm text-gray-700 cursor-pointer"
                                                                    >
                                                                        Select All
                                                                    </label>
                                                                </div>

                                                                <div className="border-t border-gray-200 my-2"></div>

                                                                {/* Department checkboxes */}
                                                                {availableDepartments.map((dept, index) => (
                                                                    <div
                                                                        key={index}
                                                                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`dept-${index}`}
                                                                            checked={userForm.departments.includes(
                                                                                dept
                                                                            )}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setUserForm((prev) => ({
                                                                                        ...prev,
                                                                                        departments: [
                                                                                            ...prev.departments,
                                                                                            dept,
                                                                                        ],
                                                                                    }));
                                                                                } else {
                                                                                    setUserForm((prev) => ({
                                                                                        ...prev,
                                                                                        departments:
                                                                                            prev.departments.filter(
                                                                                                (d) => d !== dept
                                                                                            ),
                                                                                    }));
                                                                                }
                                                                            }}
                                                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                        />
                                                                        <label
                                                                            htmlFor={`dept-${index}`}
                                                                            className="ml-3 text-sm text-gray-700 cursor-pointer"
                                                                        >
                                                                            {dept}
                                                                        </label>
                                                                    </div>
                                                                ))}

                                                                {/* No departments available */}
                                                                {availableDepartments.length === 0 && (
                                                                    <div className="p-3 text-center text-sm text-gray-500">
                                                                        No departments available
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Selected departments display */}
                                                <div className="mt-2">
                                                    <p className="text-xs font-medium text-gray-700 mb-1">
                                                        Selected Departments:
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {userForm.departments.length > 0 ? (
                                                            userForm.departments.map((dept, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                                >
                                                                    {dept}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setUserForm((prev) => ({
                                                                                ...prev,
                                                                                departments: prev.departments.filter(
                                                                                    (d) => d !== dept
                                                                                ),
                                                                            }));
                                                                        }}
                                                                        className="text-blue-600 hover:text-blue-800 focus:outline-none"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-500">
                                                                No departments selected
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="sm:col-span-2 lg:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    System Access
                                                </label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {SYSTEM_OPTIONS.map((option) => (
                                                        <label
                                                            key={option.value}
                                                            className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-gray-300"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedSystemAccess.includes(option.value)}
                                                                onChange={() =>
                                                                    toggleSystemAccessOption(option.value)
                                                                }
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <span>{option.label}</span>
                                                        </label>
                                                    ))}
                                                    {SYSTEM_OPTIONS.length === 0 && (
                                                        <p className="text-xs text-gray-500">
                                                            No system access options available
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="sm:col-span-2 lg:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Page Access
                                                </label>
                                                <div className={`rounded-lg border p-4 ${selectedSystemAccess.length > 0
                                                    ? "border-gray-200 bg-white"
                                                    : "border-gray-200 bg-gray-50"
                                                    }`}>
                                                    {availablePageAccessGroups.length > 0 ? (
                                                        <div className="space-y-4">
                                                            {availablePageAccessGroups.map((group) => (
                                                                <div key={group.systemLabel} className="space-y-2">
                                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">
                                                                        {group.systemLabel}
                                                                    </h4>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                                                        {group.pages.map((option) => (
                                                                            <label
                                                                                key={`${group.systemLabel}-${option.value}`}
                                                                                className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-gray-300"
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={selectedPageAccess.includes(option.value)}
                                                                                    onChange={() =>
                                                                                        togglePageAccessOption(option.value)
                                                                                    }
                                                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                                />
                                                                                <span>{option.label}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">
                                                            Select system access first to enable page access.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Verification Access */}
                                            <div className="sm:col-span-2 lg:col-span-1">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Verification Access
                                                </label>

                                                <select
                                                    value={verifyAccessValue}
                                                    onChange={async (e) => {
                                                        const value = e.target.value;
                                                        setVerifyAccessValue(value);

                                                        try {
                                                            await patchVerifyAccessApi({
                                                                id: currentUserId,
                                                                verify_access: value || null,
                                                            });

                                                            fetchSettingUserDetails();
                                                        } catch (error) {
                                                            console.error("Verify access update failed", error);
                                                            alert("Failed to update verify access");
                                                        }
                                                    }}
                                                    className="w-full bg-white border border-gray-300 rounded-md shadow-sm
               py-2 px-3 text-sm focus:outline-none
               focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Select</option>
                                                    <option value="hod">HOD</option>
                                                    <option value="manager">Manager</option>
                                                </select>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    This controls checklist verification visibility.
                                                </p>
                                            </div>

                                            {/* Verify Access Department */}
                                            <div className="sm:col-span-2 lg:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Verification Department Access
                                                </label>

                                                {/* Dropdown */}
                                                <select
                                                    onChange={(e) => {
                                                        handleAddVerifyDept(e.target.value);
                                                        e.target.value = "";
                                                    }}
                                                    className="w-full bg-white border border-gray-300 rounded-md shadow-sm
               py-2 px-3 text-sm focus:outline-none
               focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Add department access</option>
                                                    {availableDepartments
                                                        .filter(dept => !verifyAccessDepts.includes(dept))
                                                        .map(dept => (
                                                            <option key={dept} value={dept}>
                                                                {dept}
                                                            </option>
                                                        ))}
                                                </select>

                                                {/* Chips */}
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {verifyAccessDepts.length > 0 ? (
                                                        verifyAccessDepts.map((dept) => (
                                                            <span
                                                                key={dept}
                                                                className="inline-flex items-center gap-1 px-2 py-1
                     rounded-full text-xs font-medium
                     bg-blue-100 text-blue-800"
                                                            >
                                                                {dept}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveVerifyDept(dept)}
                                                                    className="text-blue-600 hover:text-blue-800"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-gray-500">
                                                            No department access assigned
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    Controls department-level verification visibility
                                                </p>
                                            </div>

                                            <div className="sm:col-span-2 lg:col-span-1">
                                                <label
                                                    htmlFor="status"
                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                >
                                                    Status
                                                </label>
                                                <select
                                                    id="status"
                                                    name="status"
                                                    value={userForm.status}
                                                    onChange={handleUserInputChange}
                                                    className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setIsUpdating(false); // Reset updating state when canceling
                                                    setShowUserModal(false);
                                                    resetUserForm();
                                                }}
                                                className="w-full sm:w-auto bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isUpdating}
                                                className="w-full sm:w-auto inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isUpdating ? (
                                                    <>
                                                        <RefreshCw
                                                            size={18}
                                                            className="mr-2 animate-spin"
                                                        />
                                                        {isEditing ? "Updating..." : "Creating..."}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={18} className="mr-2" />
                                                        {isEditing ? "Update User" : "Save User"}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Department Modal */}
                {showDeptModal && (
                    <div
                        className="fixed z-50 inset-y-0 right-0 left-0 xl:left-[240px] overflow-y-auto"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowDeptModal(false);
                            }
                        }}
                    >
                        <div className="flex items-center justify-center min-h-screen px-2 sm:px-4 py-4">
                            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                                <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-4 sm:px-6 py-4 flex justify-between items-center">
                                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                                        {currentDeptId
                                            ? "Edit Department"
                                            : "Create New Department"}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowDeptModal(false);
                                            resetDeptForm();
                                        }}
                                        className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded p-1"
                                        aria-label="Close"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="px-4 sm:px-6 py-4 bg-white">
                                    <form
                                        onSubmit={
                                            currentDeptId
                                                ? handleUpdateDepartment
                                                : handleAddDepartment
                                        }
                                        className="bg-white"
                                    >
                                        <div className="space-y-4 bg-white">
                                            <div>
                                                <label
                                                    htmlFor="name"
                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                >
                                                    Department Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    id="name"
                                                    value={deptForm.name}
                                                    onChange={handleDeptInputChange}
                                                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label
                                                    htmlFor="givenBy"
                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                >
                                                    Given By
                                                </label>
                                                <input
                                                    type="text"
                                                    id="givenBy"
                                                    name="givenBy"
                                                    value={deptForm.givenBy}
                                                    onChange={handleDeptInputChange}
                                                    className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Enter Given By"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    htmlFor="division"
                                                    className="block text-sm font-medium text-gray-700 mb-1"
                                                >
                                                    Division
                                                </label>
                                                <select
                                                    id="division"
                                                    name="division"
                                                    value={deptForm.division}
                                                    onChange={handleDeptInputChange}
                                                    className="w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">Select Division</option>
                                                    {divisionOptions.map((div) => (
                                                        <option key={div} value={div}>
                                                            {div}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setShowDeptModal(false);
                                                    resetDeptForm();
                                                }}
                                                className="w-full sm:w-auto bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="w-full sm:w-auto inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                <Save size={18} className="mr-2" />
                                                {currentDeptId
                                                    ? "Update Department"
                                                    : "Save Department"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default Setting;
