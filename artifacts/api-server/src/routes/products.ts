import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db, productsTable, warehousesTable } from "@workspace/db";
import {
  addLog,
  effectiveWarehouseId,
  getRecordCount,
  RECORD_LIMIT,
  requireAuth,
  type AuthUser,
} from "../lib/auth";

const router: IRouter = Router();

async function attachWarehouseNames(rows: (typeof productsTable.$inferSelect)[]) {
  const ws = await db.select().from(warehousesTable);
  const map = new Map(ws.map((w) => [w.id, w.name]));
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    warehouseName: map.get(r.warehouseId) ?? null,
  }));
}

router.get("/products", requireAuth(), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const wRaw = req.query.warehouseId;
  const wId = wRaw ? Number(wRaw) : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const eff = effectiveWarehouseId(user, wId);

  const conditions = [];
  if (eff) conditions.push(eq(productsTable.warehouseId, eff));
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    conditions.push(or(ilike(productsTable.name, s), ilike(productsTable.code, s))!);
  }

  const rows = await db
    .select()
    .from(productsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(productsTable.createdAt));
  res.json(await attachWarehouseNames(rows));
});

router.post("/products", requireAuth(["admin", "user"]), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const { name, code, buyPrice, sellPrice, quantity, warehouseId } = req.body ?? {};
  if (!name || !code) {
    res.status(400).json({ error: "الاسم والكود مطلوبان" });
    return;
  }
  const wId = effectiveWarehouseId(user, warehouseId) ?? warehouseId;
  if (!wId) {
    res.status(400).json({ error: "المخزن مطلوب" });
    return;
  }
  if ((await getRecordCount()) >= RECORD_LIMIT) {
    res.status(400).json({ error: "تم الوصول للحد الأقصى من السجلات" });
    return;
  }
  // Duplicate (code+warehouse) prevention
  const [dup] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.code, code), eq(productsTable.warehouseId, wId)));
  if (dup) {
    res.status(409).json({ error: "كود المنتج موجود مسبقاً في هذا المخزن" });
    return;
  }
  const [row] = await db
    .insert(productsTable)
    .values({
      name,
      code,
      buyPrice: Number(buyPrice) || 0,
      sellPrice: Number(sellPrice) || 0,
      quantity: Number(quantity) || 0,
      warehouseId: wId,
    })
    .returning();
  await addLog("إضافة منتج", `${name}`, user.username);
  const [enriched] = await attachWarehouseNames([row]);
  res.json(enriched);
});

router.post("/products/bulk", requireAuth(["admin", "user"]), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const { products, warehouseId } = req.body ?? {};
  if (!Array.isArray(products)) {
    res.status(400).json({ error: "قائمة المنتجات مطلوبة" });
    return;
  }
  let created = 0;
  let skipped = 0;
  for (const p of products) {
    const wId = effectiveWarehouseId(user, p.warehouseId ?? warehouseId) ?? warehouseId;
    if (!wId) {
      skipped++;
      continue;
    }
    if ((await getRecordCount()) >= RECORD_LIMIT) break;
    const [dup] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.code, String(p.code)), eq(productsTable.warehouseId, wId)));
    if (dup) {
      skipped++;
      continue;
    }
    await db.insert(productsTable).values({
      name: String(p.name),
      code: String(p.code),
      buyPrice: Number(p.buyPrice) || 0,
      sellPrice: Number(p.sellPrice) || 0,
      quantity: Number(p.quantity) || 0,
      warehouseId: wId,
    });
    created++;
  }
  await addLog("استيراد منتجات", `أُضيف ${created}، تم تخطي ${skipped}`, user.username);
  res.json({ created, skipped });
});

router.put("/products/:id", requireAuth(["admin", "user"]), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (!id) {
    res.status(400).json({ error: "معرف غير صالح" });
    return;
  }
  const body = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.code !== undefined) updates.code = body.code;
  if (body.buyPrice !== undefined) updates.buyPrice = Number(body.buyPrice);
  if (body.sellPrice !== undefined) updates.sellPrice = Number(body.sellPrice);
  if (body.quantity !== undefined) updates.quantity = Number(body.quantity);
  const [row] = await db
    .update(productsTable)
    .set(updates)
    .where(eq(productsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "غير موجود" });
    return;
  }
  await addLog("تعديل منتج", `${row.name}`, user.username);
  const [enriched] = await attachWarehouseNames([row]);
  res.json(enriched);
});

router.delete(
  "/products/:id",
  requireAuth(["admin", "user"]),
  async (req, res): Promise<void> => {
    const user = (req as unknown as { user: AuthUser }).user;
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const [row] = await db
      .delete(productsTable)
      .where(eq(productsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "غير موجود" });
      return;
    }
    await addLog("حذف منتج", `${row.name}`, user.username);
    res.json({ ok: true });
  },
);

export default router;
