import axios from 'axios';

const API_URL = 'http://localhost:8000/api/frameworks.php';

export const getFrameworkAllocations = async (userId) => {
    try {
        const response = await axios.get(`${API_URL}?user_id=${userId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching framework allocations:", error);
        throw error;
    }
};
