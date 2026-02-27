const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get all purchase orders
export const getAllPOs = async (page = 1, limit = 100) => {
  try {
    const url = `${API_BASE_URL}/purchase-orders?page=${page}&limit=${limit}`;
    console.log('Fetching POs from:', url);
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return data;
  } catch (error) {
    console.error('Error fetching POs:', error.message);
    throw error;
  }
};

// Get PO by ID
export const getPOById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}`);
    if (!response.ok) throw new Error('Failed to fetch PO');
    return await response.json();
  } catch (error) {
    console.error('Error fetching PO:', error);
    throw error;
  }
};

// Get POs by status
export const getPOsByStatus = async (status) => {
  try {
    const response = await fetch(`${API_BASE_URL}/purchase-orders/status/${status}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch POs by status');
    }
    return data;
  } catch (error) {
    console.error('Error fetching POs by status:', error);
    throw error;
  }
};

// Search POs
export const searchPOs = async (query, type = 'all') => {
  try {
    const response = await fetch(`${API_BASE_URL}/purchase-orders/search?query=${query}&type=${type}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to search POs');
    }
    return data;
  } catch (error) {
    console.error('Error searching POs:', error);
    throw error;
  }
};
