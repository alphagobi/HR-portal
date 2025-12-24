import React, { useState, useEffect } from 'react';
import { getClaims, submitClaim } from '../services/reimbursementService';
import { IndianRupee, FileText, Upload, CheckCircle, Clock, XCircle, Plus } from 'lucide-react';

const Reimbursements = () => {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newClaim, setNewClaim] = useState({ category: 'Travel', amount: '', description: '', date: '' });
    const currentUser = JSON.parse(localStorage.getItem('hr_current_user'));

    useEffect(() => {
        const fetchClaims = async () => {
            try {
                if (currentUser?.id) {
                    const data = await getClaims(currentUser.id);
                    setClaims(data);
                }
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
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
                            <h2 className="text-lg font-bold text-gray-900">My Claim History</h2>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-medium px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                                    Total Pending: ₹{claims.filter(c => c.status === 'Pending').reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {loading ? (
                                <div className="p-6 text-center text-gray-500">Loading claims...</div>
                            ) : (

                                claims.map((claim) => (
                                    <div key={claim.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between items-start gap-4">
                                        <div className="flex items-start gap-4 w-full">
                                            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                                                <IndianRupee size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-gray-900 font-medium mb-1">{claim.description}</h3>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 uppercase tracking-wide text-[10px] font-bold">
                                                                {claim.category}
                                                            </span>
                                                            <span>•</span>
                                                            <span>{claim.date}</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-lg font-bold text-gray-900 ml-4 whitespace-nowrap">₹{claim.amount}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`shrink-0 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.status)} self-start sm:self-center`}>
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
