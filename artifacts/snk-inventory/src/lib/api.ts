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

