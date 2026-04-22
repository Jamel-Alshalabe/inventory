import { db, sysUsersTable, warehousesTable, settingsTable, productsTable } from "@workspace/db";
import { hashPassword } from "./lib/session";

export async function ensureSeed(): Promise<void> {
  const existingUsers = await db.select().from(sysUsersTable);
  if (existingUsers.length > 0) return;

  const [w1] = await db.insert(warehousesTable).values({ name: "المخزن الرئيسي" }).returning();
  await db.insert(warehousesTable).values({ name: "مخزن قطع الغيار" });

  await db.insert(sysUsersTable).values([
    {
      username: "admin",
      passwordHash: hashPassword("admin123"),
      role: "admin",
      assignedWarehouseId: null,
    },
    {
      username: "user",
      passwordHash: hashPassword("user123"),
      role: "user",
      assignedWarehouseId: w1.id,
    },
    {
      username: "auditor",
      passwordHash: hashPassword("auditor123"),
      role: "auditor",
      assignedWarehouseId: null,
    },
  ]);

  await db.insert(settingsTable).values([
    { key: "companyName", value: "شركة سنك لقطع غيار السيارات" },
    { key: "companyPhone", value: "+20 100 000 0000" },
    { key: "companyAddress", value: "القاهرة، مصر" },
    { key: "currency", value: "ج.م" },
  ]);

  await db.insert(productsTable).values([
    { name: "فلتر زيت تويوتا", code: "TY-OIL-001", buyPrice: 80, sellPrice: 120, quantity: 45, warehouseId: w1.id },
    { name: "فلتر هواء هيونداي", code: "HY-AIR-002", buyPrice: 60, sellPrice: 95, quantity: 32, warehouseId: w1.id },
    { name: "بوجيهات NGK", code: "NGK-SP-003", buyPrice: 45, sellPrice: 75, quantity: 120, warehouseId: w1.id },
    { name: "زيت محرك موبيل 5W30", code: "MOB-5W30", buyPrice: 350, sellPrice: 480, quantity: 24, warehouseId: w1.id },
    { name: "تيل فرامل أمامي", code: "BRK-FRT-005", buyPrice: 180, sellPrice: 260, quantity: 18, warehouseId: w1.id },
    { name: "بطارية 70 أمبير", code: "BAT-70A", buyPrice: 1400, sellPrice: 1800, quantity: 8, warehouseId: w1.id },
    { name: "كاوتش ميشلان 195/65", code: "MICH-195", buyPrice: 2200, sellPrice: 2750, quantity: 16, warehouseId: w1.id },
    { name: "صدامات أمامية كيا", code: "KIA-BMP-008", buyPrice: 850, sellPrice: 1100, quantity: 4, warehouseId: w1.id },
  ]);
}
