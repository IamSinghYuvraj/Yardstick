export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Member';
  tenantId: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  color: string;
  plan: 'Free' | 'Pro';
  maxNotes: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  userId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface NotesResponse {
  success: boolean;
  notes?: Note[];
  error?: string;
}

// Mock data for demo - Replace with actual API calls in production
export const TENANTS: Tenant[] = [
  { id: '1', name: 'Acme Corporation', slug: 'acme', color: '#3B82F6', plan: 'Free', maxNotes: 3 },
  { id: '2', name: 'Globex Corporation', slug: 'globex', color: '#10B981', plan: 'Pro', maxNotes: -1 }
];

export const MOCK_USERS: User[] = [
  { id: '1', email: 'admin@acme.test', name: 'John Admin', role: 'Admin', tenantId: '1' },
  { id: '2', email: 'user@acme.test', name: 'Jane Member', role: 'Member', tenantId: '1' },
  { id: '3', email: 'admin@globex.test', name: 'Bob Admin', role: 'Admin', tenantId: '2' },
  { id: '4', email: 'user@globex.test', name: 'Alice Member', role: 'Member', tenantId: '2' }
];

export class AuthService {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly USER_KEY = 'auth_user';

  static async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (data.success && data.token && data.user) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.TOKEN_KEY, data.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
        }
      }

      return data;
    } catch (error) {
      return { success: false, error: 'Network error occurred' };
    }
  }

  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    try {
      const user = localStorage.getItem(this.USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  static isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  static getTenantById(tenantId: string): Tenant | null {
    return TENANTS.find(t => t.id === tenantId) || null;
  }

  static getTenantBySlug(slug: string): Tenant | null {
    return TENANTS.find(t => t.slug === slug) || null;
  }
}

export class NotesService {
  static async getNotes(): Promise<NotesResponse> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch('/api/notes', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to fetch notes' };
    }
  }

  static async createNote(title: string, content: string): Promise<{ success: boolean; note?: Note; error?: string }> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content }),
      });

      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to create note' };
    }
  }

  static async deleteNote(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to delete note' };
    }
  }

  static async upgradeTenant(slug: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        return { success: false, error: 'No authentication token' };
      }

      const response = await fetch(`/api/tenants/${slug}/upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return { success: false, error: 'Failed to upgrade tenant' };
    }
  }
}