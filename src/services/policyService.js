// Mock data for policies
const MOCK_POLICIES = [
    {
        id: 1,
        title: 'Employee Handbook 2024',
        category: 'General',
        updatedAt: '2023-11-01',
        size: '2.4 MB',
        type: 'PDF'
    },
    {
        id: 2,
        title: 'Remote Work Policy',
        category: 'Work Culture',
        updatedAt: '2023-09-15',
        size: '1.1 MB',
        type: 'PDF'
    },
    {
        id: 3,
        title: 'Leave & Attendance Policy',
        category: 'HR',
        updatedAt: '2023-08-20',
        size: '850 KB',
        type: 'PDF'
    },
    {
        id: 4,
        title: 'Code of Conduct',
        category: 'Legal',
        updatedAt: '2023-01-10',
        size: '1.5 MB',
        type: 'PDF'
    },
    {
        id: 5,
        title: 'Travel Reimbursement Guidelines',
        category: 'Finance',
        updatedAt: '2023-06-05',
        size: '500 KB',
        type: 'PDF'
    }
];

const getStoredPolicies = () => {
    const stored = localStorage.getItem('hr_policies');
    if (stored) return JSON.parse(stored);
    localStorage.setItem('hr_policies', JSON.stringify(MOCK_POLICIES));
    return MOCK_POLICIES;
};

export const getPolicies = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(getStoredPolicies());
        }, 600);
    });
};
