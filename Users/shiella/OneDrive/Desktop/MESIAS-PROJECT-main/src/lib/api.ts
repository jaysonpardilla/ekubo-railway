const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    // Throw a stringified error object so callers can see validation errors
    const message = (error && typeof error === 'object') ? JSON.stringify(error) : (error.error || 'Request failed');
    throw new Error(message);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export const auth = {
  async signup(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    username: string;
    address: string;
    contactNumber?: string;
    dateOfBirth?: string;
    userType: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/auth/signup/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await handleResponse(response);
    if (result.token) {
      localStorage.setItem('auth_token', result.token);
    }
    return result;
  },

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await handleResponse(response);
    if (result.token) {
      localStorage.setItem('auth_token', result.token);
    }
    return result;
  },

  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/auth/me/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  logout() {
    localStorage.removeItem('auth_token');
  }
};

export const users = {
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getById(id: string) {
    const response = await fetch(`${API_BASE_URL}/users/${id}/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async update(id: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/users/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async create(data: any) {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async getStats() {
    const response = await fetch(`${API_BASE_URL}/users/stats/counts/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
,

  async delete(id: string) {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

export const beneficiaries = {
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/beneficiaries/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getById(id: string) {
    const response = await fetch(`${API_BASE_URL}/beneficiaries/${id}/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getByUserId(userId: string) {
    const response = await fetch(`${API_BASE_URL}/beneficiaries/user/${userId}/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async create(data: any) {
    const response = await fetch(`${API_BASE_URL}/beneficiaries/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async update(id: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/beneficiaries/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  }
};

export const applications = {
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/applications/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getById(id: string) {
    const response = await fetch(`${API_BASE_URL}/applications/${id}/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async create(data: { programId: string; formData: any }) {
    const response = await fetch(`${API_BASE_URL}/applications/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async update(id: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/applications/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async createSchedule(id: string, data: { release_date: string; release_time?: string; venue: string; instructions?: string }) {
    const response = await fetch(`${API_BASE_URL}/applications/${id}/schedule/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async claimSchedule(id: string, data?: { notes?: string }) {
    const response = await fetch(`${API_BASE_URL}/applications/${id}/schedule/claim/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data || {})
    });
    return handleResponse(response);
  },

  async getStats() {
    const response = await fetch(`${API_BASE_URL}/applications/stats/counts/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

export const programs = {
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/programs/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getById(id: string) {
    const response = await fetch(`${API_BASE_URL}/programs/${id}/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async create(data: any) {
    const response = await fetch(`${API_BASE_URL}/programs/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async update(id: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/programs/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async delete(id: string) {
    const response = await fetch(`${API_BASE_URL}/programs/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

export const notifications = {
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/notifications/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async create(data: any) {
    const response = await fetch(`${API_BASE_URL}/notifications/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async markAsRead(id: string) {
    const response = await fetch(`${API_BASE_URL}/notifications/${id}/read/`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async delete(id: string) {
    const response = await fetch(`${API_BASE_URL}/notifications/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

export const upload = {
  async uploadFile(file: File) {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload/`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: formData
    });
    return handleResponse(response);
  }
  ,
  async uploadPublicFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload/public/`, {
      method: 'POST',
      // intentionally do not send Authorization header for public uploads
      body: formData
    });
    return handleResponse(response);
  }
};

export const deceasedReports = {
  async getAll() {
    const response = await fetch(`${API_BASE_URL}/deceased_reports/`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async create(data: any) {
    const response = await fetch(`${API_BASE_URL}/deceased_reports/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  }
  ,
  async confirm(id: string) {
    const response = await fetch(`${API_BASE_URL}/deceased_reports/${id}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ confirmed: true })
    });
    return handleResponse(response);
  },
  async delete(id: string) {
    const response = await fetch(`${API_BASE_URL}/deceased_reports/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};
