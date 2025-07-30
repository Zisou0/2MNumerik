// Utility functions for API calls with HTTP-only cookies

// Dynamic API base URL that works for both localhost and network access
const getApiBaseUrl = () => {
  // Check if there's an environment variable set (useful for production/staging)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // If running in development and accessing from a different device on the network
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Use the same hostname as the frontend but with port 3001
    return `http://${window.location.hostname}:3001/api`
  }
  
  // Default to localhost for local development
  return 'http://localhost:3001/api'
}

const API_BASE_URL = getApiBaseUrl()

// Generic API call function that includes credentials
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultOptions = {
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...options.headers,
    },
  }

  const response = await fetch(url, { ...defaultOptions, ...options })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// Authentication API calls
export const authAPI = {
  login: (credentials) => apiCall('/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  register: (userData) => apiCall('/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  logout: () => apiCall('/logout', {
    method: 'POST',
  }),

  getProfile: () => apiCall('/profile'),
}

// User API calls
export const userAPI = {
  getUsers: (params = {}) => {
    const queryString = Object.keys(params)
      .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    return apiCall(`/users${queryString ? '?' + queryString : ''}`);
  },
  
  getUser: (id) => apiCall(`/users/${id}`),
  
  createUser: (userData) => apiCall('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  
  updateUser: (id, userData) => apiCall(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  
  deleteUser: (id) => apiCall(`/users/${id}`, {
    method: 'DELETE',
  }),
  
  updateProfile: (userData) => apiCall('/users/profile', {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  
  deleteAccount: () => apiCall('/users/account', {
    method: 'DELETE',
  }),
}

// Order API calls
export const orderAPI = {
  getOrders: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return apiCall(`/orders?${searchParams}`);
  },
  
  getOrder: (id) => apiCall(`/orders/${id}`),
  
  createOrder: (orderData) => apiCall('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  }),
  
  updateOrder: (id, orderData) => apiCall(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(orderData),
  }),
  
  updateOrderProduct: (orderId, productId, productData) => apiCall(`/orders/${orderId}/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  }),
  
  deleteOrder: (id) => apiCall(`/orders/${id}`, {
    method: 'DELETE',
  }),
  
  getOrderStats: () => apiCall('/orders/stats'),
}

// Product API calls
export const productAPI = {
  getProducts: (params = {}) => {
    const queryString = Object.keys(params)
      .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    return apiCall(`/products${queryString ? '?' + queryString : ''}`);
  },
  
  getProduct: (id) => apiCall(`/products/${id}`),
  
  createProduct: (productData) => apiCall('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  }),
  
  updateProduct: (id, productData) => apiCall(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  }),
  
  deleteProduct: (id) => apiCall(`/products/${id}`, {
    method: 'DELETE',
  }),
}

// Client API calls
export const clientAPI = {
  getClients: (params = {}) => {
    const queryString = Object.keys(params)
      .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    return apiCall(`/clients${queryString ? '?' + queryString : ''}`);
  },
  
  getClient: (id) => apiCall(`/clients/${id}`),
  
  createClient: (clientData) => apiCall('/clients', {
    method: 'POST',
    body: JSON.stringify(clientData),
  }),
  
  updateClient: (id, clientData) => apiCall(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(clientData),
  }),
  
  deleteClient: (id) => apiCall(`/clients/${id}`, {
    method: 'DELETE',
  }),
  
  getClientStats: () => apiCall('/clients/stats'),
  
  searchClients: (query) => apiCall(`/clients/search?q=${encodeURIComponent(query)}`),
  
  importClientsFromExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiCall('/clients/import', {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        // Don't set Content-Type, let browser set it for FormData
      },
      body: formData
    });
  },
}

// Finition API calls
export const finitionAPI = {
  getFinitions: (params = {}) => {
    const queryString = Object.keys(params)
      .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    return apiCall(`/finitions${queryString ? '?' + queryString : ''}`);
  },
  getFinitionById: (id) => apiCall(`/finitions/${id}`),
  createFinition: (finitionData) => apiCall('/finitions', {
    method: 'POST',
    body: JSON.stringify(finitionData),
  }),
  updateFinition: (id, finitionData) => apiCall(`/finitions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(finitionData),
  }),
  deleteFinition: (id) => apiCall(`/finitions/${id}`, {
    method: 'DELETE',
  }),
  // Product-finition relationships
  getProductFinitions: (productId) => apiCall(`/finitions/product/${productId}`),
  addFinitionToProduct: (productId, finitionId, relationData) => apiCall(`/finitions/product/${productId}/finition/${finitionId}`, {
    method: 'POST',
    body: JSON.stringify(relationData),
  }),
  updateProductFinition: (productId, finitionId, relationData) => apiCall(`/finitions/product/${productId}/finition/${finitionId}`, {
    method: 'PUT',
    body: JSON.stringify(relationData),
  }),
  removeFinitionFromProduct: (productId, finitionId) => apiCall(`/finitions/product/${productId}/finition/${finitionId}`, {
    method: 'DELETE',
  }),
}

// Statistics API calls
export const statisticsAPI = {
  getBusinessStats: (params = {}) => {
    const queryString = Object.keys(params)
      .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    return apiCall(`/statistics/business${queryString ? '?' + queryString : ''}`);
  },
  
  getDashboardStats: () => apiCall('/statistics/dashboard'),
}

// Export API calls
export const exportAPI = {
  exportDatabase: async () => {
    const url = `${API_BASE_URL}/export/database`
    
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    // Return the blob for file download
    return response.blob()
  },
}

// Atelier Tasks API calls
export const atelierTaskAPI = {
  getTasks: (params = {}) => {
    const queryString = Object.keys(params)
      .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    return apiCall(`/atelier-tasks${queryString ? '?' + queryString : ''}`);
  },
  
  getTask: (id) => apiCall(`/atelier-tasks/${id}`),
  
  createTask: (taskData) => apiCall('/atelier-tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  }),
  
  updateTask: (id, taskData) => apiCall(`/atelier-tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(taskData),
  }),
  
  deleteTask: (id) => apiCall(`/atelier-tasks/${id}`, {
    method: 'DELETE',
  }),
  
  getTaskStats: (params = {}) => {
    const queryString = Object.keys(params)
      .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    return apiCall(`/atelier-tasks/stats${queryString ? '?' + queryString : ''}`);
  },
  
  getTasksByAssignee: (assignedTo, params = {}) => {
    const queryString = Object.keys(params)
      .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    return apiCall(`/atelier-tasks/assignee/${encodeURIComponent(assignedTo)}${queryString ? '?' + queryString : ''}`);
  },
  
  updateTaskStatus: (id, statusData) => apiCall(`/atelier-tasks/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(statusData),
  }),
}

export default { apiCall, authAPI, userAPI, orderAPI, productAPI, clientAPI, finitionAPI, statisticsAPI, exportAPI, atelierTaskAPI }
