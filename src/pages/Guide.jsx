import React from 'react';
import {
    LayoutDashboard,
    CheckSquare,
    Clock,
    Calendar,
    DollarSign,
    FileText
} from 'lucide-react';

const Guide = () => {
    const modules = [
        {
            title: "Dashboard Overview",
            icon: <LayoutDashboard className="w-6 h-6 text-indigo-600" />,
            description: "Your central hub for daily activities.",
            points: [
                "View your total logged hours for the day.",
                "See pending tasks and upcoming deadlines.",
                "Review your framework allocation progress."
            ]
        },
        {
            title: "Task Management",
            icon: <CheckSquare className="w-6 h-6 text-green-600" />,
            description: "Manage your daily work items effectively.",
            points: [
                "Create tasks for what you plan to achieve today.",
                "Mark tasks as 'Done' once completed.",
                "Overdue tasks from previous days appear in red."
            ]
        },
        {
            title: "Timesheets",
            icon: <Clock className="w-6 h-6 text-blue-600" />,
            description: "Log your work hours accurately.",
            points: [
                "Your timesheet is automatically populated from your completed tasks.",
                "You can manually add entries if needed.",
                "Ensure your daily total matches your working hours."
            ]
        },
        {
            title: "Leaves & Time Off",
            icon: <Calendar className="w-6 h-6 text-orange-600" />,
            description: "Apply for leaves and check status.",
            points: [
                "Submit leave requests for approval.",
                "Check your remaining leave balance.",
                "View the company holiday calendar."
            ]
        },
        {
            title: "Reimbursements",
            icon: <DollarSign className="w-6 h-6 text-purple-600" />,
            description: "Claim business expenses.",
            points: [
                "Upload receipts/bills for expenses.",
                "Track the status of your claims (Approved/Pending/Rejected).",
                "Ensure all details are accurate before submitting."
            ]
        },
        {
            title: "Company Policies",
            icon: <FileText className="w-6 h-6 text-gray-600" />,
            description: "Stay informed about company rules.",
            points: [
                "Read the latest HR policies.",
                "Acknowledge new policies when required.",
                "Refer back to policies anytime."
            ]
        }
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Employee Portal Guide</h1>
                <p className="mt-2 text-gray-600 text-lg">
                    Welcome to the AlphaGobi Employee Portal. Here's a quick guide to help you get started.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((module, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gray-50 rounded-lg">
                                {module.icon}
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">{module.title}</h2>
                        </div>
                        <p className="text-gray-600 mb-4 font-medium">{module.description}</p>
                        <ul className="space-y-2">
                            {module.points.map((point, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0"></span>
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mt-12 bg-indigo-50 rounded-xl p-8 border border-indigo-100">
                <h2 className="text-xl font-bold text-indigo-900 mb-2">Need Help?</h2>
                <p className="text-indigo-700">
                    If you have any questions or encounter issues, please contact the HR team.
                </p>
            </div>
        </div>
    );
};

export default Guide;
