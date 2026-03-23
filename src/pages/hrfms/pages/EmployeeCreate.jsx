import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Pencil, Trash2, UserPlus, X, ChevronDown, Calendar, MapPin, Plane, Ticket, Clock, Briefcase, User, Mail, Phone, Building, Briefcase as DesignationIcon, CheckCircle2, XCircle, Eye, ShieldCheck, FileText, ExternalLink, Download } from 'lucide-react';
import { createEmployee, deleteEmployee, getEmployees, updateEmployee } from '../../../api/hrfms/employeeApi';
import { getEmployeeFullDetails } from '../../../api/hrfms/dashboardApi';
import { useAuth } from '../../../context/AuthContext';
import { getFileNameFromUrl, isPdfFileUrl, resolveUploadedFileUrl } from '../../../utils/fileUrl';

const ImageWithFallback = ({ src, alt, className, onClick, fallbackIcon: FallbackIcon }) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (error || !src) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-gray-100 text-gray-300 gap-1`}>
        <FallbackIcon size={className.includes('h-32') || className.includes('h-24') ? 40 : 20} strokeWidth={1} />
        {error && src && <small className="text-[8px]">Error</small>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={() => setError(true)}
    />
  );
};

// Available routes for page access
const availableRoutes = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/my-profile', label: 'My Profile' },
  { path: '/resume-request', label: 'MainPower Request' },
  { path: '/requests', label: 'Travel Form' },
  { path: '/resumes', label: 'Resume' },
  { path: '/resume-form', label: 'Resume Upload' },
  { path: '/tickets', label: 'Tickets' },
  { path: '/travel-status', label: 'Travel Status' },
  { path: '/leave-request', label: 'Leave Request' },
  { path: '/plant-visitor', label: 'Plant Visitor' },
  { path: '/plant-visitorlist', label: 'Plant Visitor List' },
  { path: '/gatepass-apply', label: 'Gate Pass Apply' },
  { path: '/gatepass-list', label: 'Gate Pass List' },
  { path: '/leave-approvals', label: 'Leave Approvals' },
  { path: '/commercial-head-approval', label: 'Hod Approval' },
  { path: '/leave-hr-approvals', label: 'HR Approvals' },
  { path: '/resume-list', label: 'MainPower List' },
  { path: '/condidate-list', label: 'Interviwer List' },
  { path: '/condidate-select', label: 'Selected Condidate' },
  { path: '/employee-create', label: 'Employee' },
];

const initialForm = {
  employee_id: '',
  user_name: '',
  email_id: '',
  number: '',
  department: '',
  designation: '',
  role: 'user',
  status: 'Active',
  password: '',
  page_access: [],
  profile_img: null,
  document_img: [],
};

const EmployeeCreate = () => {
  const [form, setForm] = useState(initialForm);
  const [employees, setEmployees] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [originalPayload, setOriginalPayload] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [searchDepartment, setSearchDepartment] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [showPageAccessDropdown, setShowPageAccessDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [profileImgPreview, setProfileImgPreview] = useState(null);
  const [documentPreviews, setDocumentPreviews] = useState([]);
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const isAdmin = (user?.role || '').toLowerCase() === 'admin' || user?.Admin === 'Yes';
  const isEditing = Boolean(editingId);

  const getEmployeeId = (employee) => employee?.id ?? employee?._id ?? employee?.employee_id;

  const fetchEmployees = useCallback(async (isAutoSync = false) => {
    if (!token) {
      return;
    }

    if (!isAutoSync) {
      setTableLoading(true);
    }
    setTableError('');
    try {
      const response = await getEmployees(token);
      const data = response?.data ?? [];
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      setTableError(error?.message || 'Failed to load employees.');
    } finally {
      if (!isAutoSync) {
        setTableLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowPageAccessDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && showEditModal) {
        setShowEditModal(false);
        setEditingId(null);
        setForm(initialForm);
        setOriginalPayload(null);
      }
    };

    if (showEditModal) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showEditModal]);

  const handleChange = (event) => {
    const { name, value, files } = event.target;
    if (files && files.length > 0) {
      if (name === 'profile_img') {
        const file = files[0];
        setForm((prev) => ({ ...prev, [name]: file }));
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileImgPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else if (name === 'document_img') {
        const newFiles = Array.from(files);
        setForm((prev) => ({
          ...prev,
          [name]: [...(Array.isArray(prev.document_img) ? prev.document_img : []), ...newFiles]
        }));

        newFiles.forEach(file => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setDocumentPreviews(prev => [...prev, {
              url: reader.result,
              name: file.name,
              type: file.type,
              isNew: true
            }]);
          };
          reader.readAsDataURL(file);
        });
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const removeDocument_img = (index) => {
    const docToRemove = documentPreviews[index];
    setDocumentPreviews(prev => prev.filter((_, i) => i !== index));

    if (docToRemove.isNew) {
      setForm(prev => ({
        ...prev,
        document_img: prev.document_img.filter(f => f.name !== docToRemove.name)
      }));
    }
  };

  const handlePageAccessToggle = (routePath) => {
    setForm((prev) => {
      const currentAccess = Array.isArray(prev.page_access) ? prev.page_access : [];
      const isSelected = currentAccess.includes(routePath);

      const newPageAccess = isSelected
        ? currentAccess.filter(path => path !== routePath)
        : [...currentAccess, routePath];

      return { ...prev, page_access: newPageAccess };
    });
  };



  const normalizePageAccessInput = (value) => {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      // Handle both JSON string and comma-separated string
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // If JSON parsing fails, treat as comma-separated string
        return value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
    return [];
  };

  const buildPayload = () => {
    // Get current form page_access directly - don't normalize again as it's already normalized when set
    const currentPageAccess = form.page_access;
    const pageAccessArray = Array.isArray(currentPageAccess)
      ? currentPageAccess
      : normalizePageAccessInput(currentPageAccess);




    const payload = {
      employee_id: form.employee_id.trim(),
      user_name: form.user_name.trim(),
      email_id: form.email_id.trim(),
      number: form.number.trim(),
      department: form.department.trim(),
      designation: form.designation.trim(),
      role: form.role,
      status: form.status,
      password: form.password,
      page_access: pageAccessArray, // Always send as array
    };

    if (editingId && !payload.password) {
      delete payload.password;
    }

    return payload;
  };

  const hasPayloadChanged = (payload) => {
    if (!originalPayload) {
      return true;
    }

    const keysToCompare = [
      'employee_id',
      'user_name',
      'email_id',
      'number',
      'department',
      'designation',
      'role',
      'status',
      'password',
    ];

    for (const key of keysToCompare) {
      if ((payload[key] || '') !== (originalPayload[key] || '')) {
        return true;
      }
    }

    const arePageAccessEqual =
      (payload.page_access || []).length === (originalPayload.page_access || []).length &&
      payload.page_access.every((accessItem, index) => accessItem === (originalPayload.page_access || [])[index]);

    // Check if images have changed (new files uploaded)
    const profileImgChanged = form.profile_img instanceof File;
    const documentImgChanged = form.document_img instanceof File;

    return !arePageAccessEqual || profileImgChanged || documentImgChanged;
  };

  const handleRowClick = (employee) => {
    const employeeId = employee?.employee_id;
    if (!employeeId) {
      toast.error('Employee ID not found');
      return;
    }
    navigate(`/hrfms/employee-details/${employeeId}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      toast.error('Please login again before creating employees.');
      return;
    }

    if (!isAdmin) {
      toast.error('Only admin users can manage employees.');
      return;
    }

    setSubmitting(true);
    try {
      // Check for duplicate employee_code
      const codeToCheck = form.employee_id.trim().toLowerCase();
      if (codeToCheck) {
        const duplicateEmployee = employees.find(emp =>
          (emp?.employee_id ?? '').trim().toLowerCase() === codeToCheck
        );

        if (duplicateEmployee) {
          const isSelf = isEditing && getEmployeeId(duplicateEmployee) === editingId;
          if (!isSelf) {
            toast.error(`Employee ID "${form.employee_id}" already exists.`);
            setSubmitting(false);
            return;
          }
        }
      }

      // Get the latest form state directly to ensure we have the current page_access
      const currentFormState = { ...form };

      // Temporarily override form for buildPayload to use latest state
      const originalForm = form;
      const tempForm = { ...form, ...currentFormState };

      // Build payload with explicit page_access
      const pageAccessArray = Array.isArray(currentFormState.page_access)
        ? currentFormState.page_access
        : normalizePageAccessInput(currentFormState.page_access);

      // Check if we have image files to upload
      const hasNewImages = currentFormState.profile_img instanceof File || currentFormState.document_img instanceof File;

      let payload;
      if (hasNewImages) {
        // Use FormData for file uploads
        payload = new FormData();
        payload.append('employee_id', currentFormState.employee_id.trim());
        payload.append('user_name', currentFormState.user_name.trim());
        payload.append('email_id', currentFormState.email_id.trim());
        payload.append('number', currentFormState.number.trim());
        payload.append('department', currentFormState.department.trim());
        payload.append('designation', currentFormState.designation.trim());
        payload.append('role', currentFormState.role);
        payload.append('status', currentFormState.status);

        // Explicitly send the list of remaining existing documents
        const existingDocs = documentPreviews
          .filter(doc => !doc.isNew)
          .map(doc => doc.sourceUrl || doc.url);
        payload.append('existing_documents', JSON.stringify(existingDocs));
        payload.append('page_access', JSON.stringify(pageAccessArray));

        if (currentFormState.password) {
          payload.append('password', currentFormState.password);
        }

        // Only append files if they are File objects
        if (currentFormState.profile_img instanceof File) {
          payload.append('profile_img', currentFormState.profile_img);
        }

        if (currentFormState.document_img) {
          const docs = Array.isArray(currentFormState.document_img) ? currentFormState.document_img : [currentFormState.document_img];
          docs.forEach(doc => {
            if (doc instanceof File) {
              payload.append('document_img', doc);
            }
          });
        }
      } else {
        // Use regular JSON payload
        payload = {
          employee_id: currentFormState.employee_id.trim(),
          user_name: currentFormState.user_name.trim(),
          email_id: currentFormState.email_id.trim(),
          number: currentFormState.number.trim(),
          department: currentFormState.department.trim(),
          designation: currentFormState.designation.trim(),
          role: currentFormState.role,
          status: currentFormState.status,
          password: currentFormState.password,
          page_access: pageAccessArray,
          existing_documents: documentPreviews
            .filter(doc => !doc.isNew)
            .map(doc => doc.sourceUrl || doc.url),
        };

        if (editingId && !payload.password) {
          delete payload.password;
        }
      }



      if (isEditing && !hasNewImages && !hasPayloadChanged(payload)) {
        toast('No changes detected');
        setSubmitting(false);
        return;
      }

      const response = isEditing
        ? await updateEmployee(editingId, payload, token)
        : await createEmployee(payload, token);

      if (!response?.success) {
        toast.error(response?.message || 'Failed to create employee');
        return;
      }

      toast.success(isEditing ? 'Employee updated successfully' : 'Employee created successfully');
      setForm(initialForm);
      setProfileImgPreview(null);
      setDocumentPreviews([]);
      setEditingId(null);
      setShowForm(false);
      setShowEditModal(false);
      fetchEmployees();
      setOriginalPayload(null);
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error(error?.message || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (employee) => {
    const employeeId = getEmployeeId(employee);
    if (!employeeId) {
      toast.error('Employee ID not found.');
      return;
    }

    setEditingId(employeeId);
    const normalizedPageAccessValue = normalizePageAccessInput(employee?.page_access);

    const formValues = {
      employee_id: employee?.employee_id ?? '',
      user_name: employee?.user_name ?? '',
      email_id: employee?.email_id ?? '',
      number: employee?.number ?? '',
      department: employee?.department ?? '',
      designation: employee?.designation ?? '',
      page_access: normalizedPageAccessValue,
      role: employee?.role ?? 'user',
      status: employee?.status ?? 'Active',
      password: '',
      profile_img: employee?.profile_img || null,
      document_img: Array.isArray(employee?.document_img) ? employee.document_img : (employee?.document_img ? [employee.document_img] : []),
    };

    // Set preview images if they exist
    setProfileImgPreview(resolveUploadedFileUrl(employee?.profile_img) || null);

    if (employee?.document_img) {
      const docs = Array.isArray(employee.document_img) ? employee.document_img : [employee.document_img];
      setDocumentPreviews(docs.map(url => ({
        url: resolveUploadedFileUrl(url),
        sourceUrl: url,
        name: getFileNameFromUrl(url),
        type: isPdfFileUrl(url) ? 'application/pdf' : 'image/jpeg',
        isNew: false
      })));
    } else {
      setDocumentPreviews([]);
    }

    setOriginalPayload({
      employee_id: formValues.employee_id,
      user_name: formValues.user_name,
      email_id: formValues.email_id,
      number: formValues.number,
      department: formValues.department,
      designation: formValues.designation,
      role: formValues.role,
      status: formValues.status,
      password: '',
      page_access: [...normalizedPageAccessValue],
      profile_img: formValues.profile_img,
      document_img: formValues.document_img,
    });

    setForm(formValues);
    setShowEditModal(true);
  };

  const handleDelete = async (employee) => {
    const employeeId = getEmployeeId(employee);
    if (!employeeId) {
      toast.error('Employee ID not found.');
      return;
    }

    if (!window.confirm('Delete this employee?')) {
      return;
    }

    try {
      const response = await deleteEmployee(employeeId, token);
      if (!response?.success) {
        toast.error(response?.message || 'Failed to delete employee');
        return;
      }
      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (error) {
      toast.error(error?.message || 'Failed to delete employee');
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setProfileImgPreview(null);
    setDocumentPreviews([]);
    setEditingId(null);
    setOriginalPayload(null);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingId(null);
    setForm(initialForm);
    setProfileImgPreview(null);
    setDocumentPreviews([]);
    setOriginalPayload(null);
  };

  const filteredEmployees = useMemo(() => {
    const nameTerm = searchName.trim().toLowerCase();
    const deptTerm = searchDepartment.trim().toLowerCase();
    const codeTerm = searchCode.trim().toLowerCase();
    return employees.filter((employee) => {
      // Hide ADMIN user from the list
      if ((employee?.user_name || '').toUpperCase() === 'ADMIN') {
        return false;
      }
      if (nameTerm && !(employee?.user_name ?? '').toLowerCase().includes(nameTerm)) {
        return false;
      }
      if (deptTerm && !(employee?.department ?? '').toLowerCase().includes(deptTerm)) {
        return false;
      }
      if (codeTerm && !(employee?.employee_id ?? '').toLowerCase().includes(codeTerm)) {
        return false;
      }
      return true;
    });
  }, [employees, searchName, searchDepartment, searchCode]);

  const selectedPageAccess = Array.isArray(form.page_access) ? form.page_access : [];

  // Check for duplicate code in real-time
  const duplicateCodeWarning = useMemo(() => {
    if (!form.employee_id || !form.employee_id.trim()) return '';

    const codeToCheck = form.employee_id.trim().toLowerCase();
    const duplicate = employees.find(emp =>
      (emp?.employee_id ?? '').trim().toLowerCase() === codeToCheck
    );

    if (duplicate) {
      const isSelf = isEditing && getEmployeeId(duplicate) === editingId;
      if (!isSelf) {
        return 'Employee ID already exists!'; // Message as requested
      }
    }
    return '';
  }, [form.employee_code, employees, isEditing, editingId]);

  // Render form component (used in both inline and modal)
  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="employee_id">Employee ID</label>
          <input
            id="employee_id"
            name="employee_id"
            value={form.employee_id}
            onChange={handleChange}
            required
            readOnly={isEditing}
            className={`w-full rounded-lg border px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:outline-none focus:ring-2 ${duplicateCodeWarning
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
              } ${isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            placeholder="S01111"
          />
          {duplicateCodeWarning && (
            <p className="mt-1 text-xs text-red-600 font-medium animate-pulse">
              {duplicateCodeWarning}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="user_name">User Name</label>
          <input
            id="user_name"
            name="user_name"
            value={form.user_name}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Rupesh Sahu"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email_id">Email</label>
          <input
            id="email_id"
            name="email_id"
            type="email"
            required={false}
            value={form.email_id}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="rupesh@gmail.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="number">Mobile Number</label>
          <input
            id="number"
            name="number"
            value={form.number}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="81034dd174"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="department">Department</label>
          <input
            id="department"
            name="department"
            value={form.department}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="IT"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="designation">Designation</label>
          <input
            id="designation"
            name="designation"
            value={form.designation}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Developer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="role">Role</label>
          <select
            id="role"
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {!isEditing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required={!isEditing}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Enter password"
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="profile_img">Profile Image</label>
          <input
            id="profile_img"
            name="profile_img"
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          {profileImgPreview && (
            <div className="mt-2">
              <ImageWithFallback
                src={profileImgPreview}
                alt="Profile preview"
                className="h-24 w-24 rounded-lg object-cover border border-gray-300"
                fallbackIcon={User}
              />
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="document_img">Documents (Images/PDF)</label>
          <input
            id="document_img"
            name="document_img"
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          {documentPreviews.length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {documentPreviews.map((doc, index) => (
                <div key={index} className="relative group rounded-lg border border-gray-200 bg-gray-50 p-2 flex flex-col items-center gap-1">
                  {doc.type.includes('pdf') || isPdfFileUrl(doc.url) ? (
                    <div className="flex flex-col items-center gap-1 text-red-500">
                      <FileText size={32} />
                      <span className="text-[10px] text-gray-600 truncate max-w-[80px]">{doc.name}</span>
                    </div>
                  ) : (
                    <ImageWithFallback
                      src={doc.url}
                      alt={`Preview ${index}`}
                      className="h-16 w-16 rounded object-cover"
                      fallbackIcon={FileText}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeDocument_img(index)}
                    className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="page_access">Page Access</label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowPageAccessDropdown(!showPageAccessDropdown)}
              className="w-full flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
            >
              <span className="truncate">
                {selectedPageAccess.length > 0
                  ? `${selectedPageAccess.length} page(s) selected`
                  : 'Select pages...'}
              </span>
              <ChevronDown
                size={16}
                className={`ml-2 flex-shrink-0 transform transition-transform ${showPageAccessDropdown ? 'rotate-180' : ''}`}
              />
            </button>

            {showPageAccessDropdown && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-300 bg-white shadow-lg max-h-60 overflow-auto">
                <div className="p-2 space-y-1">
                  {availableRoutes.map((route) => {
                    const isSelected = selectedPageAccess.includes(route.path);
                    return (
                      <label
                        key={route.path}
                        className="flex items-center px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handlePageAccessToggle(route.path)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-700 flex-1">{route.label}</span>
                        <span className="ml-auto text-xs text-gray-500 hidden sm:inline">{route.path}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {selectedPageAccess.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedPageAccess.map((path) => {
                const route = availableRoutes.find(r => r.path === path);
                return (
                  <span
                    key={path}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 sm:px-3 py-1 text-xs font-medium text-indigo-800"
                  >
                    {route?.label || path}
                    <button
                      type="button"
                      onClick={() => handlePageAccessToggle(path)}
                      className="ml-1 text-indigo-600 hover:text-indigo-800"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end pt-4">
        {isEditing && (
          <button
            type="button"
            onClick={handleCloseModal}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400"
          >
            Cancel
          </button>
        )}
        {!isEditing && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400"
          >
            Reset
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 sm:px-6 py-2 sm:py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Saving...' : isEditing ? 'Update Employee' : 'Create Employee'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen py-4 sm:py-6 lg:py-10">
      <div className="w-full space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="rounded-2xl bg-white p-4 sm:p-6 lg:p-8 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-indigo-600">Employee</p>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1">Employee Management</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">Create, update, and manage employee access.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 sm:px-4 py-2 text-indigo-700">
              <UserPlus size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-xs sm:text-sm font-semibold">HR FMS</span>
            </div>
          </div>

          {!isAdmin && (
            <div className="mt-4 sm:mt-6 rounded-xl border border-amber-200 bg-amber-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-amber-700">
              This section is only available for admin users.
            </div>
          )}

          {isAdmin && (
            <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-indigo-50 px-3 sm:px-4 py-2 sm:py-3">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-indigo-700">Add employee</p>
                <p className="text-xs text-indigo-500">Use the button to open the form.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!showForm) {
                    handleReset();
                  }
                  setShowForm((prev) => !prev);
                }}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
              >
                {showForm ? 'Hide Form' : 'Add Employee'}
              </button>
            </div>
          )}
        </div>

        {/* Create Form (Inline) */}
        {isAdmin && showForm && !isEditing && (
          <div className="rounded-2xl bg-white p-4 sm:p-6 lg:p-8 shadow-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Create Employee</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Add a new employee to the system.</p>
              </div>
            </div>
            {renderForm()}
          </div>
        )}

        {/* Edit Modal */}
        {isAdmin && showEditModal && isEditing && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={handleCloseModal}
              ></div>

              {/* Modal */}
              <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Edit Employee</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Update employee information and access.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-lg p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 lg:p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {renderForm()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Employee List */}
        {isAdmin && (
          <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Employee List</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage all active employees from here.</p>
              </div>
            </div>

            {/* Search Filters */}
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="searchCode">Search code</label>
                <input
                  id="searchCode"
                  name="searchCode"
                  value={searchCode}
                  onChange={(event) => setSearchCode(event.target.value)}
                  placeholder="S01111"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="searchName">Search name</label>
                <input
                  id="searchName"
                  name="searchName"
                  value={searchName}
                  onChange={(event) => setSearchName(event.target.value)}
                  placeholder="Jane Doe"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="searchDepartment">Search department</label>
                <input
                  id="searchDepartment"
                  name="searchDepartment"
                  value={searchDepartment}
                  onChange={(event) => setSearchDepartment(event.target.value)}
                  placeholder="IT, HR, Finance"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            {/* Table */}
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200">
              <div className="max-h-[60vh] overflow-auto">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 sm:px-4 py-3">Code</th>
                        <th className="px-3 sm:px-4 py-3">Name</th>
                        <th className="hidden sm:table-cell px-4 py-3">Email</th>
                        <th className="hidden md:table-cell px-4 py-3">Mobile</th>
                        <th className="px-3 sm:px-4 py-3">Department</th>
                        <th className="hidden lg:table-cell px-4 py-3">Designation</th>
                        <th className="px-3 sm:px-4 py-3">Role</th>
                        <th className="px-3 sm:px-4 py-3">Status</th>
                        <th className="px-3 sm:px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tableLoading && (
                        <tr>
                          <td colSpan="9" className="px-4 py-8 text-center text-sm text-gray-500">
                            Loading employees...
                          </td>
                        </tr>
                      )}

                      {!tableLoading && tableError && (
                        <tr>
                          <td colSpan="9" className="px-4 py-8 text-center text-sm text-red-500">
                            {tableError}
                          </td>
                        </tr>
                      )}

                      {!tableLoading && !tableError && filteredEmployees.length === 0 && (
                        <tr>
                          <td colSpan="9" className="px-4 py-8 text-center text-sm text-gray-500">
                            No employees found for the selected filters.
                          </td>
                        </tr>
                      )}

                      {!tableLoading && !tableError && filteredEmployees.map((employee) => {
                        const employeeId = getEmployeeId(employee);
                        return (
                          <tr
                            key={employeeId ?? employee?.employee_id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleRowClick(employee)}
                          >
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">{employee?.employee_id || '-'}</td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium">{employee?.user_name || '-'}</td>
                            <td className="hidden sm:table-cell px-4 py-3 text-xs sm:text-sm">{employee?.email_id || '-'}</td>
                            <td className="hidden md:table-cell px-4 py-3 text-xs sm:text-sm">{employee?.number || '-'}</td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">{employee?.department || '-'}</td>
                            <td className="hidden lg:table-cell px-4 py-3 text-xs sm:text-sm">{employee?.designation || '-'}</td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">{employee?.role || '-'}</td>
                            <td className="px-3 sm:px-4 py-3">
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${employee?.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                {employee?.status || '-'}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-right">
                              <div className="flex justify-end gap-1 sm:gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRowClick(employee); }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 sm:px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  <Eye size={12} className="sm:w-[14px] sm:h-[14px]" />
                                  <span className="hidden sm:inline">Details</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2 sm:px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                                >
                                  <Pencil size={12} className="sm:w-[14px] sm:h-[14px]" />
                                  <span className="hidden sm:inline">Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(employee); }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 sm:px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={12} className="sm:w-[14px] sm:h-[14px]" />
                                  <span className="hidden sm:inline">Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {tableLoading && (
                <div className="py-8 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
                  Loading employees...
                </div>
              )}

              {!tableLoading && !tableError && filteredEmployees.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
                  No employees found.
                </div>
              )}

              {!tableLoading && filteredEmployees.map((employee) => {
                const employeeId = getEmployeeId(employee);
                return (
                  <div
                    key={employeeId ?? employee?.employee_id}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm active:bg-gray-50 transition-colors"
                    onClick={() => handleRowClick(employee)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                            {employee?.user_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{employee?.user_name || '-'}</h3>
                            <p className="text-xs text-indigo-600 font-medium">{employee?.employee_id || '-'}</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${employee?.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                          }`}>
                          {employee?.status || 'Active'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs border-t border-gray-50 pt-3">
                        <div>
                          <p className="text-gray-400 mb-0.5">Department</p>
                          <p className="font-medium text-gray-700 truncate">{employee?.department || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Designation</p>
                          <p className="font-medium text-gray-700 truncate">{employee?.designation || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Mobile</p>
                          <p className="font-medium text-gray-700">{employee?.number || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Role</p>
                          <p className="font-medium text-gray-700 capitalize">{employee?.role || '-'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-400 mb-0.5">Email</p>
                          <p className="font-medium text-gray-700 truncate">{employee?.email_id || '-'}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-gray-50">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRowClick(employee); }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <Eye size={14} />
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(employee); }}
                          className="inline-flex items-center justify-center rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default EmployeeCreate;
