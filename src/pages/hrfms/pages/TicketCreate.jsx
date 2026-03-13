import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAutoSync } from '../hooks/useAutoSync';
import { Ticket, UploadCloud, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createTicket } from '../../../api/hrfms/ticketApi';
import { getRequests, updateRequest } from '../../../api/hrfms/requestApi';
import { useAuth } from '../../../context/AuthContext';

const initialForm = {
  person_name: '',
  booked_name: '',
  bill_number: '',
  travels_name: '',
  type_of_bill: '',
  charges: '',
  per_ticket_amount: '',
  total_amount: '',
  status: '',
  request_employee_code: '',
  booked_employee_code: '',
  upload_bill_image: null,
};

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString();
};

const TicketCreate = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const defaultEmployeeCode = user?.employee_id || user?.employee_code || '';
  const defaultPersonName = user?.user_name || user?.employee_name || '';
  const isAllowed = true;

  const [form, setForm] = useState(() => ({
    ...initialForm,
    request_employee_code: defaultEmployeeCode,
    person_name: defaultPersonName,
    booked_name: defaultPersonName,
    booked_employee_code: defaultEmployeeCode,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const personNameValue = useMemo(
    () => form.person_name || defaultPersonName,
    [form.person_name, defaultPersonName]
  );
  const requestEmployeeCodeValue = useMemo(
    () => form.request_employee_code || defaultEmployeeCode,
    [form.request_employee_code, defaultEmployeeCode]
  );
  const bookedNameValue = useMemo(
    () => form.booked_name || defaultPersonName,
    [form.booked_name, defaultPersonName]
  );
  const bookedEmployeeCodeValue = useMemo(
    () => form.booked_employee_code || defaultEmployeeCode,
    [form.booked_employee_code, defaultEmployeeCode]
  );

  const handleChange = (event) => {
    if (event.target.readOnly) {
      return;
    }
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, upload_bill_image: file }));
  };

  const handleCreateTicket = () => {
    setSelectedRequestId('');
    setSelectedRequest(null);
    setForm({
      ...initialForm,
      request_employee_code: defaultEmployeeCode,
      person_name: defaultPersonName,
      booked_name: defaultPersonName,
      booked_employee_code: defaultEmployeeCode,
    });
    setShowModal(true);
  };

  const handleBookTicket = (request) => {
    if (!request) {
      return;
    }
    setSelectedRequestId(String(request.id));
    setSelectedRequest(request);
    setForm((prev) => ({
      ...prev,
      person_name: request.person_name || prev.person_name,
      request_employee_code: request.employee_code || prev.request_employee_code,
      status: prev.status,
    }));
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      toast.error('Please login again to submit ticket.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('person_name', personNameValue);
      payload.append('booked_name', bookedNameValue);
      payload.append('bill_number', form.bill_number);
      payload.append('travels_name', form.travels_name);
      payload.append('type_of_bill', form.type_of_bill);
      payload.append('charges', form.charges);
      payload.append('per_ticket_amount', form.per_ticket_amount);
      payload.append('total_amount', form.total_amount);
      payload.append('status', form.status);
      payload.append('request_employee_code', requestEmployeeCodeValue);
      payload.append('booked_employee_code', bookedEmployeeCodeValue);
      if (form.upload_bill_image) {
        payload.append('upload_bill_image', form.upload_bill_image);
      }

      const response = await createTicket(payload, token);
      if (!response?.success) {
        toast.error(response?.message || 'Failed to create ticket');
        return;
      }

      if (selectedRequestId) {
        try {
          const updateResponse = await updateRequest(
            selectedRequestId,
            { request_status: form.status },
            token
          );
          if (!updateResponse?.success) {
            toast.error(updateResponse?.message || 'Failed to update request status');
          } else {
            await loadRequests();
          }
        } catch (updateError) {
          toast.error(updateError?.message || 'Failed to update request status');
        }
      }

      toast.success('Ticket created successfully!');
      setForm({
        ...initialForm,
        request_employee_code: defaultEmployeeCode,
        person_name: defaultPersonName,
        booked_name: defaultPersonName,
        booked_employee_code: defaultEmployeeCode,
      });
      setSelectedRequestId('');
      setSelectedRequest(null);
      setShowModal(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const loadRequests = useCallback(async (isAutoSync = false) => {
    if (!token) {
      return;
    }

    if (!isAutoSync) {
      setLoadingRequests(true);
    }
    try {
      const response = await getRequests(token);
      const data = response?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      const filtered = list.filter((item) => {
        const status = String(item?.request_status || '').toLowerCase();
        return status !== 'booked' && status !== 'cancel';
      });
      setRequests(filtered);
    } catch (error) {
      toast.error(error?.message || 'Failed to load requests');
    } finally {
      if (!isAutoSync) {
        setLoadingRequests(false);
      }
    }
  }, [token]);

  useAutoSync(loadRequests, 10000);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!defaultEmployeeCode) {
      navigate('/hrfms/dashboard', { replace: true });
    }
  }, [defaultEmployeeCode, navigate]);

  useEffect(() => {
    if (!showModal) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showModal]);

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-8">
      <div className="space-y-4 px-3 pb-10 sm:space-y-6 sm:px-6 lg:px-10">
        <div className="mb-5 rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 p-5 shadow-2xl ring-1 ring-white/30 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Tickets</p>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">Create Ticket Bill</h1>
              <p className="mt-1 text-sm text-indigo-100">Upload bill details and booking information.</p>
            </div>
            <div className="flex items-center gap-3">

              <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-white">
                <Ticket size={18} />
                <span className="text-sm font-semibold">HR FMS</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xl sm:p-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Travel Requests</h2>
              <p className="text-sm text-gray-500">
                Cards are shown on mobile. Full table is available on larger screens.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateTicket}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 hover:shadow-lg sm:w-auto"
            >
              <Plus size={18} />
              <span>Create Ticket</span>
            </button>
          </div>
          {loadingRequests ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              No requests found.
            </div>
          ) : (
            <>
              <div className="space-y-4 md:hidden">
                {requests.map((item) => (
                  <article
                    key={item.id}
                    className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                          Request No
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-gray-900">
                          {item.request_no || `Request ${item.id}`}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {item.person_name || '-'}
                        </p>
                      </div>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                        {item.type_of_travel || 'Travel'}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          From City
                        </p>
                        <p className="mt-1 text-sm text-gray-900">{item.from_city || '-'}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          To City
                        </p>
                        <p className="mt-1 text-sm text-gray-900">{item.to_city || '-'}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          From Date
                        </p>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(item.from_date)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          To Date
                        </p>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(item.to_date)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Departure
                        </p>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(item.departure_date)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          No. of Persons
                        </p>
                        <p className="mt-1 text-sm text-gray-900">{item.no_of_person || '-'}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBookTicket(item)}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                      Book Ticket
                    </button>
                  </article>
                ))}
              </div>

              <div className="hidden w-full overflow-x-auto md:block">
                <table className="w-full min-w-[1200px] divide-y divide-gray-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Request No</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Person Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Travel Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">From City</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">To City</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">From Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">To Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Departure Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">No. of Persons</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {requests.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleBookTicket(item)}
                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Book Ticket
                          </button>
                        </td>
                        <td className="px-4 py-3">{item.request_no || `Request ${item.id}`}</td>
                        <td className="px-4 py-3">{item.person_name || '-'}</td>
                        <td className="px-4 py-3">{item.type_of_travel || '-'}</td>
                        <td className="px-4 py-3">{item.from_city || '-'}</td>
                        <td className="px-4 py-3">{item.to_city || '-'}</td>
                        <td className="px-4 py-3">{formatDate(item.from_date)}</td>
                        <td className="px-4 py-3">{formatDate(item.to_date)}</td>
                        <td className="px-4 py-3">{formatDate(item.departure_date)}</td>
                        <td className="px-4 py-3">{item.no_of_person || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-40 bg-black/50 p-0 sm:p-4">
            <div className="flex h-full w-full items-end justify-center sm:items-center">
              <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-5">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                      {selectedRequestId ? 'Book Ticket' : 'Create Ticket'}
                    </h2>
                    <p className="text-xs text-gray-500 sm:text-sm">
                      {selectedRequest?.request_no || 'Create a new ticket bill'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-md px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                  <form onSubmit={handleSubmit} className="space-y-6" aria-disabled={!isAllowed}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700" htmlFor="person_name">Person Name</label>
                        <input
                          id="person_name"
                          name="person_name"
                          value={personNameValue}
                          onChange={handleChange}
                          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          placeholder="Rupesh Sahu"
                          required
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700" htmlFor="request_employee_code">Request Employee Code</label>
                        <input
                          id="request_employee_code"
                          name="request_employee_code"
                          value={requestEmployeeCodeValue}
                          onChange={handleChange}
                          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          placeholder="S01111"
                          required
                          readOnly
                        />
                      </div>


                      <div>
                        <label className="text-sm font-medium text-gray-700" htmlFor="bill_number">Bill Number</label>
                        <input
                          id="bill_number"
                          name="bill_number"
                          value={form.bill_number}
                          onChange={handleChange}
                          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          placeholder="BILL001"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700" htmlFor="travels_name">Travels Name</label>
                        <input
                          id="travels_name"
                          name="travels_name"
                          value={form.travels_name}
                          onChange={handleChange}
                          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          placeholder="Bus Travels"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700" htmlFor="type_of_bill">Type of Bill</label>
                        <select
                          id="type_of_bill"
                          name="type_of_bill"
                          value={form.type_of_bill}
                          onChange={handleChange}
                          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          required
                        >
                          <option value="" disabled>Select type</option>
                          <option value="Invoice">Invoice</option>
                          <option value="Receipt">Receipt</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700" htmlFor="charges">Charges</label>
                        <input
                          id="charges"
                          name="charges"
                          type="number"
                          min="0"
                          value={form.charges}
                          onChange={handleChange}
                          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          placeholder="1000"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700" htmlFor="per_ticket_amount">Per Ticket Amount</label>
                        <input
                          id="per_ticket_amount"
                          name="per_ticket_amount"
                          type="number"
                          min="0"
                          value={form.per_ticket_amount}
                          onChange={handleChange}
                          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          placeholder="500"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700" htmlFor="total_amount">Total Amount</label>
                        <input
                          id="total_amount"
                          name="total_amount"
                          type="number"
                          min="0"
                          value={form.total_amount}
                          onChange={handleChange}
                          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          placeholder="1000"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700" htmlFor="status">Status</label>
                        <select
                          id="status"
                          name="status"
                          value={form.status}
                          onChange={handleChange}
                          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          required
                        >
                          <option value="" disabled>Select status</option>
                          <option value="Booked">Booked</option>
                          <option value="Cancel">Cancel</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700" htmlFor="upload_bill_image">Upload Bill Image</label>
                        <div className="mt-2 flex items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
                          <UploadCloud size={18} className="text-indigo-500" />
                          <input
                            id="upload_bill_image"
                            name="upload_bill_image"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                            className="w-full text-sm text-gray-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="w-full rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                      >
                        {submitting ? 'Submitting...' : 'Submit Ticket'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketCreate;
