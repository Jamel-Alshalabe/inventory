import * as apiMethods from "../../lib/old_lib/api-client-react/src/generated/api";
import type { Dashboard, Product, Warehouse, SysUser, SysUserRole, Invoice } from "../../lib/old_lib/api-client-react/src/generated/api.schemas";

export const api = {
  ...apiMethods,
};

export const fmtDate = (date: string) => {
  if (!date) return "";
  return new Date(date).toLocaleString("ar-EG", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const fmtMoney = (amount: number, currency: string = "EGP") => {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: currency === "ج.م" ? "EGP" : currency,
  }).format(amount);
};

export type AuthUser = SysUser;
export type Role = SysUserRole;
export type { Warehouse, Product, Dashboard as DashboardStats, Invoice };
