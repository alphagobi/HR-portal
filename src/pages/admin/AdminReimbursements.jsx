import React, { useState, useEffect } from 'react';
import { getClaims, updateClaimStatus } from '../../services/reimbursementService';
import { CheckCircle, XCircle, DollarSign, FileText, Search, Filter, Download } from 'lucide-react';

const AdminReimbursements = () => {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        fetchClaims();
    }, []);

    const fetchClaims = async () => {
        const data = await getClaims();
        // Sort by pending first, then date
        const sorted = (data || []).sort((a, b) => {
            if (a.status === 'Pending' && b.status !== 'Pending') return -1;
            if (a.status !== 'Pending' && b.status === 'Pending') return 1;
            return new Date(b.date) - new Date(a.date);
        });
        setClaims(sorted);
        setLoading(false);
    };

    const handleStatusUpdate = async (id, status) => {
        setLoading(true);
        await updateClaimStatus(id, status);
        await fetchClaims();
        setLoading(false);
    };

    const filteredClaims = filter === 'All'
        ? claims
        : claims.filter(c => c.status === filter);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-700';
            case 'Rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-yellow-100 text-yellow-700';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reimbursement Approvals</h1>
                    <p className="text-gray-500">Review and process employee expense claims.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                        {['All', 'Pending', 'Approved', 'Rejected'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === f
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 font-medium text-gray-500">Employee</th>
                                <th className="p-4 font-medium text-gray-500">Category</th>
                                <th className="p-4 font-medium text-gray-500">Amount</th>
                                <th className="p-4 font-medium text-gray-500">Description</th>
                                <th className="p-4 font-medium text-gray-500">Date</th>
                                <th className="p-4 font-medium text-gray-500">Receipt</th>
                                <th className="p-4 font-medium text-gray-500">Status</th>
                                <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredClaims.map((claim) => (
                                <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {claim.employeeName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{claim.employeeName}</p>
                                                <p className="text-xs text-gray-500">ID: {claim.employeeId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-sm text-gray-900">{claim.category}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-medium text-gray-900">${Number(claim.amount).toFixed(2)}</span>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm text-gray-600 max-w-xs truncate" title={claim.description}>
                                            {claim.description}
                                        </p>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {claim.date}
                                    </td>
                                    <td className="p-4">
                                        <button className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-xs font-medium">
                                            <FileText size={14} />
                                            View
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                                            {claim.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {claim.status === 'Pending' && (
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleStatusUpdate(claim.id, 'Approved')}
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                    title="Approve"
                                                >
                                                    <CheckCircle size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(claim.id, 'Rejected')}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Reject"
                                                >
                                                    <XCircle size={20} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredClaims.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500">
                                        No reimbursement claims found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminReimbursements;
