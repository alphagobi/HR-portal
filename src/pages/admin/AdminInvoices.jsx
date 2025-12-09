import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, CheckCircle, Clock, AlertCircle, Trash2, Download, AlertTriangle } from 'lucide-react';
import { getInvoices, createInvoice, updateInvoiceStatus, getClients } from '../../services/invoiceService';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AdminInvoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Initial State for Form
    const initialFormState = {
        client_id: '',
        client_name: '',
        client_address: '',
        billing_period_start: '',
        billing_period_end: '',
        items: [{ description: '', quantity: 1, duration: '1 Month', cost: 0 }],
        previous_balance: 0,
        payment_received: 0,
        payment_date: '',
        date: new Date().toISOString().split('T')[0]
    };

    const [formData, setFormData] = useState(initialFormState);
    const [calculations, setCalculations] = useState({
        current_invoice_total: 0,
        balance_credit: 0,
        grand_total: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    // Auto-calculate totals whenever relevant form data changes
    useEffect(() => {
        const currentTotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
        const prevBalance = parseFloat(formData.previous_balance) || 0;
        const payReceived = parseFloat(formData.payment_received) || 0;

        const balanceCredit = payReceived - prevBalance;
        const netPrevious = prevBalance - payReceived;
        const grandTotal = currentTotal + netPrevious;

        setCalculations({
            current_invoice_total: currentTotal,
            balance_credit: balanceCredit,
            grand_total: grandTotal
        });

    }, [formData.items, formData.previous_balance, formData.payment_received]);

    const fetchData = async () => {
        try {
            const [invoicesData, clientsData] = await Promise.all([
                getInvoices(),
                getClients()
            ]);
            setInvoices(invoicesData);
            setClients(clientsData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClientSelect = async (e) => {
        const clientId = e.target.value;
        const selectedClient = clients.find(c => c.id == clientId);

        if (selectedClient) {
            let prevBalance = 0;

            // Fetch detailed client info to get last invoice balance
            try {
                const clientDetails = await getClients(clientId);
                if (clientDetails.last_invoice) {
                    if (clientDetails.last_invoice.status !== 'Paid') {
                        prevBalance = parseFloat(clientDetails.last_invoice.grand_total || 0);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch client details for balance", err);
            }

            setFormData({
                ...formData,
                client_id: clientId,
                client_name: selectedClient.name,
                client_address: selectedClient.address || '',
                previous_balance: prevBalance
            });
        } else {
            setFormData({ ...formData, client_id: '', client_name: '', client_address: '', previous_balance: 0 });
        }
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: '', quantity: 1, duration: '1 Month', cost: 0 }]
        });
    };

    const handleRemoveItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                amount: calculations.current_invoice_total,
                grand_total: calculations.grand_total
            };
            await createInvoice(payload);
            setShowModal(false);
            setFormData(initialFormState);
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

    const generatePDF = (invoice) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.text("INVOICE", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.text("AlphaGobi", 14, 30);
        doc.text("123 Tech Park, Innovation Way", 14, 35);

        // Client Details
        doc.text(`To: ${invoice.client_name}`, 14, 50);
        if (invoice.client_address) {
            const splitAddress = doc.splitTextToSize(invoice.client_address, 80);
            doc.text(splitAddress, 14, 55);
        }

        doc.text(`Invoice Date: ${invoice.date}`, 140, 50);
        doc.text(`Billing Period: ${invoice.billing_period_start || 'N/A'} to ${invoice.billing_period_end || 'N/A'}`, 140, 55);

        // Resources Table
        const tableColumn = ["Description", "No. of Resources", "Duration", "Cost"];
        const tableRows = invoice.items
            ? invoice.items.map(item => [
                item.description || '',
                item.quantity || 1,
                item.duration || '',
                `$${parseFloat(item.cost || 0).toFixed(2)}`
            ])
            : [];

        doc.autoTable({
            startY: 70,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] }
        });

        const finalY = doc.lastAutoTable.finalY + 10;

        // Payment Summary
        doc.text("Payment Summary:", 14, finalY);

        const prevBal = parseFloat(invoice.previous_balance || 0);
        const payRec = parseFloat(invoice.payment_received || 0);
        const currentTotal = parseFloat(invoice.amount || 0);
        const grandTotal = parseFloat(invoice.grand_total || 0);

        const summaryData = [
            ["Previous Balance", `$${prevBal.toFixed(2)}`],
            [`Payment Received (${invoice.payment_date || '-'})`, `$${payRec.toFixed(2)}`],
            ["Current Invoice", `$${currentTotal.toFixed(2)}`],
            ["Grand Total Payable", `$${grandTotal.toFixed(2)}`]
        ];

        doc.autoTable({
            startY: finalY + 5,
            body: summaryData,
            theme: 'plain',
            columnStyles: {
                0: { cellWidth: 120, halign: 'right', fontStyle: 'bold' },
                1: { cellWidth: 60, halign: 'right' }
            }
        });

        doc.save(`Invoice_${invoice.client_name}_${invoice.date}.pdf`);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Paid': return 'text-green-600 bg-green-50';
            case 'Pending': return 'text-yellow-600 bg-yellow-50';
            case 'Partially Paid': return 'text-orange-600 bg-orange-50';
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
                                <th className="px-6 py-4 font-semibold text-gray-600">Overview</th>
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
                                                <div>
                                                    <div className="font-medium text-gray-900">{invoice.client_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(invoice.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <div className="flex justify-between w-40">
                                                    <span className="text-gray-500">Current:</span>
                                                    <span className="font-medium">${parseFloat(invoice.amount).toFixed(0)}</span>
                                                </div>
                                                <div className="flex justify-between w-40">
                                                    <span className="text-gray-500">Total:</span>
                                                    <span className="font-bold text-gray-900">${parseFloat(invoice.grand_total).toFixed(0)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={invoice.status}
                                                onChange={(e) => handleStatusUpdate(invoice.id, e.target.value)}
                                                className={`text-xs border-0 rounded-full px-3 py-1 font-medium ${getStatusColor(invoice.status)} focus:ring-0 cursor-pointer`}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Partially Paid">Partially Paid</option>
                                                <option value="Paid">Paid</option>
                                                <option value="Overdue">Overdue</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => generatePDF(invoice)}
                                                className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                title="Download PDF"
                                            >
                                                <Download size={18} />
                                            </button>
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
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Invoice</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Client & Date Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-700 border-b pb-2">Client Details</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Client</label>
                                        <select
                                            className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                            value={formData.client_id}
                                            onChange={handleClientSelect}
                                        >
                                            <option value="">Select a client...</option>
                                            {clients.map(client => (
                                                <option key={client.id} value={client.id}>{client.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Client Name (Override if needed)</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                            value={formData.client_name}
                                            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <textarea
                                            rows="3"
                                            className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                            value={formData.client_address}
                                            onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-700 border-b pb-2">Billing Details</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                                value={formData.billing_period_start}
                                                onChange={(e) => setFormData({ ...formData, billing_period_start: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                                value={formData.billing_period_end}
                                                onChange={(e) => setFormData({ ...formData, billing_period_end: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Line Items - Same as before */}
                            <div>
                                <div className="flex justify-between items-center mb-2 border-b pb-2">
                                    <h3 className="font-semibold text-gray-700">Resources Charges</h3>
                                    <button type="button" onClick={handleAddItem} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                                        + Add Item
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="flex gap-4 items-start bg-gray-50 p-3 rounded-lg">
                                            <div className="flex-1">
                                                <input
                                                    placeholder="Description"
                                                    className="w-full rounded border-gray-300 text-sm"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                />
                                            </div>
                                            <div className="w-20">
                                                <input
                                                    type="number"
                                                    placeholder="Qty"
                                                    className="w-full rounded border-gray-300 text-sm"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                />
                                            </div>
                                            <div className="w-24">
                                                <input
                                                    placeholder="Duration"
                                                    className="w-full rounded border-gray-300 text-sm"
                                                    value={item.duration}
                                                    onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                                                />
                                            </div>
                                            <div className="w-32">
                                                <input
                                                    type="number"
                                                    placeholder="Cost"
                                                    className="w-full rounded border-gray-300 text-sm"
                                                    value={item.cost}
                                                    onChange={(e) => handleItemChange(index, 'cost', e.target.value)}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                className="text-red-500 hover:text-red-700 mt-1"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="text-right font-semibold text-gray-800">
                                        Current Total: ${calculations.current_invoice_total.toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            {/* Payment Summary */}
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <h3 className="font-semibold text-indigo-900 mb-3 border-b border-indigo-200 pb-2">Payment Summary</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Previous Balance (Auto-filled)</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                            value={formData.previous_balance}
                                            onChange={(e) => setFormData({ ...formData, previous_balance: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Received</label>
                                            <input
                                                type="number"
                                                className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                                value={formData.payment_received}
                                                onChange={(e) => setFormData({ ...formData, payment_received: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                                value={formData.payment_date}
                                                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-col items-end gap-1">
                                    <div className="flex justify-between w-64 text-sm">
                                        <span className="text-gray-600">Previous Balance:</span>
                                        <span>${parseFloat(formData.previous_balance || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between w-64 text-sm">
                                        <span className="text-gray-600">Payment Received:</span>
                                        <span className="text-red-600">-${parseFloat(formData.payment_received || 0).toFixed(2)}</span>
                                    </div>
                                    {calculations.balance_credit > 0 && (
                                        <div className="flex justify-between w-64 text-sm font-medium text-green-700">
                                            <span>Credit Remaining:</span>
                                            <span>${calculations.balance_credit.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between w-64 text-lg font-bold text-gray-900 border-t border-gray-300 pt-2 mt-2">
                                        <span>Grand Total Payable:</span>
                                        <span>${calculations.grand_total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t">
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
                                    Generate Invoice
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
