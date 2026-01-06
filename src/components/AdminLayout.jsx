import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    Clock,
    Calendar,
    Users,
    LayoutTemplate,
    IndianRupee,
    CheckSquare,
    Megaphone,
    Menu,
    X,
    LogOut
} from 'lucide-react';
import { logout, getCurrentUser } from '../services/authService';
import { getLeaves } from '../services/leaveService';
import clsx from 'clsx';

const AdminLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const user = getCurrentUser();

    const [unreadLeaves, setUnreadLeaves] = useState(0);

    React.useEffect(() => {
        document.title = 'Admin Portal - AlphaGobi';

        const fetchUnread = async () => {
            if (user?.id) {
                try {
                    const leavesData = await getLeaves(); // Fetch all leaves for admin
                    // Admin view: count unread messages from employees
                    const unreadL = leavesData.reduce((acc, l) => acc + (parseInt(l.unread_count) || 0), 0);
                    setUnreadLeaves(unreadL);
                } catch (e) {
                    console.error("Failed to fetch leaves for badge", e);
                }
            }
        };
        fetchUnread();
    }, []);

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/clients', icon: Users, label: 'Clients' },
        { path: '/admin/users', icon: Users, label: 'Employees' },
        { path: '/admin/timesheets', icon: Clock, label: 'Timesheets' },
        { path: '/admin/frameworks', icon: LayoutTemplate, label: 'Team' },
        { path: '/admin/leaves', icon: CheckSquare, label: 'Leave Approvals', badge: unreadLeaves },
        { path: '/admin/calendar', icon: Calendar, label: 'Calendar' },
        { path: '/admin/reimbursements', icon: IndianRupee, label: 'Reimbursements' },
        { path: '/', icon: LayoutDashboard, label: 'Employee Portal' },
        { path: '/admin/invoices', icon: FileText, label: 'Invoices' },
        { path: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
        { path: '/admin/policies', icon: FileText, label: 'Policies' },
    ];

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={clsx(
                    "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transition-transform duration-200 ease-in-out flex flex-col",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                <div className="h-16 flex items-center justify-center px-6 border-b border-slate-800 relative">
                    <img src="/logo-wide.png" alt="AlphaGobi" className="h-10 w-auto bg-white rounded px-2 py-1" />
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden text-gray-400 hover:text-white absolute right-4"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="p-4 space-y-1 flex-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/admin'}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) => clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                isActive
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                            {item.badge > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {item.badge}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
                    <div className="flex items-center gap-3 lg:hidden">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            <Menu size={24} />
                        </button>
                        <img src="/logo-round.png" alt="Logo" className="h-8 w-8" />
                        <span className="text-lg font-semibold text-gray-900">Admin Portal</span>
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin User'}</p>
                            <p className="text-xs text-gray-500">System Administrator</p>
                        </div>
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                            {user?.name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
