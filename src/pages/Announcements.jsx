import React, { useState, useEffect } from 'react';
import { getAnnouncements, acknowledgeAnnouncement } from '../services/announcementService';
import { getCurrentUser } from '../services/authService';
import { Megaphone, CheckCircle, Clock, User } from 'lucide-react';

const Announcements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = getCurrentUser();

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        if (user?.id) {
            try {
                const data = await getAnnouncements(user.id);
                setAnnouncements(data);
            } catch (error) {
                console.error("Failed to fetch announcements", error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleAcknowledge = async (id) => {
        try {
            await acknowledgeAnnouncement(id, user.id);
            // Optimistic update
            setAnnouncements(prev => prev.map(a =>
                a.id === id ? { ...a, is_acknowledged: 1 } : a
            ));
            // Force sidebar refresh (optional, but good for UX)
            window.dispatchEvent(new Event('storage')); // Hacky way or just let user navigate
        } catch (error) {
            alert("Failed to acknowledge. Please try again.");
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Announcements</h1>
                <p className="text-gray-500">Stay updated with the latest news and notices.</p>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading announcements...</div>
                ) : announcements.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                        <Megaphone className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No announcements yet</h3>
                        <p className="text-gray-500">Check back later for updates.</p>
                    </div>
                ) : (
                    announcements.map((item) => (
                        <div
                            key={item.id}
                            className={`bg-white rounded-xl p-6 border transition-all ${item.is_acknowledged
                                    ? 'border-gray-100 opacity-75'
                                    : 'border-indigo-100 shadow-sm ring-1 ring-indigo-50'
                                }`}
                        >
                            <div className="flex justify-between items-start gap-4 mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <User size={14} />
                                            {item.author_name || 'Admin'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={14} />
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                {item.is_acknowledged ? (
                                    <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-medium border border-emerald-100">
                                        <CheckCircle size={12} />
                                        Acknowledged
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-medium border border-amber-100">
                                        New
                                    </span>
                                )}
                            </div>

                            <div className="prose prose-sm max-w-none text-gray-600 mb-6">
                                {item.content}
                            </div>

                            {!item.is_acknowledged && (
                                <div className="flex justify-end pt-4 border-t border-gray-50">
                                    <button
                                        onClick={() => handleAcknowledge(item.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                    >
                                        <CheckCircle size={16} />
                                        Acknowledge Read
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Announcements;
