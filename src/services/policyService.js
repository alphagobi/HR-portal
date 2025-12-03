const API_URL = '/api/policies.php';

export const getPolicies = async (userId = null) => {
    try {
        const url = userId ? `${API_URL}?user_id=${userId}` : API_URL;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch policies');
        return await response.json();
    } catch (error) {
        console.error("Error fetching policies:", error);
        return [];
    }
};

export const createPolicy = async (policyData) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(policyData)
        });
        if (!response.ok) throw new Error('Failed to create policy');
        return await response.json();
    } catch (error) {
        console.error("Error creating policy:", error);
        throw error;
    }
};

export const updatePolicy = async (id, policyData) => {
    try {
        const response = await fetch(`${API_URL}?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(policyData)
        });
        if (!response.ok) throw new Error('Failed to update policy');
        return await response.json();
    } catch (error) {
        console.error("Error updating policy:", error);
        throw error;
    }
};

export const deletePolicy = async (id) => {
    try {
        const response = await fetch(`${API_URL}?id=${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete policy');
        return await response.json();
    } catch (error) {
        console.error("Error deleting policy:", error);
        throw error;
    }
};

export const acknowledgePolicy = async (userId, policyId) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'acknowledge',
                user_id: userId,
                policy_id: policyId
            })
        });
        if (!response.ok) throw new Error('Failed to acknowledge policy');
        return await response.json();
    } catch (error) {
        console.error("Error acknowledging policy:", error);
        throw error;
    }
};
