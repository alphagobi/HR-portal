import React, { useState, useEffect } from 'react';
import { getClaims, submitClaim } from '../services/reimbursementService';
import { DollarSign, FileText, Upload, CheckCircle, Clock, XCircle, Plus } from 'lucide-react';

const Reimbursements = () => {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newClaim, setNewClaim] = useState({ category: 'Travel', amount: '', description: '', date: '' });

    useEffect(() => {
        const fetchClaims = async () => {
            try {
                const data = await getClaims();
                setClaims(data);
            } catch (error) {
                console.error("Failed to fetch claims", error);
            } finally {
                setLoading(false);
            }
        };
        fetchClaims();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const user = JSON.parse(localStorage.getItem('hr_current_user'));
        if (!user) {
            alert("Please log in to submit a claim.");
            return;
        }

        const claim = {
            ...newClaim,
            employee_id: user.id,
            id: Date.now(),
            status: 'Pending',
            amount: parseFloat(newClaim.amount) || 0
        };
        setClaims([claim, ...claims]);

        try {
            await submitClaim(claim);
            setNewClaim({ category: 'Travel', amount: '', description: '', date: '' });
        } catch (error) {
            console.error("Failed to submit claim", error);
            alert("Failed to submit claim.");
        }
    };

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'approved': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'rejected': return 'text-red-600 bg-red-50 border-red-100';
            default: return 'text-amber-600 bg-amber-50 border-amber-100';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Reimbursements</h1>
                <p className="text-gray-500">Submit expense claims and track their status.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Submission Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Plus className="text-indigo-600" size={20} />
                            New Claim
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newClaim.category}
                                    onChange={(e) => setNewClaim({ ...newClaim, category: e.target.value })}
                                >
                                    <option>Travel</option>
                                    <option>Food</option>
                                    <option>Internet</option>
                                    <option>Office Supplies</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newClaim.date}
                                    onChange={(e) => setNewClaim({ ...newClaim, date: e.target.value })}
                                    max={new Date().toISOString().split('T')[0]}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newClaim.amount}
                                    onChange={(e) => setNewClaim({ ...newClaim, amount: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                    placeholder="Details about the expense..."
                                    value={newClaim.description}
                                    onChange={(e) => setNewClaim({ ...newClaim, description: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer">
                                <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                                <p className="text-sm text-gray-500">Click to upload receipt</p>
                                <p className="text-xs text-gray-400 mt-1">(JPG, PNG, PDF)</p>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                            >
                                Submit Claim
                            </button>
                        </form>
                    </div>
                </div>

                {/* Claims History */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900">Claim History</h2>
                            <div className="flex gap-2">
                                <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">Total Pending: $45.00</span>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {loading ? (
                                <div className="p-6 text-center text-gray-500">Loading claims...</div>
                            ) : (
                                claims.map((claim) => (
                                    <div key={claim.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                                                <DollarSign size={24} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-gray-900">{claim.category}</h3>
                                                    <span className="text-sm font-bold text-gray-900">${claim.amount}</span>
                                                </div>
                                                <p className="text-sm text-gray-500">{claim.date}</p>
                                                <p className="text-sm text-gray-600 mt-1">{claim.description}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
                                            {claim.status === 'Approved' && <CheckCircle size={14} />}
                                            {claim.status === 'Pending' && <Clock size={14} />}
                                            {claim.status === 'Rejected' && <XCircle size={14} />}
                                            {claim.status}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reimbursements;
