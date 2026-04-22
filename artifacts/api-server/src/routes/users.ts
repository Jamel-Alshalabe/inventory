import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sysUsersTable, warehousesTable } from "@workspace/db";
import { addLog, requireAuth, type AuthUser } from "../lib/auth";
import { hashPassword } from "../lib/session";

const router: IRouter = Router();

router.get("/users", requireAuth(["admin"]), async (_req, res): Promise<void> => {
  const us = await db.select().from(sysUsersTable).orderBy(sysUsersTable.id);
  const ws = await db.select().from(warehousesTable);
  const map = new Map(ws.map((w) => [w.id, w.name]));
  res.json(
    us.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      assignedWarehouseId: u.assignedWarehouseId ?? null,
      assignedWarehouseName: u.assignedWarehouseId ? map.get(u.assignedWarehouseId) ?? null : null,
    })),
  );
});

router.post("/users", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const actor = (req as unknown as { user: AuthUser }).user;
  const { username, password, role, assignedWarehouseId } = req.body ?? {};
  if (!username || !password || !["admin", "user", "auditor"].includes(role)) {
    res.status(400).json({ error: "بيانات غير صالحة" });
    return;
  }
  const [exists] = await db
    .select()
    .from(sysUsersTable)
    .where(eq(sysUsersTable.username, username));
  if (exists) {
    res.status(409).json({ error: "اسم المستخدم موجود مسبقاً" });
    return;
  }
  const [row] = await db
    .insert(sysUsersTable)
    .values({
      username,
      passwordHash: hashPassword(password),
      role,
      assignedWarehouseId: assignedWarehouseId ?? null,
    })
    .returning();
  await addLog("إضافة مستخدم", `${username} (${role})`, actor.username);
  res.json({
    id: row.id,
    username: row.username,
    role: row.role,
    assignedWarehouseId: row.assignedWarehouseId ?? null,
    assignedWarehouseName: null,
  });
});

router.delete("/users/:id", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const actor = (req as unknown as { user: AuthUser }).user;
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (id === actor.id) {
    res.status(400).json({ error: "لا يمكن حذف حسابك الحالي" });
    return;
  }
  const [row] = await db.delete(sysUsersTable).where(eq(sysUsersTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "غير موجود" });
    return;
  }
  await addLog("حذف مستخدم", `${row.username}`, actor.username);
  res.json({ ok: true });
});

export default router;
