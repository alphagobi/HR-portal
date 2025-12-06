import React, { useEffect, useState } from 'react';
import { getAnnouncements } from '../services/announcementService';
import { getLeaves } from '../services/leaveService';
import { getCurrentUser } from '../services/authService';
import { Bell, Calendar, CheckCircle, Clock } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
            <Icon size={24} className="text-white" />
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
    </div>
);

const Dashboard = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [leaveBalance, setLeaveBalance] = useState('Loading...');
    const [loading, setLoading] = useState(true);
    const user = getCurrentUser();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getAnnouncements();
                setAnnouncements(data);

                if (user?.id) {
                    const leaveData = await getLeaves(user.id);
                    if (leaveData.limits && leaveData.usage) {
                        const totalLimit = (leaveData.limits['Informed Leave'] || 0) + (leaveData.limits['Emergency Leave'] || 0);
                        const totalUsage = (leaveData.usage['Informed Leave'] || 0) + (leaveData.usage['Emergency Leave'] || 0);
                        setLeaveBalance(`${totalLimit - totalUsage} Days`);
                    } else {
                        setLeaveBalance('12 Days'); // Fallback
                    }
                }
            } catch (error) {
                console.error("Failed to fetch announcements", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0] || 'Employee'}!</h1>
                <p className="text-gray-500">Here's what's happening today.</p>
            </div>

            {/* Core Values Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                            <CheckCircle size={24} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold">Integrity</h3>
                    </div>
                    <p className="text-indigo-100">Doing the right thing, even when no one is watching. Upholding the highest standards of honesty.</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Clock size={24} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold">Effort</h3>
                    </div>
                    <p className="text-blue-100">Going above and beyond. Consistently delivering your best work and striving for excellence.</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Bell size={24} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold">Intelligence</h3>
                    </div>
                    <p className="text-emerald-100">Solving problems smartly. Continuous learning and applying knowledge to create value.</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
