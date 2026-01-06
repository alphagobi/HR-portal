import React, { useState, useEffect } from 'react';
import { getClaims, updateClaimStatus } from '../../services/reimbursementService';
import { CheckCircle, XCircle, IndianRupee, FileText, Search, Filter, Download } from 'lucide-react';

const AdminReimbursements = () => {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    // View State
    const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'details'
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        fetchClaims();
    }, []);

    const fetchClaims = async () => {
        const data = await getClaims();
        setClaims(data || []);
        setLoading(false);
    };

    const handleStatusUpdate = async (id, status) => {
        setLoading(true);
        await updateClaimStatus(id, status);
        await fetchClaims();
        setLoading(false);
    };

    // --- Filtering Logic ---
    const filteredClaims = claims.filter(c => c.date.startsWith(selectedMonth));

    // --- Grouping Logic for Summary ---
    const employeeStats = filteredClaims.reduce((acc, claim) => {
        const empId = claim.employee_id;
        if (!acc[empId]) {
            acc[empId] = {
                id: empId,
                name: claim.employee_name || 'Unknown',
                pendingCount: 0,
                pendingAmount: 0,
                totalClaims: 0,
                claims: []
            };
        }
        acc[empId].claims.push(claim);
        acc[empId].totalClaims++;
        if (claim.status === 'Pending') {
            acc[empId].pendingCount++;
            acc[empId].pendingAmount += parseFloat(claim.amount);
        }
        return acc;
    }, {});

    const summaryList = Object.values(employeeStats);

    // --- Detail View Logic ---
    const currentEmployeeClaims = selectedEmployee
        ? filteredClaims.filter(c => c.employee_id === selectedEmployee.id)
        : [];

    // Sort details: Pending first, then date DESC
    currentEmployeeClaims.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return new Date(b.date) - new Date(a.date);
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-700';
            case 'Rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-yellow-100 text-yellow-700';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reimbursements</h1>
                    <p className="text-gray-500">
                        {viewMode === 'summary'
                            ? `Overview for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                            : `Claims for ${selectedEmployee?.name}`
                        }
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Monthly Filter */}
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                        <span className="text-sm font-medium text-gray-500">Period:</span>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="text-sm font-bold text-gray-900 border-none focus:ring-0 outline-none p-0 cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'summary' ? (
                // --- Summary View ---
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {summaryList.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100 border-dashed">
                            No claims found for this month.
                        </div>
                    ) : (
                        summaryList.map(emp => (
                            <div key={emp.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                            {emp.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{emp.name}</h3>
                                            <span className="text-xs text-gray-500">{emp.totalClaims} Claims Total</span>
                                        </div>
                                    </div>
                                    {emp.pendingCount > 0 && (
                                        <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">
                                            {emp.pendingCount} Pending
                                        </span>
                                    )}
                                </div>

                                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500 mb-1">Total Pending Amount</p>
                                    <div className="flex items-center text-2xl font-bold text-gray-900">
                                        <IndianRupee size={20} />
                                        {emp.pendingAmount.toFixed(2)}
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setSelectedEmployee(emp);
                                        setViewMode('details');
                                    }}
                                    className="w-full py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    View Details
                                </button>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                // --- Detailed View ---
                <div className="space-y-4">
                    <button
                        onClick={() => {
                            setViewMode('summary');
                            setSelectedEmployee(null);
                        }}
                        className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-2 font-medium"
                    >
                        &larr; Back to Summary
                    </button>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 font-medium text-gray-500">Date</th>
                                        <th className="p-4 font-medium text-gray-500">Category</th>
                                        <th className="p-4 font-medium text-gray-500">Description</th>
                                        <th className="p-4 font-medium text-gray-500">Amount</th>
                                        <th className="p-4 font-medium text-gray-500">Proof</th>
                                        <th className="p-4 font-medium text-gray-500">Status</th>
                                        <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {currentEmployeeClaims.map((claim) => (
                                        <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-sm text-gray-900 font-medium">{claim.date}</td>
                                            <td className="p-4 text-sm text-gray-700">{claim.category}</td>
                                            <td className="p-4">
                                                <p className="text-sm text-gray-600 max-w-xs truncate" title={claim.description}>
                                                    {claim.description}
                                                </p>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center text-gray-900 font-bold">
                                                    <IndianRupee size={16} />
                                                    <span>{Number(claim.amount).toFixed(2)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <button className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-xs font-medium">
                                                    <FileText size={14} /> View
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
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(claim.id, 'Rejected')}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReimbursements;
