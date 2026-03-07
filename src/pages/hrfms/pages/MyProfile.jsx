import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAutoSync } from '../hooks/useAutoSync';
import { Building, Edit3, Mail, Phone, Save, User, X, Hash, Shield, Briefcase, CheckCircle2, Camera, FileText, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { getEmployeeById, updateEmployee } from '../../../api/hrfms/employeeApi';
import { useAuth } from '../../../context/AuthContext';

const ImageWithFallback = ({ src, alt, className, onClick, fallbackIcon: FallbackIcon }) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (error || !src) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-gray-100 text-gray-300 gap-2`}>
        <FallbackIcon size={40} strokeWidth={1} />
        {error && src && <small className="text-[10px]">Load Error</small>}
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

const MyProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuth();

  const [selectedProfileImg, setSelectedProfileImg] = useState(null);
  const [previewProfileImg, setPreviewProfileImg] = useState(null);
  const [previewDocuments, setPreviewDocuments] = useState([]);

  const profileInputRef = useRef(null);
  const documentInputRef = useRef(null);

  const fetchProfile = useCallback(async (isAutoSync = false) => {
    try {
      if (!token || !user?.id) return;

      if (!isAutoSync) setLoading(true);
      const response = await getEmployeeById(user.id, token);
      const profile = response?.data;
      if (!profile) {
        throw new Error('No profile data found');
      }

      setProfileData(profile);
      // Only update formData if not currently editing to avoid overwriting user input
      if (!isEditing) {
        setFormData(profile);
      }

      // Set initial previews only if not in editing mode or if it's the first load
      if (profile.profile_img && (!isEditing || !previewProfileImg)) {
        setPreviewProfileImg(profile.profile_img);
      }
      if (profile.document_img && (!isEditing || previewDocuments.length === 0)) {
        const docs = Array.isArray(profile.document_img) ? profile.document_img : [profile.document_img];
        setPreviewDocuments(docs.map(url => ({
          url,
          name: url.split('/').pop(),
          type: url.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          isExisting: true
        })));
      }

    } catch (error) {
      console.error('Error fetching profile data:', error);
      if (!isAutoSync) toast.error(`Failed to load profile data: ${error.message}`);
    } finally {
      if (!isAutoSync) setLoading(false);
    }
  }, [user?.id, token, isEditing, previewProfileImg, previewDocuments.length]);

  useAutoSync(fetchProfile, 30000, !isEditing);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      setSelectedProfileImg(file);
      setPreviewProfileImg(URL.createObjectURL(file));
    }
  };

  const handleDocumentChange = (e) => {
    const files = Array.from(e.target.files);

    if (previewDocuments.length + files.length > 10) {
      toast.error('You can upload a maximum of 10 documents.');
      return;
    }

    if (files.length > 0) {
      const newPreviews = [];

      files.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (>5MB)`);
          return;
        }
        newPreviews.push({
          url: URL.createObjectURL(file),
          name: file.name,
          type: file.type,
          isExisting: false,
          file: file
        });
      });

      setPreviewDocuments(prev => [...prev, ...newPreviews]);
    }
  };

  const removeDocument = (index) => {
    setPreviewDocuments(prev => {
      const doc = prev[index];
      if (doc && !doc.isExisting && doc.url.startsWith('blob:')) {
        URL.revokeObjectURL(doc.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (!token || !profileData?.id) {
        throw new Error('Please login to update your profile');
      }

      // Create FormData to handle file uploads
      const submitData = new FormData();

      // Append basic fields
      submitData.append('email_id', formData.email_id || '');
      submitData.append('number', formData.number || '');
      // Include other fields needed for update, even if readonly, if the API expects them
      // Or better, only include what changes. But based on previous code it was sending everything.
      // Let's send the text fields that are editable + required ones.
      // The backend service seems to merge so we might just send what we have.

      // Append files if selected
      if (selectedProfileImg) {
        submitData.append('profile_img', selectedProfileImg);
      }

      // Append new files from previewDocuments
      const newFiles = previewDocuments
        .filter(doc => !doc.isExisting)
        .map(doc => doc.file);

      if (newFiles.length > 0) {
        newFiles.forEach(file => {
          submitData.append('document_img', file);
        });
      }

      // Explicitly send the list of remaining existing documents
      const existingDocs = previewDocuments
        .filter(doc => doc.isExisting)
        .map(doc => doc.url);
      submitData.append('existing_documents', JSON.stringify(existingDocs));

      // If we removed existing documents, we'd need to tell the backend.
      // But for now, let's just send the new files.
      // Note: The backend as currently written REPLACES document_img if any new files are sent.
      // If no new files are sent, it keeps existing ones because of COALESCE.
      // This might not be perfect for "deleting" some but keeping others.
      // For a "My Profile" page, replacing all is often acceptable when editing.

      const response = await updateEmployee(profileData.id, submitData, token);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to update profile');
      }

      const updatedProfile = response?.data || formData; // Fallback
      setProfileData(updatedProfile);
      setFormData(updatedProfile);

      // Update previews/state
      if (updatedProfile.profile_img) setPreviewProfileImg(updatedProfile.profile_img);

      if (updatedProfile.document_img) {
        const docs = Array.isArray(updatedProfile.document_img) ? updatedProfile.document_img : [updatedProfile.document_img];
        setPreviewDocuments(docs.map(url => ({
          url,
          name: url.split('/').pop(),
          type: url.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          isExisting: true
        })));
      }

      setSelectedProfileImg(null);

      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(profileData || {});
    setPreviewProfileImg(profileData?.profile_img || null);

    // Clean up blob URLs
    previewDocuments.forEach(doc => {
      if (doc && !doc.isExisting && doc.url.startsWith('blob:')) {
        URL.revokeObjectURL(doc.url);
      }
    });

    if (profileData?.document_img) {
      const docs = Array.isArray(profileData.document_img) ? profileData.document_img : [profileData.document_img];
      setPreviewDocuments(docs.map(url => ({
        url,
        name: url.split('/').pop(),
        type: url.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        isExisting: true
      })));
    } else {
      setPreviewDocuments([]);
    }

    setSelectedProfileImg(null);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Loading profile data...</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 max-w-md">
            <p className="text-red-700 font-medium">No profile data available</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = (profileData?.role || '').toLowerCase() === 'admin' || profileData?.Admin === 'Yes';
  const statusColor = profileData?.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full space-y-4 sm:space-y-6">
        {/* Header Section - Responsive */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 p-4 sm:p-6 lg:p-8 shadow-2xl border border-white/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-white/80 mb-1 sm:mb-2">Profile</p>
              <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white">My Profile</h1>
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-indigo-100">View and manage your personal information</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold text-indigo-600 shadow-lg transition hover:bg-indigo-50 hover:shadow-xl"
                >
                  <Edit3 size={18} />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700 hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <Save size={18} />
                    <span className="hidden sm:inline">Save Changes</span>
                    <span className="sm:hidden">Save</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/20 px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-white/30"
                  >
                    <X size={18} />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid - Fully Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Profile Card - Left Side */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-white p-4 sm:p-6 lg:p-8 shadow-xl border border-gray-100">
              <div className="text-center">
                <div className="relative mx-auto h-24 w-24 sm:h-32 sm:w-32 mb-4 sm:mb-6">
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg overflow-hidden">
                    <ImageWithFallback
                      src={previewProfileImg}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      fallbackIcon={User}
                    />
                  </div>

                  {isEditing && (
                    <>
                      <button
                        onClick={() => profileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white shadow-lg hover:bg-indigo-700 transition-colors z-10"
                        title="Upload Profile Picture"
                      >
                        <Camera size={16} />
                      </button>
                      <input
                        type="file"
                        ref={profileInputRef}
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">{profileData.user_name || '-'}</h2>
                <p className="text-sm sm:text-base text-gray-600 mb-3">{profileData.designation || 'Not specified'}</p>
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 sm:px-4 py-1.5 sm:py-2 mb-4">
                  <Hash size={14} className="text-indigo-600 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-semibold text-indigo-700">{profileData.employee_id || '-'}</span>
                </div>
                <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
                      {isAdmin && <Shield size={12} className="mr-1" />}
                      {profileData?.status || 'Active'}
                    </span>
                  </div>
                  {isAdmin && (
                    <p className="text-xs text-gray-500">Administrator Access</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Information Cards - Right Side */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Personal Information Card */}
            <div className="rounded-2xl bg-white p-4 sm:p-6 lg:p-8 shadow-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <User size={18} className="text-indigo-600 sm:w-5 sm:h-5" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
                    <Mail size={14} className="text-indigo-600 sm:w-4 sm:h-4" />
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email_id"
                      value={formData.email_id || ''}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                      placeholder="your.email@example.com"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-800 font-medium break-words">{profileData.email_id || '-'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
                    <Phone size={14} className="text-indigo-600 sm:w-4 sm:h-4" />
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="number"
                      value={formData.number || ''}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                      placeholder="+91 1234567890"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-800 font-medium">{profileData.number || '-'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
                    <Building size={14} className="text-indigo-600 sm:w-4 sm:h-4" />
                    Department
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="department"
                      value={formData.department || ''}
                      readOnly
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-600 cursor-not-allowed"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-800 font-medium">{profileData.department || '-'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
                    <Briefcase size={14} className="text-indigo-600 sm:w-4 sm:h-4" />
                    Designation
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation || ''}
                      readOnly
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-600 cursor-not-allowed"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-800 font-medium">{profileData.designation || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information Card */}
            <div className="rounded-2xl bg-white p-4 sm:p-6 lg:p-8 shadow-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Briefcase size={18} className="text-purple-600 sm:w-5 sm:h-5" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Additional Details</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
                    <Hash size={14} className="text-purple-600 sm:w-4 sm:h-4" />
                    Employee Code
                  </label>
                  <p className="text-sm sm:text-base text-gray-800 font-medium">{profileData.employee_id || '-'}</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
                    <Shield size={14} className="text-purple-600 sm:w-4 sm:h-4" />
                    Role
                  </label>
                  <p className="text-sm sm:text-base text-gray-800 font-medium capitalize">{profileData.role || 'Employee'}</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
                    <CheckCircle2 size={14} className="text-purple-600 sm:w-4 sm:h-4" />
                    Status
                  </label>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
                    {profileData?.status || 'Active'}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
                    <Building size={14} className="text-purple-600 sm:w-4 sm:h-4" />
                    Department
                  </label>
                  <p className="text-sm sm:text-base text-gray-800 font-medium">{profileData.department || 'Not assigned'}</p>
                </div>
              </div>
            </div>
            {/* Document Upload Section */}
            <div className="rounded-2xl bg-white p-4 sm:p-6 lg:p-8 shadow-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <FileText size={18} className="text-emerald-600 sm:w-5 sm:h-5" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Documents</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aadhar Card / Identity Document
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {previewDocuments.map((doc, index) => (
                        <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-2 min-h-[160px]">
                          {doc.type.includes('pdf') || doc.url.toLowerCase().endsWith('.pdf') ? (
                            <div className="flex flex-col items-center justify-center text-red-500 gap-2">
                              <FileText size={48} />
                              <span className="text-xs text-gray-600 font-medium truncate max-w-[150px]">{doc.name}</span>
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors"
                              >
                                View PDF
                              </a>
                            </div>
                          ) : (
                            <div className="w-full h-32 flex items-center justify-center overflow-hidden rounded-md bg-white">
                              <ImageWithFallback
                                src={doc.url}
                                alt={`Document ${index + 1}`}
                                className="max-h-full max-w-full object-contain cursor-pointer"
                                onClick={() => window.open(doc.url, '_blank')}
                                fallbackIcon={FileText}
                              />
                            </div>
                          )}

                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => removeDocument(index)}
                              className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 rounded-full shadow-md hover:bg-red-200 transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove Document"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}

                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => documentInputRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 hover:border-indigo-400 hover:bg-indigo-50 transition-all min-h-[160px]"
                        >
                          <Upload className="text-gray-400" size={32} />
                          <span className="text-xs font-medium text-gray-500">Upload More</span>
                        </button>
                      )}
                    </div>

                    {previewDocuments.length === 0 && !isEditing && (
                      <div className="w-full max-w-xs h-40 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
                        <FileText size={32} />
                        <span className="text-xs mt-2">No document uploaded</span>
                      </div>
                    )}

                    {isEditing && (
                      <div className="mt-3">
                        <input
                          type="file"
                          ref={documentInputRef}
                          multiple
                          accept="image/*,.pdf"
                          onChange={handleDocumentChange}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
