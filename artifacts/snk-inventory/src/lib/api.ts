const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      // If response is not JSON, throw a more descriptive error
      throw new Error(`API returned non-JSON response: ${text.substring(0, 100)}...`);
    }
  }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, b?: unknown) => request<T>("POST", p, b),
  put: <T>(p: string, b?: unknown) => request<T>("PUT", p, b),
  del: <T>(p: string) => request<T>("DELETE", p),
};

export type Role = "admin" | "user" | "auditor";

export type AuthUser = {
  id: number;
  username: string;
  role: Role;
  assignedWarehouseId: number | null;
  assignedWarehouseName: string | null;
  email?: string;
  avatar?: string;
};

export type Warehouse = { id: number; name: string; productCount: number };

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
  todayIn: number;
  todayOut: number;
  recentMovements: Movement[];
  topProducts: { productCode: string; productName: string; quantity: number }[];
  dailyMovements?: { date: string; in: number; out: number }[];
};

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
