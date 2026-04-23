// Authentication Service for Laravel Sanctum
import { api } from './api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: 'admin' | 'user' | 'auditor';
    assignedWarehouseId: number | null;
    assignedWarehouseName: string | null;
  };
}

export class AuthService {
  private static instance: AuthService;
  private token: string | null = null;

  private constructor() {
    this.loadToken();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private loadToken(): void {
    this.token = localStorage.getItem('auth_token');
  }

  private saveToken(token: string): void {
    localStorage.setItem('auth_token', token);
    this.token = token;
  }

  private removeToken(): void {
    localStorage.removeItem('auth_token');
    this.token = null;
  }

  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.login(credentials);
      this.saveToken(response.token);
      return response;
    } catch (error) {
      this.removeToken();
      throw error;
    }
  }

  public async logout(): Promise<void> {
    try {
      await api.logout();
    } finally {
      this.removeToken();
    }
  }

  public async getCurrentUser() {
    try {
      return await api.getMe();
    } catch (error) {
      this.removeToken();
      throw error;
    }
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  public getToken(): string | null {
    return this.token;
  }

  public async refreshToken(): Promise<void> {
    try {
      await this.getCurrentUser();
    } catch (error) {
      this.removeToken();
      throw error;
    }
  }
}

export const authService = AuthService.getInstance();
