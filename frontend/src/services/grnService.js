const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get all GRNs
export const getAllGRNs = async (page = 1, limit = 10) => {
  try {
    const url = `${API_BASE_URL}/goods-received?page=${page}&limit=${limit}`;
    console.log('Fetching GRNs from:', url);
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return data;
  } catch (error) {
    console.error('Error fetching GRNs:', error.message);
    throw error;
  }
};

// Get single GRN by ID
export const getGRNById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/goods-received/${id}`);
    if (!response.ok) throw new Error('Failed to fetch GRN');
    return await response.json();
  } catch (error) {
    console.error('Error fetching GRN:', error);
    throw error;
  }
};

// Create new GRN
export const createGRN = async (grnData) => {
  try {
    const url = `${API_BASE_URL}/goods-received`;
    console.log('Creating GRN with data:', grnData);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(grnData),
    });
    
    const data = await response.json();
    console.log('GRN creation response:', data, 'Status:', response.status);
    
    if (!response.ok) {
      const errorMsg = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error('GRN Creation Error Details:', {
        status: response.status,
        message: data.message,
        error: data.error,
        fullData: data
      });
      throw new Error(errorMsg);
    }
    return data;
  } catch (error) {
    console.error('Error creating GRN:', error.message, 'Full error:', error);
    throw error;
  }
};

// Update GRN
export const updateGRN = async (id, grnData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/goods-received/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(grnData),
    });
    if (!response.ok) throw new Error('Failed to update GRN');
    return await response.json();
  } catch (error) {
    console.error('Error updating GRN:', error);
    throw error;
  }
};

// Delete GRN
export const deleteGRN = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/goods-received/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete GRN');
    return await response.json();
  } catch (error) {
    console.error('Error deleting GRN:', error);
    throw error;
  }
};

// Get GRNs by PO number
export const getGRNsByPONumber = async (poNumber) => {
  try {
    const response = await fetch(`${API_BASE_URL}/goods-received/po/${poNumber}`);
    if (!response.ok) throw new Error('Failed to fetch GRNs');
    return await response.json();
  } catch (error) {
    console.error('Error fetching GRNs by PO:', error);
    throw error;
  }
};

// Get GRN summary
export const getGRNSummary = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/goods-received/summary/report`);
    if (!response.ok) throw new Error('Failed to fetch summary');
    return await response.json();
  } catch (error) {
    console.error('Error fetching GRN summary:', error);
    throw error;
  }
};

// Search GRNs
export const searchGRNs = async (query, type = 'all') => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/goods-received/search?query=${query}&type=${type}`
    );
    if (!response.ok) throw new Error('Failed to search GRNs');
    return await response.json();
  } catch (error) {
    console.error('Error searching GRNs:', error);
    throw error;
  }
};
