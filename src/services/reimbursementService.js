// Reimbursement Service - API Version

const API_URL = '/api/reimbursements.php';

export const getClaims = async (employeeId = null) => {
    try {
        const url = employeeId
            ? `${API_URL}?employee_id=${employeeId}&_t=${new Date().getTime()}`
            : `${API_URL}?_t=${new Date().getTime()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch claims');
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const submitClaim = async (claimData) => {
    try {
        const response = await fetch(`${API_URL}?_t=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(claimData)
        });
        if (!response.ok) throw new Error('Failed to submit claim');
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const updateClaimStatus = async (id, status) => {
    try {
        const response = await fetch(`${API_URL}?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!response.ok) throw new Error('Failed to update status');
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};
