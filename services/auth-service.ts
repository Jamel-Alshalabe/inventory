// Authentication Service for Laravel Sanctum
import { api } from './api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token?: string;
  user: {
    id: number;
    username: string;
    role: 'admin' | 'user' | 'editor';
    assignedWarehouseId: number | null;
    assignedWarehouseName: string | null;
  };
}

export class AuthService {
  private static instance: AuthService;
  private token: string | null = null;
  private static readonly TOKEN_KEYS = ["snk:token", "auth_token"] as const;

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
    this.token =
      localStorage.getItem(AuthService.TOKEN_KEYS[0]) ??
      localStorage.getItem(AuthService.TOKEN_KEYS[1]);
  }

  private saveToken(token: string): void {
    for (const key of AuthService.TOKEN_KEYS) {
      localStorage.setItem(key, token);
    }
    this.token = token;
  }

  private removeToken(): void {
    for (const key of AuthService.TOKEN_KEYS) {
      localStorage.removeItem(key);
    }
    this.token = null;
  }

  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.login(credentials);
      const token = (response as AuthResponse).token;
      if (token) {
        this.saveToken(token);
      }
      return response as AuthResponse;
    } catch (error) {
      // Don't remove token on login failure, it might be valid
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
      // Only remove token on explicit authentication errors (401) with no session preservation
      if (error && typeof error === 'object' && 'status' in error && (error as any).status === 401) {
        // Check if we have a valid token before removing it
        if (!this.token) {
          this.removeToken();
        } else {
        }
      }
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
      // Only remove token on explicit authentication errors (401) with no session preservation
      if (error && typeof error === 'object' && 'status' in error && (error as any).status === 401) {
        // Check if we have a valid token before removing it
        if (!this.token) {
          this.removeToken();
        } else {
        }
      }
      throw error;
    }
  }
}

export const authService = AuthService.getInstance();
