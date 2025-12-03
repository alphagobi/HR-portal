import React, { useState, useEffect } from 'react';
import { getPolicies, createPolicy, updatePolicy, deletePolicy } from '../../services/policyService';
import { FileText, Plus, Edit, Trash2, Search } from 'lucide-react';

const AdminPolicies = () => {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [newPolicy, setNewPolicy] = useState({
        title: '',
        content: '',
        version: '1.0',
        category: 'General'
    });

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        try {
            const data = await getPolicies();
            setPolicies(data);
        } catch (error) {
            console.error("Failed to fetch policies", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingId) {
                await updatePolicy(editingId, newPolicy);
            } else {
                await createPolicy(newPolicy);
            }
            await fetchPolicies();
            closeModal();
        } catch (error) {
            console.error("Failed to save policy", error);
            alert("Failed to save policy");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (policy) => {
        setNewPolicy({
            title: policy.title,
            content: policy.content,
            version: policy.version,
            category: policy.category
        });
        setEditingId(policy.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this policy?')) {
            setLoading(true);
            try {
                await deletePolicy(id);
                await fetchPolicies();
            } catch (error) {
                console.error("Failed to delete policy", error);
                alert("Failed to delete policy");
            } finally {
                setLoading(false);
            }
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setNewPolicy({ title: '', content: '', version: '1.0', category: 'General' });
    };

    const filteredPolicies = policies.filter(policy =>
        policy.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Policy Management</h1>
                    <p className="text-gray-500">Create and manage company policies.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={20} />
                    Add Policy
                </button>
            </div>

            {/* Search */}
            <div className="mb-6 relative">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 font-medium text-gray-500">Policy Title</th>
                                <th className="p-4 font-medium text-gray-500">Category</th>
                                <th className="p-4 font-medium text-gray-500">Version</th>
                                <th className="p-4 font-medium text-gray-500">Last Updated</th>
                                <th className="p-4 font-medium text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPolicies.map((policy) => (
                                <tr key={policy.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                                <FileText size={20} />
                                            </div>
                                            <span className="font-medium text-gray-900">{policy.title}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">{policy.category}</td>
                                    <td className="p-4 text-sm text-gray-600">v{policy.version}</td>
                                    <td className="p-4 text-sm text-gray-500">{new Date(policy.updated_at).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(policy)}
                                                className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(policy.id)}
                                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredPolicies.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">
                                        No policies found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            {editingId ? 'Edit Policy' : 'Add New Policy'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newPolicy.title}
                                    onChange={(e) => setNewPolicy({ ...newPolicy, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newPolicy.category}
                                        onChange={(e) => setNewPolicy({ ...newPolicy, category: e.target.value })}
                                        placeholder="e.g., HR, IT, General"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newPolicy.version}
                                        onChange={(e) => setNewPolicy({ ...newPolicy, version: e.target.value })}
                                        placeholder="e.g., 1.0"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                                <textarea
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-64 resize-none font-mono text-sm"
                                    value={newPolicy.content}
                                    onChange={(e) => setNewPolicy({ ...newPolicy, content: e.target.value })}
                                    placeholder="Enter policy content here (Markdown supported)..."
                                    required
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    {editingId ? 'Update Policy' : 'Create Policy'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPolicies;
