import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  invoicesTable,
  movementsTable,
  productsTable,
  warehousesTable,
} from "@workspace/db";
import {
  addLog,
  effectiveWarehouseId,
  getRecordCount,
  RECORD_LIMIT,
  requireAuth,
  type AuthUser,
} from "../lib/auth";

const router: IRouter = Router();

type InvoiceItem = {
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
};

async function attachNames(rows: (typeof invoicesTable.$inferSelect)[]) {
  const ws = await db.select().from(warehousesTable);
  const map = new Map(ws.map((w) => [w.id, w.name]));
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    items: r.items as InvoiceItem[],
    warehouseName: map.get(r.warehouseId) ?? null,
  }));
}

router.get("/invoices", requireAuth(), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const wId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
  const eff = effectiveWarehouseId(user, wId);
  const conds = [];
  if (eff) conds.push(eq(invoicesTable.warehouseId, eff));
  const rows = await db
    .select()
    .from(invoicesTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(invoicesTable.createdAt));
  res.json(await attachNames(rows));
});

router.get("/invoices/:id", requireAuth(), async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const [row] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "غير موجود" });
    return;
  }
  const [enriched] = await attachNames([row]);
  res.json(enriched);
});

router.post(
  "/invoices",
  requireAuth(["admin", "user"]),
  async (req, res): Promise<void> => {
    const user = (req as unknown as { user: AuthUser }).user;
    const { customerName, items, warehouseId } = req.body ?? {};
    if (!customerName || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "العميل والأصناف مطلوبة" });
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

    // Validate stock + build full items
    const fullItems: InvoiceItem[] = [];
    let total = 0;
    for (const it of items) {
      const [product] = await db
        .select()
        .from(productsTable)
        .where(
          and(eq(productsTable.code, String(it.productCode)), eq(productsTable.warehouseId, wId)),
        );
      if (!product) {
        res.status(400).json({ error: `المنتج ${it.productCode} غير موجود` });
        return;
      }
      const qty = Number(it.quantity);
      if (qty <= 0 || product.quantity < qty) {
        res.status(400).json({ error: `الكمية المتاحة من ${product.name} غير كافية` });
        return;
      }
      const price = Number(it.price) || product.sellPrice;
      const lineTotal = qty * price;
      fullItems.push({
        productCode: product.code,
        productName: product.name,
        quantity: qty,
        price,
        total: lineTotal,
      });
      total += lineTotal;
    }

    // Deduct stock + write outgoing movements
    for (const it of fullItems) {
      const [product] = await db
        .select()
        .from(productsTable)
        .where(
          and(eq(productsTable.code, it.productCode), eq(productsTable.warehouseId, wId)),
        );
      if (!product) continue;
      await db
        .update(productsTable)
        .set({ quantity: product.quantity - it.quantity })
        .where(eq(productsTable.id, product.id));
      await db.insert(movementsTable).values({
        type: "out",
        productCode: it.productCode,
        productName: it.productName,
        quantity: it.quantity,
        price: it.price,
        total: it.total,
        warehouseId: wId,
      });
    }

    const number = `INV-${Date.now().toString().slice(-8)}`;
    const [row] = await db
      .insert(invoicesTable)
      .values({
        invoiceNumber: number,
        customerName,
        items: fullItems,
        total,
        status: "paid",
        warehouseId: wId,
      })
      .returning();
    await addLog("إنشاء فاتورة", `${number} - ${customerName}`, user.username);
    const [enriched] = await attachNames([row]);
    res.json(enriched);
  },
);

router.delete(
  "/invoices/:id",
  requireAuth(["admin", "user"]),
  async (req, res): Promise<void> => {
    const user = (req as unknown as { user: AuthUser }).user;
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const [row] = await db.delete(invoicesTable).where(eq(invoicesTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "غير موجود" });
      return;
    }
    await addLog("حذف فاتورة", `${row.invoiceNumber}`, user.username);
    res.json({ ok: true });
  },
);

export default router;
