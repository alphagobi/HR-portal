import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { getInvoices, createInvoice, updateInvoiceStatus } from '../../services/invoiceService';

const AdminInvoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        client_name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await getInvoices();
            setInvoices(data);
        } catch (error) {
            console.error("Error fetching invoices:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createInvoice(formData);
            setShowModal(false);
            setFormData({
                client_name: '',
                amount: '',
                date: new Date().toISOString().split('T')[0]
            });
            fetchData();
        } catch (error) {
            console.error("Error creating invoice:", error);
            alert("Failed to create invoice");
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await updateInvoiceStatus(id, newStatus);
            fetchData();
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Paid': return 'text-green-600 bg-green-50';
            case 'Pending': return 'text-yellow-600 bg-yellow-50';
            case 'Overdue': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                    <p className="text-gray-500">Manage client invoices and payments</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={20} />
                    New Invoice
                </button>
            </div>

            {/* Invoices List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 font-semibold text-gray-600">Client</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Date</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Amount</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading invoices...</td>
                                </tr>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No invoices found</td>
                                </tr>
                            ) : (
                                invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <FileText size={16} />
                                                </div>
                                                <span className="font-medium text-gray-900">{invoice.client_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(invoice.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-gray-900">
                                            ${parseFloat(invoice.amount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                                                {invoice.status === 'Paid' && <CheckCircle size={12} />}
                                                {invoice.status === 'Pending' && <Clock size={12} />}
                                                {invoice.status === 'Overdue' && <AlertCircle size={12} />}
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={invoice.status}
                                                onChange={(e) => handleStatusUpdate(invoice.id, e.target.value)}
                                                className="text-sm border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Paid">Paid</option>
                                                <option value="Overdue">Overdue</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Invoice</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.client_name}
                                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Create Invoice
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminInvoices;
