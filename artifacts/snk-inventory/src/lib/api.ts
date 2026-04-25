// Utility functions for formatting
export function fmtMoney(n: number, currency = "ج.م"): string {
  return `${(Number(n) || 0).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Export types for compatibility
export type Role = "admin" | "super_admin" | "user" | "editor";

export type AuthUser = {
  id: number;
  username: string;
  role: Role;
  permissions: string[];
  assignedWarehouseId: number | null;
  assignedWarehouseName: string | null;
  maxWarehouses: number;
  email?: string;
  avatar?: string;
};

export type Warehouse = { 
  id: number; 
  name: string; 
  productCount: number;
  admin_id?: number | null;
  admin?: {
    id: number;
    username: string;
  } | null;
  createdAt?: string;
};

export type Product = {
  id: number;
  name: string;
  code: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  warehouseId: number;
  warehouseName: string | null;
  createdAt: string;
};

export type Movement = {
  id: number;
  type: "in" | "out";
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  warehouseId: number;
  warehouseName: string | null;
  createdAt: string;
};

export type InvoiceItem = {
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
};

export type Invoice = {
  id: number;
  invoiceNumber: string;
  customerName: string;
  items: InvoiceItem[];
  total: number;
  status: string;
  warehouseId: number;
  warehouseName: string | null;
  createdAt: string;
};

export type LogEntry = {
  id: number;
  action: string;
  detail: string;
  username: string;
  createdAt: string;
};

export type DashboardStats = {
  totalProducts: number;
  totalQuantity: number;
  stockValue: number;
  lowStock: number;
  outOfStock: number;
  totalInvoices: number;
  totalSales: number;
  profit: number;
  todayIn: number;
  todayOut: number;
  recentMovements: Movement[];
  topProducts: Array<{
    productCode: string;
    productName: string;
    totalSold: number;
    revenue: number;
  }>;
  dailyMovements?: { date: string; in: number; out: number }[];
};

// Configure API base URL from environment variables
import { setBaseUrl } from "../../../../lib/api-client-react/src";
setBaseUrl(import.meta.env.VITE_API_BASE_URL);

// Export all API functions as a single 'api' object
import * as generatedApi from "../../../../lib/api-client-react/src/generated/api";

// Import customFetch from the correct location
import { customFetch } from "../../../../lib/api-client-react/src/custom-fetch";
import { ActivityLogItem } from "@/types/activity-log";

// Add missing update user method using same pattern as createUser
const updateUser = async (id: number, data: Partial<AuthUser>) => {
  return customFetch<AuthUser>(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

// Add missing delete user method using same pattern as createUser
const deleteUser = async (id: number) => {
  return customFetch<{ ok: true }>(`/api/users/${id}`, {
    method: 'DELETE',
  });
};

// Add update movement function using same pattern as createUser
const updateMovement = async (id: number, data: {
  type: "in" | "out";
  productCode: string;
  quantity: number;
  price: number;
}) => {
  return customFetch<Movement>(`/api/movements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

// Add settings functions - now using user-specific endpoints
const getSettings = async () => {
  return customFetch<Record<string, string>>('/api/user/settings', {
    method: 'GET',
  });
};

const updateSettings = async (settings: Record<string, string>) => {
  return customFetch<Record<string, string>>('/api/user/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
};

// Add activity logs function
const getLogs = async (limit: number = 50) => {
  return customFetch<ActivityLogItem[]>(`/api/logs?limit=${limit}`, {
    method: 'GET',
  });
};

export const api = {
  ...generatedApi,
  updateUser,
  deleteUser,
  updateMovement,
  getSettings,
  updateSettings,
  getLogs,
};

