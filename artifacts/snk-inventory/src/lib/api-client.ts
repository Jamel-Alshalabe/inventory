// Professional API Client for Laravel Backend with Sanctum Authentication
import type { 
  AuthUser, 
  Warehouse, 
  Product, 
  Movement, 
  Invoice, 
  InvoiceItem, 
  LogEntry, 
  DashboardStats 
} from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage(): void {
    this.token = localStorage.getItem('auth_token');
  }

  private saveTokenToStorage(token: string): void {
    localStorage.setItem('auth_token', token);
    this.token = token;
  }

  private removeTokenFromStorage(): void {
    localStorage.removeItem('auth_token');
    this.token = null;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
      ...options,
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized - token expired
      if (response.status === 401) {
        this.removeTokenFromStorage();
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }

      const responseData = await response.json();

      if (!response.ok) {
        const message = responseData.message || responseData.error || `HTTP ${response.status}`;
        throw new Error(message);
      }

      return responseData;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // Authentication Methods
  async login(credentials: { username: string; password: string }): Promise<{ token: string; user: AuthUser }> {
    const response = await this.request<{ token: string; user: AuthUser }>('POST', '/auth/login', credentials);
    this.saveTokenToStorage(response.token);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('POST', '/auth/logout');
    } finally {
      this.removeTokenFromStorage();
    }
  }

  async getCurrentUser(): Promise<AuthUser> {
    return this.request('GET', '/auth/me');
  }

  // Dashboard
  async getDashboardStats(warehouseId?: number): Promise<DashboardStats> {
    const query = warehouseId ? `?warehouse_id=${warehouseId}` : '';
    return this.request('GET', `/dashboard${query}`);
  }

  // Products
  async getProducts(warehouseId?: number): Promise<Product[]> {
    const query = warehouseId ? `?warehouse_id=${warehouseId}` : '';
    return this.request('GET', `/products${query}`);
  }

  async getProduct(id: number): Promise<Product> {
    return this.request('GET', `/products/${id}`);
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    return this.request('POST', '/products', product);
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    return this.request('PATCH', `/products/${id}`, product);
  }

  async deleteProduct(id: number): Promise<void> {
    return this.request('DELETE', `/products/${id}`);
  }

  async bulkCreateProducts(products: Partial<Product>[]): Promise<Product[]> {
    return this.request('POST', '/products/bulk', { products });
  }

  // Movements
  async getMovements(warehouseId?: number): Promise<Movement[]> {
    const query = warehouseId ? `?warehouse_id=${warehouseId}` : '';
    return this.request('GET', `/movements${query}`);
  }

  async createMovement(movement: Partial<Movement>): Promise<Movement> {
    return this.request('POST', '/movements', movement);
  }

  async deleteMovement(id: number): Promise<void> {
    return this.request('DELETE', `/movements/${id}`);
  }

  // Invoices
  async getInvoices(warehouseId?: number): Promise<Invoice[]> {
    const query = warehouseId ? `?warehouse_id=${warehouseId}` : '';
    return this.request('GET', `/invoices${query}`);
  }

  async getInvoice(id: number): Promise<Invoice> {
    return this.request('GET', `/invoices/${id}`);
  }

  async createInvoice(invoice: {
    customerName: string;
    items: InvoiceItem[];
    warehouseId?: number;
  }): Promise<Invoice> {
    return this.request('POST', '/invoices', invoice);
  }

  async deleteInvoice(id: number): Promise<void> {
    return this.request('DELETE', `/invoices/${id}`);
  }

  // Warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    return this.request('GET', '/warehouses');
  }

  async createWarehouse(warehouse: Partial<Warehouse>): Promise<Warehouse> {
    return this.request('POST', '/warehouses', warehouse);
  }

  async updateWarehouse(id: number, warehouse: Partial<Warehouse>): Promise<Warehouse> {
    return this.request('PATCH', `/warehouses/${id}`, warehouse);
  }

  async deleteWarehouse(id: number): Promise<void> {
    return this.request('DELETE', `/warehouses/${id}`);
  }

  // Users (Admin only)
  async getUsers(): Promise<AuthUser[]> {
    return this.request('GET', '/users');
  }

  async createUser(user: Partial<AuthUser> & { password: string }): Promise<AuthUser> {
    return this.request('POST', '/users', user);
  }

  async updateUser(id: number, user: Partial<AuthUser>): Promise<AuthUser> {
    return this.request('PATCH', `/users/${id}`, user);
  }

  async deleteUser(id: number): Promise<void> {
    return this.request('DELETE', `/users/${id}`);
  }

  // Settings
  async getSettings(): Promise<any> {
    return this.request('GET', '/settings');
  }

  async updateSettings(settings: any): Promise<any> {
    return this.request('PATCH', '/settings', settings);
  }

  // Account
  async updateUsername(username: string): Promise<void> {
    return this.request('PATCH', '/account/username', { username });
  }

  async updatePassword(passwords: { current_password: string; password: string; password_confirmation: string }): Promise<void> {
    return this.request('PATCH', '/account/password', passwords);
  }

  // Reports
  async getSalesReport(params?: { start_date?: string; end_date?: string; warehouse_id?: number }): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return this.request('GET', `/reports/sales${query ? '?' + query : ''}`);
  }

  async getStockReport(params?: { warehouse_id?: number }): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return this.request('GET', `/reports/stock${query ? '?' + query : ''}`);
  }

  async getProfitReport(params?: { start_date?: string; end_date?: string; warehouse_id?: number }): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return this.request('GET', `/reports/profit${query ? '?' + query : ''}`);
  }

  async getMovementsReport(params?: { start_date?: string; end_date?: string; warehouse_id?: number }): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return this.request('GET', `/reports/movements${query ? '?' + query : ''}`);
  }

  async getInvoicesReport(params?: { start_date?: string; end_date?: string; warehouse_id?: number }): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return this.request('GET', `/reports/invoices${query ? '?' + query : ''}`);
  }

  // Activity Logs (Admin only)
  async getActivityLogs(): Promise<LogEntry[]> {
    return this.request('GET', '/logs');
  }

  async clearActivityLogs(): Promise<void> {
    return this.request('DELETE', '/logs');
  }

  // Utility method to check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Utility method to get current token
  getToken(): string | null {
    return this.token;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export types for convenience
export type {
  AuthUser,
  Warehouse,
  Product,
  Movement,
  Invoice,
  InvoiceItem,
  LogEntry,
  DashboardStats
};

// Export utility functions
export { fmtMoney, fmtDate } from './api';
