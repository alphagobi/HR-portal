import React, { useState, useEffect } from 'react';
import { getAnnouncements, createAnnouncement, deleteAnnouncement, getAcknowledgementStats } from '../../services/announcementService';
import { Megaphone, Plus, Trash2, Calendar, User, Eye, CheckCircle, X } from 'lucide-react';

const AdminAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: '',
        content: ''
    });

    // Acknowledgement Modal State
    const [showAckModal, setShowAckModal] = useState(false);
    const [ackStats, setAckStats] = useState([]);
    const [selectedAnnouncementTitle, setSelectedAnnouncementTitle] = useState('');

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        const data = await getAnnouncements();
        setAnnouncements(data);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await createAnnouncement(newAnnouncement);
        await fetchAnnouncements();
        setNewAnnouncement({ title: '', content: '' });
        setShowForm(false);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this announcement?')) {
            setLoading(true);
            await deleteAnnouncement(id);
            await fetchAnnouncements();
            setLoading(false);
        }
    };

    const handleViewAcknowledgements = async (announcement) => {
        setSelectedAnnouncementTitle(announcement.title);
        const stats = await getAcknowledgementStats(announcement.id);
        setAckStats(stats);
        setShowAckModal(true);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
                    <p className="text-gray-500">Manage company-wide news and updates.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={20} />
                    {showForm ? 'Cancel' : 'New Announcement'}
                </button>
            </div>

            {/* Create Announcement Form */}
            {showForm && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 animate-fade-in">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Announcement</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={newAnnouncement.title}
                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                placeholder="e.g., Office Holiday Schedule"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                            <textarea
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32"
                                value={newAnnouncement.content}
                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                placeholder="Write your announcement here..."
                                required
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                                disabled={loading}
                            >
                                {loading ? 'Posting...' : 'Post Announcement'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Announcements List */}
            <div className="space-y-4">
                {announcements.map((announcement) => (
                    <div key={announcement.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Megaphone size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{announcement.title}</h3>
                                    <p className="text-gray-600 mb-3">{announcement.content}</p>
                                    <div className="flex items-center gap-6 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <User size={14} />
                                            <span>{announcement.author_name || 'Admin'}</span>
                                        </div>
                                        <button
                                            onClick={() => handleViewAcknowledgements(announcement)}
                                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                                        >
                                            <CheckCircle size={14} />
                                            <span>{announcement.ack_count || 0} Acknowledged</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(announcement.id)}
                                className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors ml-4"
                                title="Delete Announcement"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                ))}

                {announcements.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                        <Megaphone size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No announcements yet.</p>
                    </div>
                )}
            </div>

            {/* Acknowledgement Modal */}
            {showAckModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Acknowledgements</h3>
                            <button onClick={() => setShowAckModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Users who acknowledged: <strong>{selectedAnnouncementTitle}</strong></p>

                        <div className="flex-1 overflow-y-auto space-y-2">
                            {ackStats.length > 0 ? (
                                ackStats.map((stat) => (
                                    <div key={stat.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {stat.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-gray-900">{stat.name}</span>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {new Date(stat.acknowledged_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No acknowledgements yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAnnouncements;
