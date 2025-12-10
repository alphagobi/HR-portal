import React, { useEffect, useState } from 'react';
import { getPolicies, acknowledgePolicy } from '../services/policyService';
import { FileText, CheckCircle, X, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const Policies = () => {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const currentUser = JSON.parse(localStorage.getItem('hr_current_user'));
        setUser(currentUser);
        if (currentUser) {
            fetchPolicies(currentUser.id);
        }
    }, []);

    const fetchPolicies = async (userId) => {
        try {
            const data = await getPolicies(userId);
            setPolicies(data);
        } catch (error) {
            console.error("Failed to fetch policies", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = async () => {
        if (!selectedPolicy || !user) return;

        try {
            await acknowledgePolicy(user.id, selectedPolicy.id);
            // Refresh policies to update status
            await fetchPolicies(user.id);
            setSelectedPolicy(null);
            alert("Policy acknowledged successfully.");
        } catch (error) {
            alert("Failed to acknowledge policy.");
        }
    };

    const filteredPolicies = policies.filter(policy =>
        policy.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status) => {
        switch (status) {
            case 'New': return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200">New</span>;
            case 'Pending': return <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">Pending</span>;
            case 'Mandatory': return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">Mandatory</span>;
            case 'Updated': return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">Updated</span>;
            default: return null;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Company Policies</h1>
                <p className="text-gray-500">Review and acknowledge mandatory company policies.</p>
            </div>

            {/* Search */}
            <div className="mb-8 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search policies..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Policy List */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading policies...</div>
            ) : (
                <div className="space-y-4">
                    {filteredPolicies.map((policy) => (
                        <div
                            key={policy.id}
                            onClick={() => setSelectedPolicy(policy)}
                            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg text-gray-400">
                                    <FileText size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900 text-lg">{policy.title}</h3>
                                        {/* Status Badge - Disappears when acknowledged */}
                                        {policy.is_acknowledged != 1 && getStatusBadge(policy.status)}
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Last Updated: {new Date(policy.updated_at).toLocaleDateString()} • Version {policy.version}
                                    </p>
                                </div>
                            </div>

                            {policy.is_acknowledged == 1 ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-medium">
                                    <CheckCircle size={20} />
                                    <span>Acknowledged</span>
                                </div>
                            ) : (
                                <div className="flex gap-3 w-full md:w-auto">
                                    <button
                                        className="flex-1 md:flex-none px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                    >
                                        Read & Acknowledge
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredPolicies.length === 0 && (
                        <div className="text-center py-12 text-gray-500">No policies found.</div>
                    )}
                </div>
            )}

            {/* Policy Popup */}
            {selectedPolicy && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{selectedPolicy.title}</h2>
                                <p className="text-sm text-gray-500">Version {selectedPolicy.version}</p>
                            </div>
                            <button
                                onClick={() => setSelectedPolicy(null)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 overflow-y-auto flex-1">
                            <ReactMarkdown
                                components={{
                                    ul: ({ node, ...props }) => <ul className="list-disc ml-6 mb-4" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal ml-6 mb-4" {...props} />,
                                    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2" {...props} />,
                                    p: ({ node, ...props }) => <p className="mb-4" {...props} />,
                                }}
                            >
                                {selectedPolicy.content}
                            </ReactMarkdown>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedPolicy(null)}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                            >
                                Close
                            </button>
                            {selectedPolicy.is_acknowledged != 1 && (
                                <button
                                    onClick={handleAcknowledge}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-lg shadow-indigo-200 transition-all transform hover:scale-105"
                                >
                                    I Acknowledge & Agree
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Policies;
