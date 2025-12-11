import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { getAnnouncements } from '../services/announcementService';
import { getLeaves } from '../services/leaveService';
import { getCurrentUser } from '../services/authService';
import { LayoutDashboard, FileText, Clock, Calendar, IndianRupee, Menu, X, LogOut, CheckSquare, Megaphone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { logout } from '../services/authService';
import clsx from 'clsx';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
    const [unreadLeaves, setUnreadLeaves] = useState(0);
    const [user, setUser] = useState(null); // User state to store current user
    const location = useLocation();

    useEffect(() => {
        document.title = 'Internal Portal - AlphaGobi';
        const currentUser = getCurrentUser(); // Get current user once
        setUser(currentUser);

        const fetchUnread = async () => {
            if (currentUser?.id) {
                // Announcements
                const announcements = await getAnnouncements(currentUser.id);
                const unreadAnn = announcements.filter(a => !a.is_acknowledged).length;
                setUnreadAnnouncements(unreadAnn);

                // Leaves
                try {
                    const leavesData = await getLeaves(currentUser.id);
                    let unreadL = 0;
                    if (Array.isArray(leavesData)) {
                        // Admin view (array of leaves)
                        unreadL = leavesData.reduce((acc, l) => acc + (parseInt(l.unread_count) || 0), 0);
                    } else if (leavesData.leaves) {
                        // Employee view (object with leaves array)
                        unreadL = leavesData.leaves.reduce((acc, l) => acc + (parseInt(l.unread_count) || 0), 0);
                    }
                    setUnreadLeaves(unreadL);
                } catch (e) {
                    console.error("Failed to fetch leaves for badge", e);
                }
            }
        };
        fetchUnread();
    }, [location.pathname]); // Refresh on navigation

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Tasks', path: '/tasks', icon: CheckSquare },
        { name: 'Timesheet', path: '/timesheet', icon: Clock },
        { name: 'Leaves', path: '/leaves', icon: Calendar, badge: unreadLeaves },
        { name: 'Calendar', path: '/calendar', icon: Calendar },
        { name: 'Reimbursements', path: '/reimbursements', icon: IndianRupee },
        { name: 'Announcements', path: '/announcements', icon: Megaphone, badge: unreadAnnouncements },
        { name: 'Policies', path: '/policies', icon: FileText },
    ];

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Global Values Header - Desktop Only */}
            <div className="hidden lg:flex bg-white border-b border-gray-200 py-6 px-8 relative items-center justify-center shadow-sm z-10">
                <img src="/logo-wide.png" alt="AlphaGobi" className="h-12 w-auto absolute left-8 top-1/2 transform -translate-y-1/2" />
                <p className="text-3xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-600 uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Integrity. Effort. Intelligence.
                </p>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={clsx(
                        "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col shadow-xl lg:shadow-none",
                        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    )}
                >
                    <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100 lg:hidden">
                        <img src="/logo-wide.png" alt="AlphaGobi" className="h-8 w-auto" />
                        <button
                            className="text-gray-400 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <nav className="p-4 space-y-2 flex-1 overflow-y-auto no-scrollbar">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={clsx(
                                        "flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden",
                                        isActive
                                            ? "bg-indigo-600 text-white shadow-indigo-200 shadow-md"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                                    )}
                                >
                                    <Icon size={20} className={clsx("transition-transform duration-200", !isActive && "group-hover:scale-110", isActive && "text-white")} />
                                    <span className="flex-1 z-10">{item.name}</span>
                                    {item.badge > 0 && (
                                        <span className={clsx(
                                            "text-xs font-bold px-2.5 py-0.5 rounded-full z-10",
                                            isActive ? "bg-white/20 text-white" : "bg-red-500 text-white shadow-sm"
                                        )}>
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-gray-100">
                        {/* User Profile Mini - Visible in sidebar for mobile/desktop parity */}
                        <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-gray-50 border border-gray-100">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'User'}</p>
                                <p className="text-xs text-gray-500 truncate">Employee</p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 w-full text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 font-medium group"
                        >
                            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
                    {/* Top Header (Mobile only) - Sticky & Glassmorphism */}
                    <header className="h-16 bg-white/80 backdrop-blur-lg border-b border-gray-200 flex items-center justify-between px-4 lg:hidden sticky top-0 z-30 transition-all duration-300">
                        <div className="flex items-center gap-3">
                            <button
                                className="text-gray-500 hover:text-indigo-600 transition-colors p-2 -ml-2 rounded-lg active:bg-gray-100"
                                onClick={() => setIsSidebarOpen(true)}
                            >
                                <Menu size={24} />
                            </button>
                            <div className="flex items-center gap-2">
                                <img src="/logo-round.png" alt="Logo" className="h-8 w-8" />
                                <span className="text-lg font-bold text-gray-900 tracking-tight">Internal Portal</span>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-auto scroll-smooth">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Layout;
