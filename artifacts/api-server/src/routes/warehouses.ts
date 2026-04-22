import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, productsTable, warehousesTable } from "@workspace/db";
import { addLog, requireAuth, type AuthUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/warehouses", requireAuth(), async (_req, res): Promise<void> => {
  const ws = await db.select().from(warehousesTable).orderBy(warehousesTable.id);
  const counts = await db
    .select({ wid: productsTable.warehouseId, c: sql<number>`count(*)::int` })
    .from(productsTable)
    .groupBy(productsTable.warehouseId);
  const map = new Map(counts.map((c) => [c.wid, Number(c.c)]));
  res.json(ws.map((w) => ({ id: w.id, name: w.name, productCount: map.get(w.id) ?? 0 })));
});

router.post("/warehouses", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const { name } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "الاسم مطلوب" });
    return;
  }
  const [row] = await db.insert(warehousesTable).values({ name }).returning();
  await addLog("إضافة مخزن", `${name}`, user.username);
  res.json({ id: row.id, name: row.name, productCount: 0 });
});

router.delete("/warehouses/:id", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const [row] = await db.delete(warehousesTable).where(eq(warehousesTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "غير موجود" });
    return;
  }
  await addLog("حذف مخزن", `${row.name}`, user.username);
  res.json({ ok: true });
});

export default router;
