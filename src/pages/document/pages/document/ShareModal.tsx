import React, { useState, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { authFetch, API_BASE_URL } from '@/api/document/apiClient';
import { toast } from 'react-hot-toast';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'whatsapp' | null;
    documentId: string | null;
    documentName: string;
    documentUrl?: string;
    documentType?: string;
    category?: string;
    companyName?: string;
    needsRenewal?: boolean;
    renewalDate?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, type, documentName, documentUrl, documentType, category, companyName, needsRenewal, renewalDate }) => {
    const [recipientName, setRecipientName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMessage(`Please find the attached document: ${documentName}`);
            setRecipientName('');
            setWhatsapp('');
        }
    }, [isOpen, documentName]);

    if (!isOpen || !type) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await authFetch(`${API_BASE_URL}/document-share/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: whatsapp,
                    documentName,
                    documentUrl: documentUrl || '',
                    documentType: documentType || '',
                    category: category || '',
                    companyName: companyName || '',
                    needsRenewal: needsRenewal ? 'Yes' : 'No',
                    renewalDate: renewalDate || '',
                    message,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.details || data.error || 'Failed to send message');
            }

            toast.success('Document shared via WhatsApp successfully!');
            onClose();
        } catch (error: any) {
            console.error('WhatsApp share error:', error);
            toast.error(error.message || 'Failed to share document');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <Send className="text-green-600" size={20} />
                        <h2 className="text-lg font-semibold text-gray-800">Share via WhatsApp</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Document Selection (Read Only) */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Document</label>
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700 font-medium flex items-center gap-2">
                             <span>📄</span>
                             {documentName} 
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient Name</label>
                        <input
                            type="text"
                            required
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                            placeholder="Enter recipient name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Number</label>
                         <div className="flex">
                            <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 bg-gray-50 rounded-l-lg text-gray-500 text-sm">
                                +91
                            </span>
                            <input
                                type="tel"
                                required
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value)}
                                className="flex-1 w-full px-3 py-2 border border-gray-200 rounded-r-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                placeholder="98765 43210"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                        <textarea
                            rows={3}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all resize-none"
                            placeholder="Add a message..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl bg-green-600 hover:bg-green-700 shadow-green-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Share via WhatsApp'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShareModal;
