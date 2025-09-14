// API Client for backend integration
// This file provides a template for implementing actual API calls

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Health Check
  async health() {
    return this.request('/health');
  }

  // Notes CRUD Operations
  async getNotes(page = 1, limit = 10) {
    return this.request<PaginatedResponse<any>>(`/notes?page=${page}&limit=${limit}`);
  }

  async getNote(id: string) {
    return this.request(`/notes/${id}`);
  }

  async createNote(data: { title: string; content: string }) {
    return this.request('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNote(id: string, data: { title: string; content: string }) {
    return this.request(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNote(id: string) {
    return this.request(`/notes/${id}`, {
      method: 'DELETE',
    });
  }

  // Tenant Management
  async upgradeTenant(slug: string) {
    return this.request(`/tenants/${slug}/upgrade`, {
      method: 'POST',
    });
  }

  // User Management (Admin only)
  async inviteUser(data: { email: string; role: string }) {
    return this.request('/users/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUsers(page = 1, limit = 10) {
    return this.request<PaginatedResponse<any>>(`/users?page=${page}&limit=${limit}`);
  }

  async updateUser(id: string, data: { name?: string; role?: string }) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;