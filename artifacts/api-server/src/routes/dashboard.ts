import { Router, type IRouter } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, invoicesTable, movementsTable, productsTable } from "@workspace/db";
import { effectiveWarehouseId, requireAuth, type AuthUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard", requireAuth(), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const wId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
  const eff = effectiveWarehouseId(user, wId);

  const pCond = eff ? eq(productsTable.warehouseId, eff) : undefined;
  const mCond = eff ? eq(movementsTable.warehouseId, eff) : undefined;
  const iCond = eff ? eq(invoicesTable.warehouseId, eff) : undefined;

  const products = await db.select().from(productsTable).where(pCond);
  const totalProducts = products.length;
  const totalQuantity = products.reduce((s, p) => s + p.quantity, 0);
  const stockValue = products.reduce((s, p) => s + p.quantity * p.sellPrice, 0);
  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= 5).length;
  const outOfStock = products.filter((p) => p.quantity === 0).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayInQ = await db
    .select({ s: sql<number>`coalesce(sum(${movementsTable.total}),0)::float` })
    .from(movementsTable)
    .where(
      and(
        eq(movementsTable.type, "in"),
        gte(movementsTable.createdAt, today),
        ...(mCond ? [mCond] : []),
      ),
    );
  const todayOutQ = await db
    .select({ s: sql<number>`coalesce(sum(${movementsTable.total}),0)::float` })
    .from(movementsTable)
    .where(
      and(
        eq(movementsTable.type, "out"),
        gte(movementsTable.createdAt, today),
        ...(mCond ? [mCond] : []),
      ),
    );

  const invoicesAll = await db.select().from(invoicesTable).where(iCond);
  const totalInvoices = invoicesAll.length;
  const totalSales = invoicesAll.reduce((s, i) => s + Number(i.total), 0);

  const recentMovements = await db
    .select()
    .from(movementsTable)
    .where(mCond)
    .orderBy(desc(movementsTable.createdAt))
    .limit(8);

  // Top products by total out volume
  const topRows = await db
    .select({
      productCode: movementsTable.productCode,
      productName: movementsTable.productName,
      qty: sql<number>`sum(${movementsTable.quantity})::int`,
    })
    .from(movementsTable)
    .where(and(eq(movementsTable.type, "out"), ...(mCond ? [mCond] : [])))
    .groupBy(movementsTable.productCode, movementsTable.productName)
    .orderBy(desc(sql`sum(${movementsTable.quantity})`))
    .limit(5);

  res.json({
    totalProducts,
    totalQuantity,
    stockValue,
    lowStock,
    outOfStock,
    totalInvoices,
    totalSales,
    todayIn: Number(todayInQ[0]?.s ?? 0),
    todayOut: Number(todayOutQ[0]?.s ?? 0),
    recentMovements: recentMovements.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
    topProducts: topRows.map((t) => ({
      productCode: t.productCode,
      productName: t.productName,
      quantity: Number(t.qty),
    })),
  });
});

export default router;
