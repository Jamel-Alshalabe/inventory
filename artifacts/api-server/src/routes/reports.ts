import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, invoicesTable, movementsTable, productsTable } from "@workspace/db";
import { effectiveWarehouseId, requireAuth, type AuthUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/reports/sales", requireAuth(), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const wId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
  const eff = effectiveWarehouseId(user, wId);
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const conds = [eq(movementsTable.type, "out")];
  if (eff) conds.push(eq(movementsTable.warehouseId, eff));
  if (from) conds.push(gte(movementsTable.createdAt, from));
  if (to) conds.push(lte(movementsTable.createdAt, to));

  const rows = await db
    .select()
    .from(movementsTable)
    .where(and(...conds))
    .orderBy(desc(movementsTable.createdAt));

  const totalRevenue = rows.reduce((s, r) => s + Number(r.total), 0);
  const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);

  // Group by day
  const byDayMap = new Map<string, { revenue: number; quantity: number }>();
  for (const r of rows) {
    const d = r.createdAt.toISOString().slice(0, 10);
    const cur = byDayMap.get(d) ?? { revenue: 0, quantity: 0 };
    cur.revenue += Number(r.total);
    cur.quantity += r.quantity;
    byDayMap.set(d, cur);
  }
  const byDay = Array.from(byDayMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    totalRevenue,
    totalQuantity,
    totalTransactions: rows.length,
    byDay,
    items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  });
});

router.get("/reports/stock", requireAuth(), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const wId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
  const eff = effectiveWarehouseId(user, wId);
  const cond = eff ? eq(productsTable.warehouseId, eff) : undefined;
  const products = await db.select().from(productsTable).where(cond);
  const totalValue = products.reduce((s, p) => s + p.quantity * p.sellPrice, 0);
  const totalCost = products.reduce((s, p) => s + p.quantity * p.buyPrice, 0);
  res.json({
    totalProducts: products.length,
    totalValue,
    totalCost,
    estimatedProfit: totalValue - totalCost,
    items: products.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      stockValue: p.quantity * p.sellPrice,
    })),
  });
});

router.get("/reports/profit", requireAuth(), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const wId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
  const eff = effectiveWarehouseId(user, wId);
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const conds = [eq(movementsTable.type, "out")];
  if (eff) conds.push(eq(movementsTable.warehouseId, eff));
  if (from) conds.push(gte(movementsTable.createdAt, from));
  if (to) conds.push(lte(movementsTable.createdAt, to));

  const rows = await db.select().from(movementsTable).where(and(...conds));

  // Resolve buy prices from products
  const productConds = eff ? eq(productsTable.warehouseId, eff) : undefined;
  const products = await db.select().from(productsTable).where(productConds);
  const buyMap = new Map(products.map((p) => [`${p.code}|${p.warehouseId}`, p.buyPrice]));

  let revenue = 0;
  let cost = 0;
  const items = rows.map((r) => {
    const buy = buyMap.get(`${r.productCode}|${r.warehouseId}`) ?? 0;
    const itemCost = buy * r.quantity;
    revenue += Number(r.total);
    cost += itemCost;
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      buyPrice: buy,
      cost: itemCost,
      profit: Number(r.total) - itemCost,
    };
  });

  res.json({
    revenue,
    cost,
    profit: revenue - cost,
    margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
    items,
  });
});

router.get("/reports/movements", requireAuth(), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const wId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
  const eff = effectiveWarehouseId(user, wId);
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const conds = [];
  if (eff) conds.push(eq(movementsTable.warehouseId, eff));
  if (from) conds.push(gte(movementsTable.createdAt, from));
  if (to) conds.push(lte(movementsTable.createdAt, to));

  const rows = await db
    .select()
    .from(movementsTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(movementsTable.createdAt));

  const totalIn = rows.filter((r) => r.type === "in").reduce((s, r) => s + r.quantity, 0);
  const totalOut = rows.filter((r) => r.type === "out").reduce((s, r) => s + r.quantity, 0);

  res.json({
    totalIn,
    totalOut,
    totalTransactions: rows.length,
    items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  });
});

router.get("/reports/invoices", requireAuth(), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const wId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
  const eff = effectiveWarehouseId(user, wId);
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const conds = [];
  if (eff) conds.push(eq(invoicesTable.warehouseId, eff));
  if (from) conds.push(gte(invoicesTable.createdAt, from));
  if (to) conds.push(lte(invoicesTable.createdAt, to));

  const rows = await db
    .select()
    .from(invoicesTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(invoicesTable.createdAt));

  const totalSales = rows.reduce((s, r) => s + Number(r.total), 0);
  res.json({
    totalInvoices: rows.length,
    totalSales,
    items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  });
});

export default router;
