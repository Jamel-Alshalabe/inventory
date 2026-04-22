import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { addLog, requireAuth, type AuthUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/settings", requireAuth(), async (_req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable);
  const obj: Record<string, string> = {};
  for (const r of rows) obj[r.key] = r.value;
  res.json(obj);
});

router.put("/settings", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const body = req.body ?? {};
  for (const [k, v] of Object.entries(body)) {
    await db
      .insert(settingsTable)
      .values({ key: k, value: String(v) })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: String(v) } });
  }
  await addLog("تحديث الإعدادات", Object.keys(body).join(", "), user.username);
  res.json({ ok: true });
});

export default router;
