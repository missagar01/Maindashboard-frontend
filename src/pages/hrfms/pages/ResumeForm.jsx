import React, { useState } from 'react';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { createResume } from '../../../api/hrfms/resumeApi';
import { useAuth } from '../../../context/AuthContext';

const initialForm = {
    candidate_name: '',
    candidate_email: '',
    candidate_mobile: '',
    applied_for_designation: '',
    req_id: '',
    experience: '',
    previous_company: '',
    previous_salary: '',
    reason_for_changing: '',
    marital_status: '',
    reference: '',
    address_present: '',
    resume: '',
    interviewer_planned: '',
    interviewer_actual: '',
    interviewer_status: '',
};

const ResumeForm = () => {
    const { token, user } = useAuth();
    const defaultEmployeeCode = user?.employee_id || user?.employee_code || '';

    // Initialize with default employee code if available, but allow editing
    const [form, setForm] = useState(() => ({
        ...initialForm,
        req_id: defaultEmployeeCode,
    }));

    const [resumeFile, setResumeFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const formatFieldValue = (key, value) => {
        if (key === 'resume') {
            return undefined;
        }

        if (key.includes('interviewer_')) {
            if (!value) {
                return null;
            }
            const parsedDate = new Date(value);
            if (Number.isNaN(parsedDate.getTime())) {
                return null;
            }
            return parsedDate.toISOString();
        }

        if (value === '' || value === null) {
            return null;
        }

        return value;
    };

    const buildPayload = () => {
        console.log('📦 Frontend: Building payload (file required:', !!resumeFile, ')');
        const normalized = Object.entries(form).reduce((acc, [key, value]) => {
            const formatted = formatFieldValue(key, value);
            if (formatted !== undefined) {
                acc[key] = formatted;
            }
            return acc;
        }, {});

        if (!resumeFile) {
            return normalized;
        }

        const payload = new FormData();
        Object.entries(normalized).forEach(([key, value]) => {
            payload.append(key, value === null ? '' : value);
        });

        payload.append('resume', resumeFile);
        return payload;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!token) {
            toast.error('Please login again to submit resume.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = buildPayload();

            const response = await createResume(payload, token);

            if (!response?.success) {
                toast.error(response?.message || 'Failed to submit resume');
                return;
            }

            toast.success('Resume submitted successfully!');
            setForm({ ...initialForm, req_id: defaultEmployeeCode });
            setResumeFile(null);
        } catch (error) {
            console.error('❌ Frontend: POST Error:', error);
            toast.error(error?.message || 'Failed to submit resume');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
            <div className="mx-auto w-full max-w-none px-3 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-2xl bg-white shadow-xl">

                    {/* ✅ Card Header */}
                    <div className="border-b bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 sm:px-8 sm:py-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg sm:text-xl font-semibold text-white">MainPower</h3>
                                <p className="mt-1 text-sm text-indigo-100">
                                    Apply for job — fill your details carefully.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ✅ Card Body */}
                    <form onSubmit={handleSubmit} className="p-5 sm:p-8">
                        {/* ✅ 3 in one row (lg), 2 in one row (sm), 1 in mobile */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="req_id">
                                    Req ID
                                </label>
                                <input
                                    id="req_id"
                                    name="req_id"
                                    value={form.req_id}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    placeholder="S00001"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="candidate_name">
                                    Candidate Name
                                </label>
                                <input
                                    id="candidate_name"
                                    name="candidate_name"
                                    value={form.candidate_name}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    placeholder="Anita Verma"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="candidate_email">
                                    Candidate Email
                                </label>
                                <input
                                    id="candidate_email"
                                    name="candidate_email"
                                    type="email"
                                    value={form.candidate_email}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    placeholder="anita@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="candidate_mobile">
                                    Candidate Mobile
                                </label>
                                <input
                                    id="candidate_mobile"
                                    name="candidate_mobile"
                                    value={form.candidate_mobile}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    placeholder="9876543210"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="applied_for_designation">
                                    Applied For
                                </label>
                                <input
                                    id="applied_for_designation"
                                    name="applied_for_designation"
                                    value={form.applied_for_designation}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    placeholder="HR Executive"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="experience">
                                    Experience (Years)
                                </label>
                                <input
                                    id="experience"
                                    name="experience"
                                    type="text"
                                    step="0.1"
                                    min="0"
                                    value={form.experience}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    placeholder="2.5"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="previous_company">
                                    Previous Company
                                </label>
                                <input
                                    id="previous_company"
                                    name="previous_company"
                                    value={form.previous_company}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    placeholder="ABC Corp"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="previous_salary">
                                    Previous Salary
                                </label>
                                <input
                                    id="previous_salary"
                                    name="previous_salary"
                                    type="number"
                                    min="0"
                                    value={form.previous_salary}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    placeholder="350000"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="marital_status">
                                    Marital Status
                                </label>
                                <select
                                    id="marital_status"
                                    name="marital_status"
                                    value={form.marital_status}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                >
                                    <option value="">Select status</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Divorced">Divorced</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="reference">
                                    Reference
                                </label>
                                <input
                                    id="reference"
                                    name="reference"
                                    value={form.reference}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    placeholder="Suresh Kumar"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="address_present">
                                    Present Address
                                </label>
                                <input
                                    id="address_present"
                                    name="address_present"
                                    value={form.address_present}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"

                                    placeholder="Raipur, CG"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700" htmlFor="resume">
                                    Resume Upload
                                </label>
                                <input
                                    id="resume"
                                    name="resume"
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx"
                                    onChange={(event) => {
                                        const [file] = event.target.files || [];
                                        setResumeFile(file || null);
                                    }}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                />
                            </div>

                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className="text-sm font-medium text-gray-700" htmlFor="reason_for_changing">
                                    Reason for Changing
                                </label>
                                <textarea
                                    id="reason_for_changing"
                                    name="reason_for_changing"
                                    value={form.reason_for_changing}
                                    onChange={handleChange}
                                    rows={3}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    placeholder="Career growth"
                                />
                            </div>

                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                <Send size={16} className="mr-2" />
                                {submitting ? "Submitting..." : "Submit Resume"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

    );
};

export default ResumeForm;