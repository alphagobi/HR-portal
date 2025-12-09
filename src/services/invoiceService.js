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

const CLIENTS_API_URL = '/api/clients.php';

export const getClients = async (id = null) => {
    const url = id ? `${CLIENTS_API_URL}?id=${id}` : CLIENTS_API_URL;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch clients');
    return response.json();
};

export const createClient = async (clientData) => {
    const response = await fetch(CLIENTS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
    });
    if (!response.ok) throw new Error('Failed to create client');
    return response.json();
};
