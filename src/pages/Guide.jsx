import React from 'react';
import {
    LayoutDashboard,
    CheckSquare,
    Clock,
    Calendar,
    DollarSign,
    FileText,
    Megaphone
} from 'lucide-react';

const Guide = () => {
    const sections = [
        {
            id: 'dashboard',
            title: "Dashboard (The Hub)",
            icon: <LayoutDashboard className="w-6 h-6 text-indigo-600" />,
            usage: "Daily",
            description: "Your central workspace for executing tasks and logging work.",
            steps: [
                "**Your Tasks List**: View tasks scheduled for today. Colors indicate status: **Red** (Overdue), **Yellow** (Due Today), **Green** (Future).",
                "**Start Working**: Click on a task in the list to expand it.",
                "**Log Task Completion**: This is how you finish a task. \n   - Enter **Time Spent (Mins)** (e.g., 60).\n   - Add **Remarks** (optional).\n   - Click **Log & Complete**.",
                "**Logged Today**: Once logged, the entry moves to the 'Logged Today' widget on the left.",
                "**Edit/Undo**: You can edit (Pencil icon) or delete (Trash icon) log entries from the 'Logged Today' list if you made a mistake."
            ]
        },
        {
            id: 'planner',
            title: "Task Planner (Planning)",
            icon: <CheckSquare className="w-6 h-6 text-green-600" />,
            usage: "Daily / Weekly",
            description: "Plan your future work. Use this page to populate your Dashboard.",
            steps: [
                "Navigate to **Tasks** from the sidebar.",
                "Click **+ Add Task**.",
                "**Required Fields**:\n   - **Date**: When do you plan to do this?\n   - **Task Description**: What needs to be done?\n   - **ETA (Minutes)**: Estimated time (Required).",
                "**Framework** (Optional): Link the task to a strategic framework item.",
                "**Recurring**: Toggle 'Recurring Task?' for items that repeat (Daily/Weekly).",
                "**Note**: You *plan* here, but you *complete* tasks on the Dashboard."
            ]
        },
        {
            id: 'timesheets',
            title: "Timesheets",
            icon: <Clock className="w-6 h-6 text-blue-600" />,
            usage: "Daily Review",
            description: "Review and submit your work logs.",
            steps: [
                "Go to **Timesheet**.",
                "Your timesheet is **auto-filled** based on the tasks you completed in the Dashboard.",
                "**Manual Entry**: If you did work not in your plan, use 'Add Entry' here.",
                "**Verify Total**: Ensure your 'Total Hours' matches your actual working day.",
                "**Submit**: Submit your timesheet at the end of the day or week."
            ]
        },
        {
            id: 'announcements',
            title: "Announcements",
            icon: <Megaphone className="w-6 h-6 text-red-600" />,
            usage: "As Needed",
            description: "Company updates and alerts.",
            steps: [
                "Check the **Announcements** page for new messages.",
                "Look for the **Red Badge** on the sidebar indicating unread items.",
                "**Acknowledge**: Some important announcements require you to click 'Acknowledge' to confirm receipt."
            ]
        },
        {
            id: 'leaves',
            title: "Leaves",
            icon: <Calendar className="w-6 h-6 text-orange-600" />,
            usage: "As Needed",
            description: "Leave management.",
            steps: [
                "Click **Apply Leave** on the Leaves page.",
                "Select **Leave Type** and Dates.",
                "Submit and track approval status in the **My Leaves** list."
            ]
        },
        {
            id: 'reimbursements',
            title: "Reimbursements",
            icon: <DollarSign className="w-6 h-6 text-purple-600" />,
            usage: "As Needed",
            description: "Expense claims.",
            steps: [
                "Click **New Claim** on the Reimbursements page.",
                "Enter details and **Upload Receipt** (Required).",
                "Submit for Finance approval."
            ]
        },
        {
            id: 'policies',
            title: "Policies",
            icon: <FileText className="w-6 h-6 text-gray-600" />,
            usage: "Reference",
            description: "Employee handbook and rules.",
            steps: [
                "View and download company policy documents.",
                "**Acknowledge** updated policies when prompted."
            ]
        }
    ];

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-900">How to Use the Employee Portal</h1>
                <p className="mt-3 text-gray-600 text-lg max-w-2xl mx-auto">
                    Master your daily workflow: Plan in Tasks, Execute in Dashboard.
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
                                            ${section.usage.includes('Daily') ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'}`}>
                                            {section.usage}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 mb-6">{section.description}</p>

                                    {/* Steps */}
                                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">How to use:</h3>
                                        <ul className="space-y-4">
                                            {section.steps.map((step, idx) => (
                                                <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                                                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs mt-0.5">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{
                                                        __html: step.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-gray-900">$1</span>')
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
