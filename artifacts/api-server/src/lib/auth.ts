import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, sysUsersTable, warehousesTable } from "@workspace/db";

export type AuthUser = {
  id: number;
  username: string;
  role: "admin" | "user" | "auditor";
  assignedWarehouseId: number | null;
  assignedWarehouseName: string | null;
};

export async function loadUser(userId: number): Promise<AuthUser | null> {
  const [u] = await db
    .select()
    .from(sysUsersTable)
    .where(eq(sysUsersTable.id, userId));
  if (!u) return null;
  let warehouseName: string | null = null;
  if (u.assignedWarehouseId) {
    const [w] = await db
      .select()
      .from(warehousesTable)
      .where(eq(warehousesTable.id, u.assignedWarehouseId));
    warehouseName = w?.name ?? null;
  }
  return {
    id: u.id,
    username: u.username,
    role: u.role as AuthUser["role"],
    assignedWarehouseId: u.assignedWarehouseId ?? null,
    assignedWarehouseName: warehouseName,
  };
}

export async function getCurrentUser(req: Request): Promise<AuthUser | null> {
  if (!req.session?.userId) return null;
  return loadUser(req.session.userId);
}

export function requireAuth(roles?: AuthUser["role"][]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "غير مصرح" });
      return;
    }
    if (roles && !roles.includes(user.role)) {
      res.status(403).json({ error: "صلاحيات غير كافية" });
      return;
    }
    (req as Request & { user: AuthUser }).user = user;
    next();
  };
}

export function effectiveWarehouseId(
  user: AuthUser,
  requested: number | undefined,
): number | null {
  if (user.role === "user" && user.assignedWarehouseId) {
    return user.assignedWarehouseId;
  }
  return requested ?? null;
}

export async function addLog(
  action: string,
  detail: string,
  username: string,
): Promise<void> {
  const { logsTable } = await import("@workspace/db");
  await db.insert(logsTable).values({ action, detail, username });
}

export const RECORD_LIMIT = 999;

export async function getRecordCount(): Promise<number> {
  const { productsTable, movementsTable, invoicesTable } = await import("@workspace/db");
  const allP = await db.select().from(productsTable);
  const allM = await db.select().from(movementsTable);
  const allI = await db.select().from(invoicesTable);
  return allP.length + allM.length + allI.length;
}
