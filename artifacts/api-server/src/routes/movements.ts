import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, movementsTable, productsTable, warehousesTable } from "@workspace/db";
import {
  addLog,
  effectiveWarehouseId,
  getRecordCount,
  RECORD_LIMIT,
  requireAuth,
  type AuthUser,
} from "../lib/auth";

const router: IRouter = Router();

async function attachNames(rows: (typeof movementsTable.$inferSelect)[]) {
  const ws = await db.select().from(warehousesTable);
  const map = new Map(ws.map((w) => [w.id, w.name]));
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    warehouseName: map.get(r.warehouseId) ?? null,
  }));
}

router.get("/movements", requireAuth(), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const wId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
  const eff = effectiveWarehouseId(user, wId);
  const type = req.query.type as string | undefined;
  const productCode = req.query.productCode as string | undefined;
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const conds = [];
  if (eff) conds.push(eq(movementsTable.warehouseId, eff));
  if (type && type !== "all") conds.push(eq(movementsTable.type, type));
  if (productCode) conds.push(eq(movementsTable.productCode, productCode));
  if (from) conds.push(gte(movementsTable.createdAt, from));
  if (to) conds.push(lte(movementsTable.createdAt, to));

  let q = db
    .select()
    .from(movementsTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(movementsTable.createdAt))
    .$dynamic();
  if (limit) q = q.limit(limit);
  const rows = await q;
  res.json(await attachNames(rows));
});

router.post(
  "/movements",
  requireAuth(["admin", "user"]),
  async (req, res): Promise<void> => {
    const user = (req as unknown as { user: AuthUser }).user;
    const { type, productCode, quantity, price, warehouseId } = req.body ?? {};
    if (!["in", "out"].includes(type)) {
      res.status(400).json({ error: "نوع الحركة غير صالح" });
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
    const [product] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.code, productCode), eq(productsTable.warehouseId, wId)));
    if (!product) {
      res.status(404).json({ error: "المنتج غير موجود في هذا المخزن" });
      return;
    }
    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      res.status(400).json({ error: "الكمية يجب أن تكون أكبر من صفر" });
      return;
    }
    if (type === "out" && product.quantity < qty) {
      res.status(400).json({ error: "الكمية المتاحة غير كافية" });
      return;
    }
    const newQty = type === "in" ? product.quantity + qty : product.quantity - qty;
    await db
      .update(productsTable)
      .set({ quantity: newQty })
      .where(eq(productsTable.id, product.id));
    const total = qty * (Number(price) || 0);
    const [row] = await db
      .insert(movementsTable)
      .values({
        type,
        productCode,
        productName: product.name,
        quantity: qty,
        price: Number(price) || 0,
        total,
        warehouseId: wId,
      })
      .returning();
    await addLog(
      type === "in" ? "وارد" : "صادر",
      `${qty} × ${product.name}`,
      user.username,
    );
    const [enriched] = await attachNames([row]);
    res.json(enriched);
  },
);

router.delete(
  "/movements/:id",
  requireAuth(["admin", "user"]),
  async (req, res): Promise<void> => {
    const user = (req as unknown as { user: AuthUser }).user;
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const [m] = await db.select().from(movementsTable).where(eq(movementsTable.id, id));
    if (!m) {
      res.status(404).json({ error: "غير موجود" });
      return;
    }
    // Reverse the quantity
    const [product] = await db
      .select()
      .from(productsTable)
      .where(
        and(eq(productsTable.code, m.productCode), eq(productsTable.warehouseId, m.warehouseId)),
      );
    if (product) {
      const adj = m.type === "in" ? -m.quantity : m.quantity;
      await db
        .update(productsTable)
        .set({ quantity: product.quantity + adj })
        .where(eq(productsTable.id, product.id));
    }
    await db.delete(movementsTable).where(eq(movementsTable.id, id));
    await addLog("حذف حركة", `${m.productName}`, user.username);
    res.json({ ok: true });
  },
);

export default router;
