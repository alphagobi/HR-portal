const API_URL = '/api/invoices.php';

export const getInvoices = async () => {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return response.json();
};

export const createInvoice = async (invoiceData) => {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
    });
    if (!response.ok) throw new Error('Failed to create invoice');
    return response.json();
};

export const updateInvoiceStatus = async (id, status) => {
    const response = await fetch(`${API_URL}?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('Failed to update invoice status');
    return response.json();
};
