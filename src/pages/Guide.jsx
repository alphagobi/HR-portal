import React from 'react';
import {
    LayoutDashboard,
    CheckSquare,
    Clock,
    Calendar,
    DollarSign,
    FileText,
    Megaphone,
    ChevronRight
} from 'lucide-react';

const Guide = () => {
    const sections = [
        {
            id: 'tasks',
            title: "Task Management",
            icon: <CheckSquare className="w-6 h-6 text-green-600" />,
            usage: "Daily",
            description: "Manage your daily work items. This is your primary workspace.",
            steps: [
                "Navigate to the **Tasks** page from the sidebar.",
                "Click the **+ New Task** button.",
                "Select a **Project Code** (e.g., General, Client Work).",
                "Enter a clear **Task Description** of what you plan to do.",
                "Set the **Planned Date** (defaults to today).",
                "Once you finish a task, click the **checkbox** to mark it as 'Done'.",
                "**Note:** Tasks marked as 'Done' will automatically appear in your Timesheet."
            ]
        },
        {
            id: 'timesheets',
            title: "Timesheets",
            icon: <Clock className="w-6 h-6 text-blue-600" />,
            usage: "Daily",
            description: "Log your work hours. Accurate timesheets ensure proper tracking.",
            steps: [
                "Go to the **Timesheet** page.",
                "Your **completed tasks** for the day are automatically added as entries.",
                "Review the **Duration** for each entry. Adjust if necessary.",
                "If you did work not captured in tasks, use the **Add Entry** button.",
                "Verify the **Total Hours** at the bottom matches your working day.",
                "Click **Submit** at the end of the day or week as per policy."
            ]
        },
        {
            id: 'announcements',
            title: "Announcements",
            icon: <Megaphone className="w-6 h-6 text-red-600" />,
            usage: "Scanning",
            description: "Stay updated with important company news and alerts.",
            steps: [
                "Check the **Announcements** page or the Dashboard widget.",
                "Unread announcements will have a **badge** indicator.",
                "Click on an announcement to read the full details.",
                "Some announcements require acknowledgment. Click the **Acknowledge** button to confirm you've read it."
            ]
        },
        {
            id: 'leaves',
            title: "Leaves & Time Off",
            icon: <Calendar className="w-6 h-6 text-orange-600" />,
            usage: "Occasional",
            description: "Apply for leaves and managing your time off balance.",
            steps: [
                "Navigate to the **Leaves** page.",
                "Click **Apply Leave** to open the request form.",
                "Select the **Leave Type** (Sick, Casual, Earned).",
                "Choose the **From** and **To** dates.",
                "Add a brief **Reason** for the leave.",
                "Click **Submit**. You can track the status (Pending/Approved) in the 'My Leaves' list."
            ]
        },
        {
            id: 'reimbursements',
            title: "Reimbursements",
            icon: <DollarSign className="w-6 h-6 text-purple-600" />,
            usage: "Occasional",
            description: "Claim business-related expenses.",
            steps: [
                "Go to the **Reimbursements** page.",
                "Click **New Claim**.",
                "Enter the **Expense Type** (Travel, Food, etc.) and **Amount**.",
                "**Upload** a clear photo or PDF of the receipt/bill (Required).",
                "Submit the claim. You will be notified once Finance approves or rejects it."
            ]
        },
        {
            id: 'policies',
            title: "Company Policies",
            icon: <FileText className="w-6 h-6 text-gray-600" />,
            usage: "Occasional",
            description: "Reference guide for company rules and regulations.",
            steps: [
                "Visit the **Policies** page to access the employee handbook.",
                "Click on a policy document to **view or download** it.",
                "When a policy is updated, you may be asked to **Acknowledge** the new version."
            ]
        }
    ];

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-900">How to Use the Employee Portal</h1>
                <p className="mt-3 text-gray-600 text-lg max-w-2xl mx-auto">
                    A step-by-step guide to your daily workflows, ordered by frequency of use.
                </p>
            </div>

            <div className="space-y-6">
                {sections.map((section) => (
                    <div key={section.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-6 md:p-8">
                            <div className="flex flex-col md:flex-row md:items-start gap-6">
                                {/* Icon & Header */}
                                <div className="flex-shrink-0">
                                    <div className="p-3 bg-gray-50 rounded-xl inline-flex">
                                        {section.icon}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                        <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${section.usage === 'Daily' ? 'bg-green-100 text-green-800' :
                                                section.usage === 'Scanning' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                            {section.usage} Use
                                        </span>
                                    </div>
                                    <p className="text-gray-600 mb-6">{section.description}</p>

                                    {/* Steps */}
                                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">How to use:</h3>
                                        <ul className="space-y-3">
                                            {section.steps.map((step, idx) => (
                                                <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                                                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs mt-0.5">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="leading-relaxed" dangerouslySetInnerHTML={{
                                                        __html: step.replace(/\*\*(.*?)\*\*/g, '<span class="font-semibold text-gray-900">$1</span>')
                                                    }} />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 bg-indigo-50 rounded-xl p-8 border border-indigo-100 text-center">
                <h2 className="text-xl font-bold text-indigo-900 mb-2">Still have questions?</h2>
                <p className="text-indigo-700">
                    Reach out to the HR department for further assistance with the portal.
                </p>
            </div>
        </div>
    );
};

export default Guide;
