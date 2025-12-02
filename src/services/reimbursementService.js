import { logActivity } from './activityService';
import { getCurrentUser } from './authService';

// ... existing code ...

export const submitClaim = async (claim) => {
    console.log("Submitting claim:", claim);
    return new Promise((resolve) => {
        setTimeout(() => {
            const user = getCurrentUser();
            const claims = getStoredClaims();
            const newClaim = {
                id: Date.now(),
                employeeId: user ? user.id : 2,
                employeeName: user ? user.name : 'Unknown',
                status: 'Pending',
                ...claim
            };
            claims.push(newClaim);
            localStorage.setItem('hr_claims', JSON.stringify(claims));

            // Log activity
            logActivity(`${newClaim.employeeName} submitted an expense claim.`, 'reimbursement');

            resolve({ success: true });
        }, 600);
    });
};
const MOCK_CLAIMS = [
    {
        id: 1,
        employeeId: 2,
        employeeName: 'John Doe',
        category: 'Travel',
        amount: 150.00,
        description: 'Taxi fare for client meeting',
        date: '2023-11-20',
        status: 'Approved',
        receipt: 'receipt_123.jpg'
    },
    {
        id: 2,
        employeeId: 2,
        employeeName: 'John Doe',
        category: 'Internet',
        amount: 45.00,
        description: 'Monthly broadband bill',
        date: '2023-11-01',
        status: 'Pending',
        receipt: 'bill_nov.pdf'
    },
    {
        id: 3,
        employeeId: 3,
        employeeName: 'Jane Smith',
        category: 'Office Supplies',
        amount: 89.50,
        description: 'Ergonomic mouse and keyboard',
        date: '2023-11-25',
        status: 'Pending',
        receipt: 'amazon_invoice.pdf'
    }
];

const getStoredClaims = () => {
    const stored = localStorage.getItem('hr_claims');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse stored claims", e);
            localStorage.removeItem('hr_claims');
        }
    }
    localStorage.setItem('hr_claims', JSON.stringify(MOCK_CLAIMS));
    return MOCK_CLAIMS;
};

export const getClaims = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(getStoredClaims());
        }, 500);
    });
};

export const getAllClaims = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(getStoredClaims());
        }, 500);
    });
};

export const updateClaimStatus = async (id, status) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const claims = getStoredClaims();
            const claim = claims.find(c => c.id === id);
            if (claim) {
                claim.status = status;
                localStorage.setItem('hr_claims', JSON.stringify(claims));
                resolve(claim);
            } else {
                resolve(null);
            }
        }, 500);
    });
};


